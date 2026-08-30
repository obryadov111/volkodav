"""Эндпоинты /organizations/{id}/{environments,software,hardening,snapshots,reports}
и /assets/{id}/{software,hardening} — добавлены вслед за движком харденинга,
чтобы страницы фронтенда (Hardening, SoftwareInventory, Scans, Report, Project)
получали реальные данные вместо пустых состояний."""


def _ingest(client, agent_key, hostname="host-01", facts=None):
    payload = {
        "environment": "prod",
        "asset": {"hostname": hostname, "os": "Ubuntu 24.04", "asset_type": "server"},
        "software": [{"name": "nginx", "version": "1.27.0", "vendor": "nginx"}],
        "facts": facts or {"ssh": {"permit_root_login": "no"}},
    }
    resp = client.post("/api/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_environments_by_organization_is_scoped(client, make_org, make_agent_key, make_user, add_membership, auth_header):
    own_org = make_org("Env Org")
    other_org = make_org("Env Org Other")
    agent_key = make_agent_key(own_org)
    _ingest(client, agent_key)

    member = make_user("env-member@example.com", "secret123")
    add_membership(member, own_org, role="viewer")
    headers = auth_header("env-member@example.com", "secret123")

    resp = client.get(f"/api/organizations/{own_org}/environments", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "prod"
    assert body[0]["assets_count"] == 1

    resp_denied = client.get(f"/api/organizations/{other_org}/environments", headers=headers)
    assert resp_denied.status_code == 403


def test_software_by_organization_includes_asset(client, make_org, make_agent_key, make_user, add_membership, auth_header):
    org_id = make_org("Software Org")
    agent_key = make_agent_key(org_id)
    _ingest(client, agent_key, hostname="db-01")

    member = make_user("sw-member@example.com", "secret123")
    add_membership(member, org_id, role="viewer")
    headers = auth_header("sw-member@example.com", "secret123")

    resp = client.get(f"/api/organizations/{org_id}/software", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "nginx"
    assert body[0]["asset"]["hostname"] == "db-01"


def test_hardening_by_organization_includes_rule_and_asset(client, make_org, make_agent_key, make_user, add_membership, auth_header):
    org_id = make_org("Hardening Org")
    agent_key = make_agent_key(org_id)
    _ingest(client, agent_key, hostname="web-01", facts={"ssh": {"permit_root_login": "no"}})

    member = make_user("hard-member@example.com", "secret123")
    add_membership(member, org_id, role="viewer")
    headers = auth_header("hard-member@example.com", "secret123")

    resp = client.get(f"/api/organizations/{org_id}/hardening", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 14  # весь стартовый набор правил
    passed = [item for item in body if item["status"] == "pass"]
    assert len(passed) == 1
    assert passed[0]["rule"]["rule_code"] == "ssh.permit_root_login"
    assert passed[0]["asset"]["hostname"] == "web-01"


def test_hardening_by_asset_denied_for_non_member(client, make_org, make_agent_key, make_user, add_membership, auth_header):
    org_id = make_org("Asset Hardening Org")
    other_org = make_org("Asset Hardening Org Other")
    agent_key = make_agent_key(org_id)
    result = _ingest(client, agent_key, hostname="asset-hardening-host")

    outsider = make_user("outsider-hard@example.com", "secret123")
    add_membership(outsider, other_org, role="viewer")
    headers = auth_header("outsider-hard@example.com", "secret123")

    resp = client.get(f"/api/assets/{result['asset_id']}/hardening", headers=headers)
    assert resp.status_code == 403


def test_snapshots_and_reports_by_organization(client, make_org, make_agent_key, make_user, add_membership, auth_header):
    org_id = make_org("Snapshot Org")
    agent_key = make_agent_key(org_id)
    _ingest(client, agent_key, hostname="snap-01")

    member = make_user("snap-member@example.com", "secret123")
    add_membership(member, org_id, role="viewer")
    headers = auth_header("snap-member@example.com", "secret123")

    snapshots = client.get(f"/api/organizations/{org_id}/snapshots", headers=headers)
    assert snapshots.status_code == 200
    assert len(snapshots.json()) == 1
    assert snapshots.json()[0]["scan_number"] == 1

    reports = client.get(f"/api/organizations/{org_id}/reports", headers=headers)
    assert reports.status_code == 200
    assert len(reports.json()) == 1
    assert reports.json()[0]["total_checks"] == 14
