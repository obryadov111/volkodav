from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_agent_organization_id, get_db
from app.models.asset import Asset
from app.models.environment import Environment
from app.models.hardening import (
    AgentCollection,
    HardeningCheck,
    HardeningReport,
    HardeningRule,
    IngestionBatch,
    ScanCheckResult,
)
from app.models.scan_snapshot import ScanSnapshot
from app.models.software import Software
from app.schemas.ingest import IngestChecksSummary, IngestRequest, IngestResponse
from app.services.hardening_engine import compute_compliance_score, evaluate_asset

router = APIRouter(tags=["ingest"])


def _get_or_create_environment(db: Session, organization_id: str, name: str) -> Environment:
    env = (
        db.query(Environment)
        .filter(Environment.organization_id == organization_id, Environment.name == name)
        .first()
    )
    if env:
        return env
    env = Environment(organization_id=organization_id, name=name)
    db.add(env)
    db.flush()
    return env


def _get_or_create_asset(db: Session, environment_id: str, payload) -> Asset:
    asset = (
        db.query(Asset)
        .filter(Asset.environment_id == environment_id, Asset.hostname == payload.hostname)
        .first()
    )
    if asset:
        asset.ip_address = payload.ip_address
        asset.os = payload.os
        asset.asset_type = payload.asset_type
        asset.criticality = payload.criticality
    else:
        asset = Asset(
            environment_id=environment_id,
            hostname=payload.hostname,
            ip_address=payload.ip_address,
            os=payload.os,
            asset_type=payload.asset_type,
            criticality=payload.criticality,
        )
        db.add(asset)
    db.flush()
    return asset


@router.post("/ingest", response_model=IngestResponse)
def ingest(
    payload: IngestRequest,
    organization_id: str = Depends(get_agent_organization_id),
    db: Session = Depends(get_db),
):
    """Приём данных от агента-сборщика: активы, ПО, сырые факты конфигурации.
    Прогоняет факты через движок сравнения (evaluate_asset) против hardening_rules,
    фиксирует текущее состояние (hardening_checks), историю (scan_snapshots +
    scan_check_results) и пересчитывает compliance_score организации (hardening_reports).
    """
    now = datetime.now(timezone.utc)

    batch = IngestionBatch(organization_id=organization_id, received_at=now, source="agent", status="processing")
    db.add(batch)
    db.flush()

    environment = _get_or_create_environment(db, organization_id, payload.environment)
    asset = _get_or_create_asset(db, str(environment.id), payload.asset)

    db.query(Software).filter(Software.asset_id == asset.id).delete()
    for item in payload.software:
        db.add(
            Software(
                asset_id=asset.id,
                name=item.name,
                version=item.version,
                vendor=item.vendor,
                category=item.category,
                type=item.type,
            )
        )

    db.add(AgentCollection(asset_id=asset.id, batch_id=batch.id, collected_data=payload.facts, collected_at=now))

    rules = db.query(HardeningRule).all()
    results = evaluate_asset(payload.facts, rules, asset.asset_type)
    score, total, passed, failed = compute_compliance_score(results)
    errors = total - passed - failed

    db.query(HardeningCheck).filter(HardeningCheck.asset_id == asset.id).delete()
    for r in results:
        db.add(
            HardeningCheck(
                asset_id=asset.id,
                rule_id=r.rule_id,
                actual_value=r.actual_value,
                expected_value=r.expected_value,
                status=r.status,
                checked_at=now,
            )
        )

    next_scan_number = (
        db.execute(
            text("SELECT COALESCE(MAX(scan_number), 0) + 1 FROM scan_snapshots WHERE organization_id = :org_id"),
            {"org_id": organization_id},
        ).scalar()
        or 1
    )

    snapshot = ScanSnapshot(
        organization_id=organization_id,
        scan_number=next_scan_number,
        started_at=now,
        completed_at=now,
        total_checks=total,
        passed=passed,
        failed=failed,
        compliance_score=score,
        ingestion_batch_id=batch.id,
        snapshot_label=payload.scan_label,
        status="completed",
        total_assets=1,
        total_software=len(payload.software),
        created_at=now,
    )
    db.add(snapshot)
    db.flush()

    for r in results:
        db.add(
            ScanCheckResult(
                snapshot_id=snapshot.id,
                asset_id=asset.id,
                rule_id=r.rule_id,
                actual_value=r.actual_value,
                expected_value=r.expected_value,
                status=r.status,
                checked_at=now,
            )
        )

    # Оргуровневый отчёт — агрегат по ТЕКУЩЕМУ состоянию всех активов организации
    # (hardening_checks хранит только последний прогон на актив), не только этого прогона.
    org_totals = db.execute(
        text(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE hc.status = 'pass') AS passed,
                COUNT(*) FILTER (WHERE hc.status = 'fail') AS failed
            FROM hardening_checks hc
            JOIN assets a ON a.id = hc.asset_id
            JOIN environments e ON e.id = a.environment_id
            WHERE e.organization_id = :org_id
            """
        ),
        {"org_id": organization_id},
    ).mappings().first()

    org_total = org_totals["total"] or 0
    org_passed = org_totals["passed"] or 0
    org_failed = org_totals["failed"] or 0
    org_scoreable = org_passed + org_failed
    org_score = round((org_passed / org_scoreable) * 100, 2) if org_scoreable else None

    report = HardeningReport(
        organization_id=organization_id,
        total_checks=org_total,
        passed=org_passed,
        failed=org_failed,
        compliance_score=org_score,
        generated_at=now,
    )
    db.add(report)
    db.flush()

    batch.status = "completed"
    batch.assets_count = 1
    batch.software_count = len(payload.software)
    batch.checks_count = total
    batch.report_id = report.id

    db.commit()

    return IngestResponse(
        batch_id=str(batch.id),
        asset_id=str(asset.id),
        snapshot_id=str(snapshot.id),
        checks=IngestChecksSummary(total=total, passed=passed, failed=failed, errors=errors),
        compliance_score=score,
        report_id=str(report.id),
    )
