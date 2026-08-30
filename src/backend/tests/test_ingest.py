def test_ingest_requires_agent_key(client):
    resp = client.post("/ingest", json={"environment": "prod", "asset": {"hostname": "h1"}})
    assert resp.status_code == 401


def test_ingest_rejects_unknown_key(client):
    resp = client.post(
        "/ingest",
        json={"environment": "prod", "asset": {"hostname": "h1"}},
        headers={"X-Agent-Api-Key": "yak_not-a-real-key"},
    )
    assert resp.status_code == 401


def test_ingest_creates_asset_runs_checks_and_computes_score(client, make_org, make_agent_key):
    org_id = make_org("Ingest Org")
    agent_key = make_agent_key(org_id)

    payload = {
        "environment": "prod",
        "asset": {"hostname": "web-01", "ip_address": "10.0.0.5", "os": "Ubuntu 24.04", "asset_type": "server", "criticality": "high"},
        "software": [{"name": "openssh-server", "version": "9.6"}],
        "facts": {
            "ssh": {
                "permit_root_login": "no",
                "password_authentication": "yes",  # намеренно нарушает правило -> fail
            }
        },
        "scan_label": "первый прогон агента",
    }

    resp = client.post("/ingest", json=payload, headers={"X-Agent-Api-Key": agent_key})

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["checks"]["total"] == 14  # всего правил в стартовом наборе
    assert body["checks"]["passed"] == 1  # permit_root_login: no -> pass
    assert body["checks"]["failed"] == 1  # password_authentication: yes -> fail
    assert body["checks"]["errors"] == 12  # остальные правила без фактов -> error
    # 1 pass / (1 pass + 1 fail) = 50%
    assert body["compliance_score"] == 50.0


def test_ingest_is_idempotent_per_hostname_within_environment(client, make_org, make_agent_key):
    org_a = make_org("Org A")
    key_for_a = make_agent_key(org_a)

    payload = {"environment": "prod", "asset": {"hostname": "sneaky-host"}, "facts": {}}
    resp = client.post("/ingest", json=payload, headers={"X-Agent-Api-Key": key_for_a})
    assert resp.status_code == 200

    # повторный ingest тем же ключом/hostname обновляет тот же актив, а не создаёт дубликат
    resp2 = client.post("/ingest", json=payload, headers={"X-Agent-Api-Key": key_for_a})
    assert resp2.status_code == 200
    assert resp2.json()["asset_id"] == resp.json()["asset_id"]
