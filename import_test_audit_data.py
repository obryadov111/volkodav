import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from supabase import create_client, Client


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Отсутствует переменная окружения: {name}")
    return value


SUPABASE_URL = require_env("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = require_env("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


TEST_DATA: Dict[str, Any] = {
    "organization": {
        "name": "ООО Ромашка",
        "industry": "Производство",
        "country": "Россия",
    },
    "environment": {
        "name": "Production",
    },
    "assets": [
        {
            "hostname": "web-prod-01",
            "ip_address": "10.10.1.10",
            "os": "Ubuntu 22.04",
            "asset_type": "server",
            "criticality": "high",
            "software": [
                {
                    "name": "Nginx",
                    "version": "1.24.0",
                    "vendor": "F5",
                    "category": "Web Server",
                    "type": "Infrastructure",
                },
                {
                    "name": "OpenSSH",
                    "version": "9.0p1",
                    "vendor": "OpenBSD",
                    "category": "Access",
                    "type": "System",
                },
            ],
            "checks": [
                {
                    "rule": {
                        "product_type": "linux",
                        "rule_code": "LINUX-SSH-001",
                        "title": "SSH root login disabled",
                        "description": "Запрет прямого входа root по SSH",
                        "expected_value": "PermitRootLogin no",
                        "source": "CIS Linux Benchmark",
                        "severity": "high",
                        "remediation": "Отключить root login в sshd_config",
                    },
                    "actual_value": "PermitRootLogin yes",
                    "expected_value": "PermitRootLogin no",
                    "status": "fail",
                },
                {
                    "rule": {
                        "product_type": "linux",
                        "rule_code": "LINUX-AUDIT-001",
                        "title": "Auditd enabled",
                        "description": "Сервис auditd должен быть включён",
                        "expected_value": "enabled",
                        "source": "Internal Linux Baseline",
                        "severity": "medium",
                        "remediation": "Включить и запустить auditd",
                    },
                    "actual_value": "disabled",
                    "expected_value": "enabled",
                    "status": "fail",
                },
            ],
        },
        {
            "hostname": "db-prod-01",
            "ip_address": "10.10.1.20",
            "os": "Ubuntu 22.04",
            "asset_type": "database",
            "criticality": "critical",
            "software": [
                {
                    "name": "PostgreSQL",
                    "version": "15.3",
                    "vendor": "PostgreSQL Global Development Group",
                    "category": "Database",
                    "type": "Infrastructure",
                },
            ],
            "checks": [
                {
                    "rule": {
                        "product_type": "postgresql",
                        "rule_code": "PG-SEC-001",
                        "title": "Password policy enforced",
                        "description": "Должна быть включена безопасная парольная политика",
                        "expected_value": "password_encryption=scram-sha-256",
                        "source": "Internal DB Standard",
                        "severity": "medium",
                        "remediation": "Включить безопасную парольную политику",
                    },
                    "actual_value": "password_encryption=scram-sha-256",
                    "expected_value": "password_encryption=scram-sha-256",
                    "status": "pass",
                },
            ],
        },
    ],
    "report": {
        "total_checks": 3,
        "passed": 1,
        "failed": 2,
        "compliance_score": 33.0,
    },
    "batch": {
        "source": "local-test-script",
    },
    "snapshot": {
        "label": "Initial local test import",
        "notes": "Тестовый импорт локальным скриптом",
    },
}


def maybe_single(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return rows[0] if rows else None


def get_or_create_organization(payload: Dict[str, Any]) -> Dict[str, Any]:
    name = payload["name"]

    existing = (
        supabase.table("client_organizations")
        .select("*")
        .eq("name", name)
        .limit(1)
        .execute()
    )

    row = maybe_single(existing.data or [])
    if row:
        print(f"[OK] Организация найдена: {row['name']} ({row['id']})")
        return row

    created = (
        supabase.table("client_organizations")
        .insert(payload)
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Организация создана: {row['name']} ({row['id']})")
    return row


def get_or_create_environment(organization_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    name = payload["name"]

    existing = (
        supabase.table("environments")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("name", name)
        .limit(1)
        .execute()
    )

    row = maybe_single(existing.data or [])
    if row:
        print(f"[OK] Environment найден: {row['name']} ({row['id']})")
        return row

    created = (
        supabase.table("environments")
        .insert({
            "organization_id": organization_id,
            "name": name,
        })
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Environment создан: {row['name']} ({row['id']})")
    return row


def get_or_create_asset(environment_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    hostname = payload["hostname"]

    existing = (
        supabase.table("assets")
        .select("*")
        .eq("environment_id", environment_id)
        .eq("hostname", hostname)
        .limit(1)
        .execute()
    )

    row = maybe_single(existing.data or [])
    asset_payload = {
        "environment_id": environment_id,
        "hostname": payload["hostname"],
        "ip_address": payload.get("ip_address"),
        "os": payload.get("os"),
        "asset_type": payload.get("asset_type"),
        "criticality": payload.get("criticality"),
    }

    if row:
        updated = (
            supabase.table("assets")
            .update(asset_payload)
            .eq("id", row["id"])
            .execute()
        )
        row = updated.data[0]
        print(f"[OK] Актив обновлён: {row['hostname']} ({row['id']})")
        return row

    created = (
        supabase.table("assets")
        .insert(asset_payload)
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Актив создан: {row['hostname']} ({row['id']})")
    return row


def replace_software(asset_id: str, software_rows: List[Dict[str, Any]]) -> None:
    existing = (
        supabase.table("software")
        .select("id")
        .eq("asset_id", asset_id)
        .execute()
    )
    existing_ids = [row["id"] for row in (existing.data or [])]

    if existing_ids:
        supabase.table("software").delete().in_("id", existing_ids).execute()

    to_insert = []
    for row in software_rows:
        to_insert.append({
            "asset_id": asset_id,
            "name": row["name"],
            "version": row.get("version"),
            "vendor": row.get("vendor"),
            "category": row.get("category"),
            "type": row.get("type"),
        })

    if to_insert:
        supabase.table("software").insert(to_insert).execute()

    print(f"[OK] ПО перезаписано для asset_id={asset_id}: {len(to_insert)} записей")


def get_or_create_rule(rule_payload: Dict[str, Any]) -> Dict[str, Any]:
    existing = (
        supabase.table("hardening_rules")
        .select("*")
        .eq("rule_code", rule_payload["rule_code"])
        .limit(1)
        .execute()
    )

    row = maybe_single(existing.data or [])
    if row:
        updated = (
            supabase.table("hardening_rules")
            .update(rule_payload)
            .eq("id", row["id"])
            .execute()
        )
        row = updated.data[0]
        print(f"[OK] Правило обновлено: {row['rule_code']} ({row['id']})")
        return row

    created = (
        supabase.table("hardening_rules")
        .insert(rule_payload)
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Правило создано: {row['rule_code']} ({row['id']})")
    return row


def replace_checks(asset_id: str, checks_rows: List[Dict[str, Any]]) -> None:
    existing = (
        supabase.table("hardening_checks")
        .select("id")
        .eq("asset_id", asset_id)
        .execute()
    )
    existing_ids = [row["id"] for row in (existing.data or [])]

    if existing_ids:
        supabase.table("hardening_checks").delete().in_("id", existing_ids).execute()

    to_insert = []

    for item in checks_rows:
        rule = get_or_create_rule(item["rule"])
        to_insert.append({
            "asset_id": asset_id,
            "rule_id": rule["id"],
            "actual_value": item.get("actual_value"),
            "expected_value": item.get("expected_value"),
            "status": item["status"],
            "checked_at": datetime.now(timezone.utc).isoformat(),
        })

    if to_insert:
        supabase.table("hardening_checks").insert(to_insert).execute()

    print(f"[OK] Checks перезаписаны для asset_id={asset_id}: {len(to_insert)} записей")


def create_report(organization_id: str, report_payload: Dict[str, Any]) -> Dict[str, Any]:
    created = (
        supabase.table("hardening_reports")
        .insert({
            "organization_id": organization_id,
            "total_checks": report_payload["total_checks"],
            "passed": report_payload["passed"],
            "failed": report_payload["failed"],
            "compliance_score": report_payload["compliance_score"],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Report создан: {row['id']}")
    return row


def create_batch(organization_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    created = (
        supabase.table("ingestion_batches")
        .insert({
            "organization_id": organization_id,
            "source": payload.get("source", "local-test-script"),
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
        .execute()
    )
    row = created.data[0]
    print(f"[OK] Ingestion batch создан: {row['id']}")
    return row


def create_snapshot(organization_id: str, batch_id: str, label: str, notes: str) -> str:
    response = supabase.rpc(
        "create_scan_snapshot",
        {
            "p_organization_id": organization_id,
            "p_ingestion_batch_id": batch_id,
            "p_snapshot_label": label,
            "p_notes": notes,
        },
    ).execute()

    snapshot_id = response.data
    print(f"[OK] Snapshot создан: {snapshot_id}")
    return snapshot_id


def main() -> int:
    try:
        organization = get_or_create_organization(TEST_DATA["organization"])
        environment = get_or_create_environment(organization["id"], TEST_DATA["environment"])

        for asset_payload in TEST_DATA["assets"]:
            asset = get_or_create_asset(environment["id"], asset_payload)
            replace_software(asset["id"], asset_payload.get("software", []))
            replace_checks(asset["id"], asset_payload.get("checks", []))

        create_report(organization["id"], TEST_DATA["report"])
        batch = create_batch(organization["id"], TEST_DATA["batch"])

        snapshot_id = create_snapshot(
            organization["id"],
            batch["id"],
            TEST_DATA["snapshot"]["label"],
            TEST_DATA["snapshot"]["notes"],
        )

        print("\n=== ГОТОВО ===")
        print(f"organization_id: {organization['id']}")
        print(f"environment_id:  {environment['id']}")
        print(f"snapshot_id:     {snapshot_id}")
        return 0

    except Exception as error:
        print(f"\n[ERROR] {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())