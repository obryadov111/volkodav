"""Сквозная проверка: подписанный манифест сервера -> реальный агент (collector.py + probes.py)
-> POST /api/ingest -> оценка на сервере. Ловит расхождения между серверной и агентской
частью (каноническая подпись, формат проб), которые unit-тесты каждой стороны не видят."""
import copy
import json
import sys
from pathlib import Path

import pytest
from sqlalchemy import text

from app.api.deps import get_pack_registry
from app.core.config import settings
from app.main import app
from app.services.packs.models import Pack
from app.services.packs.registry import PackRegistry
from tests.test_packs import BASE_PACK, make_pack

AGENT_DIR = Path(__file__).resolve().parents[3] / "agent"
if not (AGENT_DIR / "probes.py").exists():
    pytest.skip("каталог agent/ недоступен (тесты запущены вне репозитория)", allow_module_level=True)
sys.path.insert(0, str(AGENT_DIR))

import collector  # noqa: E402
import probes  # noqa: E402

CISCO_RUNNING = "hostname sw-core-01\nip http server\nline vty 0 4\n transport input telnet\n"


@pytest.fixture
def agent_key(make_org, make_agent_key):
    return make_agent_key(make_org("Interop Org"))


@pytest.fixture
def host_files(tmp_path):
    (tmp_path / "os-release").write_text('ID=ubuntu\nPRETTY_NAME="Ubuntu Test"\n', encoding="utf-8")
    (tmp_path / "sshd_config").write_text("PermitRootLogin yes\nMaxAuthTries 3\n", encoding="utf-8")
    return tmp_path


@pytest.fixture
def local_pack(host_files):
    data = make_pack()
    data["detect"][0]["probe"]["path"] = str(host_files / "os-release")
    for check in data["checks"]:
        check["probe"]["path"] = str(host_files / "sshd_config")
    return data


def serve(registry):
    app.dependency_overrides[get_pack_registry] = lambda: registry


@pytest.fixture(autouse=True)
def _cleanup_override():
    yield
    app.dependency_overrides.pop(get_pack_registry, None)


def fetch_manifests_file(client, agent_key, tmp_path, transport):
    resp = client.get(f"/api/agent/manifests?transport={transport}", headers={"X-Agent-Api-Key": agent_key})
    assert resp.status_code == 200, resp.text
    path = tmp_path / f"manifests-{transport}.json"
    path.write_text(json.dumps(resp.json()), encoding="utf-8")
    return path


def agent_args(manifests_file, *extra, key=None):
    return collector.parse_args([
        "--api-url", "http://unused", "--environment", "prod", "--use-packs", "--dry-run",
        "--manifests-file", str(manifests_file), "--pack-key", key or settings.PACK_SIGNING_KEY, *extra,
    ])


@pytest.fixture(autouse=True)
def _no_real_software_scan(monkeypatch):
    monkeypatch.setattr(collector, "collect_software", lambda: [])


