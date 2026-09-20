import pytest
from sqlalchemy import text

from app.api.deps import get_pack_registry
from app.core.config import settings
from app.main import app
from app.services.packs.manifest import verify_manifest
from app.services.packs.models import Pack
from app.services.packs.registry import PackRegistry
from tests.test_packs import BASE_PACK, make_pack

SSH_PACK = make_pack(
    pack="cisco-test",
    transport="ssh",
    tags=["network-device", "cisco-ios"],
    asset_type="network-device",
    detect=[{"probe": {"type": "cli_config", "cmd": "show version", "match": "Cisco"}, "equals": "Cisco"}],
    checks=[{
        "id": "cisco_ios.http_server_disabled", "title": "HTTP-сервер выключен",
        "probe": {"type": "cli_config", "cmd": "show running-config", "match": "^ip http server"},
        "assert": {"op": "absent"},
    }],
)


@pytest.fixture
def pack_registry():
    registry = PackRegistry([Pack.model_validate(BASE_PACK), Pack.model_validate(SSH_PACK)])
    app.dependency_overrides[get_pack_registry] = lambda: registry
    yield registry
    app.dependency_overrides.pop(get_pack_registry, None)


@pytest.fixture
def agent_key(make_org, make_agent_key):
    return make_agent_key(make_org("Pack Org"))


def pack_payload(**overrides):
    payload = {
        "environment": "prod",
        "asset": {"hostname": "web-01", "asset_type": "linux-server", "criticality": "high"},
        "platform_tags": ["linux-server", "debian-family", "ubuntu"],
        "pack": {"id": "ubuntu-test", "version": "1.0.0"},
        "probe_results": {
            "ssh.permit_root_login": {"found": True, "value": "yes", "evidence": "PermitRootLogin yes"},
            "ssh.max_auth_tries": {"found": True, "value": "3", "evidence": "MaxAuthTries 3"},
        },
    }
    payload.update(overrides)
    return payload


# ---------- выдача манифестов агенту ----------

def test_manifests_require_agent_key(client, pack_registry):
    assert client.get("/api/agent/manifests").status_code == 401


def test_manifests_are_signed_and_filtered_by_transport(client, pack_registry, agent_key):
    resp = client.get("/api/agent/manifests?transport=local", headers={"X-Agent-Api-Key": agent_key})

    assert resp.status_code == 200, resp.text
    items = resp.json()["manifests"]
    assert [i["manifest"]["pack"] for i in items] == ["ubuntu-test"]
    assert verify_manifest(items[0]["manifest"], items[0]["signature"], settings.PACK_SIGNING_KEY)


def test_manifests_reject_unknown_transport(client, pack_registry, agent_key):
    resp = client.get("/api/agent/manifests?transport=telnet", headers={"X-Agent-Api-Key": agent_key})
    assert resp.status_code == 422


def test_manifests_unavailable_without_signing_key(client, pack_registry, agent_key, monkeypatch):
    monkeypatch.setattr(settings, "PACK_SIGNING_KEY", None)
    resp = client.get("/api/agent/manifests", headers={"X-Agent-Api-Key": agent_key})
    assert resp.status_code == 503


# ---------- ingest по паку ----------

def test_ingest_with_pack_evaluates_on_server_and_records_versions(client, db, pack_registry, agent_key):
    resp = client.post("/api/ingest", json=pack_payload(), headers={"X-Agent-Api-Key": agent_key})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Только проверки пака: 14 старых правил против пустых facts не запускаются.
    assert body["checks"] == {"total": 2, "passed": 1, "failed": 1, "errors": 0}
    assert body["compliance_score"] == 50.0
    assert body["coverage"] == {"total": 2, "evaluated": 2, "errors": 0, "ratio": 100.0}

    rows = db.execute(
        text("SELECT check_id, pack_id, pack_version, status, evidence, rule_id FROM scan_check_results ORDER BY check_id")
    ).mappings().all()
    assert [(r["check_id"], r["pack_id"], r["pack_version"], r["status"]) for r in rows] == [
        ("ssh.max_auth_tries", "ubuntu-test", "1.0.0", "pass"),
        ("ssh.permit_root_login", "ubuntu-test", "1.0.0", "fail"),
    ]
    assert rows[1]["evidence"] == "PermitRootLogin yes" and rows[1]["rule_id"] is None

    current = db.execute(text("SELECT check_id, pack_version, status FROM hardening_checks ORDER BY check_id")).all()
    assert current == [("ssh.max_auth_tries", "1.0.0", "pass"), ("ssh.permit_root_login", "1.0.0", "fail")]

    asset = db.execute(text("SELECT platform_tags FROM assets WHERE hostname = 'web-01'")).scalar()
    assert asset == ["linux-server", "debian-family", "ubuntu"]

    stored = db.execute(text("SELECT collected_data FROM agent_collections")).scalar()
    assert stored["pack"] == {"id": "ubuntu-test", "version": "1.0.0"}
    assert stored["probe_results"]["ssh.permit_root_login"]["value"] == "yes"


