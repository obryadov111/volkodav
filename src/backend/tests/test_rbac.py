"""Каждый из этих тестов до правок в data.py/deps.py проходил бы иначе:
эндпоинты отдавали данные всех организаций любому авторизованному пользователю."""


def test_user_without_membership_cannot_see_any_organization_dashboard(client, make_org, make_user, auth_header):
    own_org = make_org("Own Org")
    foreign_org = make_org("Foreign Org")
    make_user("user@example.com", "secret123")
    headers = auth_header("user@example.com", "secret123")

    resp_foreign = client.get(f"/organizations/{foreign_org}/dashboard", headers=headers)
    assert resp_foreign.status_code == 403

    # пользователь не состоит ни в одной организации -> тоже 403 для own_org
    resp_own = client.get(f"/organizations/{own_org}/dashboard", headers=headers)
    assert resp_own.status_code == 403


def test_org_member_can_see_own_dashboard_not_foreign(client, make_org, make_user, add_membership, auth_header):
    own_org = make_org("Own Org 2")
    foreign_org = make_org("Foreign Org 2")
    user_id = make_user("member@example.com", "secret123")
    add_membership(user_id, own_org, role="viewer")
    headers = auth_header("member@example.com", "secret123")

    resp_own = client.get(f"/organizations/{own_org}/dashboard", headers=headers)
    assert resp_own.status_code == 200

    resp_foreign = client.get(f"/organizations/{foreign_org}/dashboard", headers=headers)
    assert resp_foreign.status_code == 403


def test_organizations_list_is_scoped_to_membership(client, make_org, make_user, add_membership, auth_header):
    own_org = make_org("Visible Org")
    make_org("Invisible Org")
    user_id = make_user("scoped@example.com", "secret123")
    add_membership(user_id, own_org, role="viewer")
    headers = auth_header("scoped@example.com", "secret123")

    resp = client.get("/organizations", headers=headers)

    assert resp.status_code == 200
    org_ids = {o["id"] for o in resp.json()}
    assert org_ids == {own_org}


def test_superadmin_sees_all_organizations(client, make_org, make_user, auth_header):
    make_org("Org A")
    make_org("Org B")
    make_user("root@example.com", "secret123", is_superadmin=True)
    headers = auth_header("root@example.com", "secret123")

    resp = client.get("/organizations", headers=headers)

    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_asset_details_denied_for_non_member(client, make_org, make_user, add_membership, auth_header, make_agent_key):
    org_id = make_org("Asset Org")
    other_org = make_org("Other Org")
    agent_key = make_agent_key(org_id)
    ingest_resp = client.post(
        "/ingest",
        json={"environment": "prod", "asset": {"hostname": "asset-host"}, "facts": {}},
        headers={"X-Agent-Api-Key": agent_key},
    )
    asset_id = ingest_resp.json()["asset_id"]

    outsider = make_user("outsider@example.com", "secret123")
    add_membership(outsider, other_org, role="viewer")
    headers = auth_header("outsider@example.com", "secret123")

    resp = client.get(f"/assets/{asset_id}", headers=headers)
    assert resp.status_code == 403


def test_asset_details_allowed_for_org_member(client, make_org, make_user, add_membership, auth_header, make_agent_key):
    org_id = make_org("Asset Org 2")
    agent_key = make_agent_key(org_id)
    ingest_resp = client.post(
        "/ingest",
        json={"environment": "prod", "asset": {"hostname": "asset-host-2"}, "facts": {}},
        headers={"X-Agent-Api-Key": agent_key},
    )
    asset_id = ingest_resp.json()["asset_id"]

    member = make_user("member2@example.com", "secret123")
    add_membership(member, org_id, role="viewer")
    headers = auth_header("member2@example.com", "secret123")

    resp = client.get(f"/assets/{asset_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["hostname"] == "asset-host-2"


def test_my_role_reflects_membership_not_hardcoded_admin(client, make_org, make_user, add_membership, auth_header):
    org_id = make_org("Role Org")
    user_id = make_user("viewer@example.com", "secret123")
    add_membership(user_id, org_id, role="viewer")
    headers = auth_header("viewer@example.com", "secret123")

    resp = client.get(f"/organizations/{org_id}/my-role", headers=headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "viewer"
    assert body["permissions"]["manage_users"] is False