def test_local_agent_end_to_end(client, db, agent_key, local_pack, tmp_path):
    serve(PackRegistry([Pack.model_validate(local_pack)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")

    payload = collector.build_pack_payload(agent_args(manifests), probes)

    assert payload["pack"] == {"id": "ubuntu-test", "version": "1.0.0"}
    assert payload["platform_tags"] == ["linux-server", "debian-family", "ubuntu"]
    assert "facts" not in payload
    assert payload["probe_results"]["ssh.permit_root_login"]["value"] == "yes"

    resp = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["checks"] == {"total": 2, "passed": 1, "failed": 1, "errors": 0}
    row = db.execute(
        text("SELECT status, evidence, pack_version FROM scan_check_results WHERE check_id = 'ssh.permit_root_login'")
    ).one()
    assert tuple(row) == ("fail", "PermitRootLogin yes", "1.0.0")


def test_tampered_manifest_is_rejected_by_the_agent(client, agent_key, local_pack, tmp_path):
    serve(PackRegistry([Pack.model_validate(local_pack)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")
    data = json.loads(manifests.read_text(encoding="utf-8"))
    data["manifests"][0]["manifest"]["checks"][0]["probe"]["path"] = "/etc/shadow"
    manifests.write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(SystemExit, match="Ошибка безопасности"):
        collector.build_pack_payload(agent_args(manifests), probes)


def test_wrong_pack_key_is_rejected(client, agent_key, local_pack, tmp_path):
    serve(PackRegistry([Pack.model_validate(local_pack)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")

    with pytest.raises(SystemExit, match="Ошибка безопасности"):
        collector.build_pack_payload(agent_args(manifests, key="not-the-server-key"), probes)


def test_unrecognized_platform_sends_nothing(client, agent_key, local_pack, host_files, tmp_path):
    (host_files / "os-release").write_text("ID=astra\n", encoding="utf-8")
    serve(PackRegistry([Pack.model_validate(local_pack)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")

    with pytest.raises(SystemExit, match="не распознана"):
        collector.build_pack_payload(agent_args(manifests), probes)


def test_ambiguous_platform_requires_explicit_pack(client, agent_key, local_pack, tmp_path):
    second = copy.deepcopy(local_pack)
    second["pack"] = "ubuntu-extra"
    serve(PackRegistry([Pack.model_validate(local_pack), Pack.model_validate(second)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")

    with pytest.raises(SystemExit, match="несколько паков"):
        collector.build_pack_payload(agent_args(manifests), probes)
    payload = collector.build_pack_payload(agent_args(manifests, "--pack", "ubuntu-extra"), probes)
    assert payload["pack"]["id"] == "ubuntu-extra"


def test_missing_pack_key_is_reported(client, agent_key, local_pack, tmp_path):
    serve(PackRegistry([Pack.model_validate(local_pack)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "local")
    args = agent_args(manifests)
    args.pack_key = None
    with pytest.raises(SystemExit, match="pack-key"):
        collector.build_pack_payload(args, probes)


def test_network_device_over_ssh_end_to_end(client, db, agent_key, tmp_path, monkeypatch):
    cisco = make_pack(
        pack="cisco-test", transport="ssh", tags=["network-device", "cisco-ios"], asset_type="network-device",
        detect=[{"probe": {"type": "cli_config", "cmd": "show version", "match": r"(Cisco IOS)"}, "equals": "Cisco IOS"}],
        checks=[
            {"id": "cisco_ios.http_server_disabled", "title": "HTTP выключен",
             "probe": {"type": "cli_config", "cmd": "show running-config", "match": "^ip http server"},
             "assert": {"op": "absent"}, "severity": "medium"},
            {"id": "cisco_ios.vty_ssh_only", "title": "VTY только SSH",
             "probe": {"type": "cli_config", "cmd": "show running-config", "section": r"^line vty 0 4",
                       "match": r"transport input (\w+)"},
             "assert": {"op": "eq", "value": "ssh"}},
        ],
    )
    serve(PackRegistry([Pack.model_validate(cisco), Pack.model_validate(BASE_PACK)]))
    manifests = fetch_manifests_file(client, agent_key, tmp_path, "ssh")
    commands = []

    def fake_ssh(argv, **kwargs):
        command = argv[-1]
        commands.append(command)
        out = "Cisco IOS Software, Version 15.2" if command == "show version" else CISCO_RUNNING
        return type("P", (), {"stdout": out, "stderr": "", "returncode": 0})()

    monkeypatch.setattr(probes.subprocess, "run", fake_ssh)
    args = agent_args(manifests, "--ssh-host", "10.0.0.1", "--ssh-user", "audit")

    payload = collector.build_pack_payload(args, probes)

    assert payload["asset"] == {"hostname": "10.0.0.1", "ip_address": None, "os": None,
                                "asset_type": "network-device", "criticality": "medium"}
    assert payload["software"] == [] and payload["pack"]["id"] == "cisco-test"
    assert set(commands) == {"show version", "show running-config"}  # только команды на чтение

    body = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key}).json()
    assert body["checks"] == {"total": 2, "passed": 0, "failed": 2, "errors": 0}
    evidence = db.execute(text("SELECT evidence FROM scan_check_results WHERE check_id = 'cisco_ios.vty_ssh_only'")).scalar()
    assert evidence == "transport input telnet"