def test_pack_check_without_probe_result_is_error_and_lowers_coverage(client, pack_registry, agent_key):
    payload = pack_payload(probe_results={"ssh.max_auth_tries": {"found": True, "value": "3"}})

    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()

    assert body["checks"] == {"total": 2, "passed": 1, "failed": 0, "errors": 1}
    assert body["compliance_score"] == 100.0  # score не видит error — поэтому нужен coverage
    assert body["coverage"]["ratio"] == 50.0


def test_probe_that_could_not_run_is_recorded_as_error(client, pack_registry, agent_key):
    payload = pack_payload(probe_results={
        "ssh.permit_root_login": {"found": False, "error": "не удалось прочитать /etc/ssh/sshd_config"},
        "ssh.max_auth_tries": {"found": True, "value": "3"},
    })
    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()
    assert body["checks"]["errors"] == 1


def test_ingest_rejects_unknown_pack_without_creating_anything(client, db, pack_registry, agent_key):
    for pack_ref in ({"id": "nope", "version": "1.0.0"}, {"id": "ubuntu-test", "version": "9.9.9"}):
        resp = client.post("/api/ingest", json=pack_payload(pack=pack_ref), headers={"X-Agent-Api-Key": agent_key})
        assert resp.status_code == 422
        assert "Неизвестный пак" in resp.json()["detail"]
    assert db.execute(text("SELECT COUNT(*) FROM assets")).scalar() == 0
    assert db.execute(text("SELECT COUNT(*) FROM ingestion_batches")).scalar() == 0


def test_network_pack_ingest(client, pack_registry, agent_key):
    payload = {
        "environment": "net",
        "asset": {"hostname": "sw-core-01", "asset_type": "network-device"},
        "platform_tags": ["network-device", "cisco-ios"],
        "pack": {"id": "cisco-test", "version": "1.0.0"},
        "probe_results": {"cisco_ios.http_server_disabled": {"found": True, "value": None}},
    }
    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()
    assert body["checks"] == {"total": 1, "passed": 1, "failed": 0, "errors": 0}


def test_pack_results_appear_in_current_state_api_without_a_rule_row(client, db, pack_registry, agent_key, make_org):
    # data.py связывает hardening_checks с правилами через LEFT JOIN — результаты пака без rule_id не ломают выборки.
    client.post("/api/ingest", json=pack_payload(), headers={"X-Agent-Api-Key": agent_key})
    rows = db.execute(
        text("SELECT hc.status, r.id FROM hardening_checks hc LEFT JOIN hardening_rules r ON r.id = hc.rule_id")
    ).all()
    assert len(rows) == 2 and all(row[1] is None for row in rows)


def test_inventory_pack_gives_no_score_instead_of_a_misleading_100(client, db, agent_key):
    inventory = Pack.model_validate(make_pack(pack="astra-test", maturity="inventory", checks=[], tags=["astra-se"]))
    registry = PackRegistry([inventory])
    app.dependency_overrides[get_pack_registry] = lambda: registry
    try:
        payload = pack_payload(pack={"id": "astra-test", "version": "1.0.0"}, probe_results={})
        body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()
    finally:
        app.dependency_overrides.pop(get_pack_registry, None)

    assert body["checks"]["total"] == 0
    assert body["compliance_score"] is None
    assert body["coverage"] == {"total": 0, "evaluated": 0, "errors": 0, "ratio": None}


# ---------- прежний путь не затронут ----------

def test_legacy_ingest_still_uses_hardening_rules_and_reports_coverage(client, pack_registry, agent_key):
    payload = {"environment": "prod", "asset": {"hostname": "old-01", "asset_type": "server"},
               "facts": {"ssh": {"permit_root_login": "no"}}}

    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()

    assert body["checks"]["total"] == 14
    assert body["coverage"] == {"total": 14, "evaluated": 1, "errors": 13, "ratio": 7.14}


def test_ingest_with_facts_and_pack_runs_both_paths(client, pack_registry, agent_key):
    payload = pack_payload(facts={"ssh": {"permit_root_login": "no"}})
    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()
    assert body["checks"]["total"] == 14 + 2


def test_platform_tags_are_kept_when_a_later_run_omits_them(client, db, pack_registry, agent_key):
    client.post("/api/ingest", json=pack_payload(), headers={"X-Agent-Api-Key": agent_key})
    legacy = {"environment": "prod", "asset": {"hostname": "web-01", "asset_type": "linux-server"}, "facts": {}}
    client.post("/api/ingest", json=legacy, headers={"X-Agent-Api-Key": agent_key})
    tags = db.execute(text("SELECT platform_tags FROM assets WHERE hostname = 'web-01'")).scalar()
    assert tags == ["linux-server", "debian-family", "ubuntu"]
