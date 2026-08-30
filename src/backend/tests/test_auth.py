def test_login_success(client, make_org, make_user, auth_header):
    make_user("alice@example.com", "secret123")

    resp = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "secret123"})

    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password_rejected(client, make_user):
    make_user("bob@example.com", "correct-password")

    resp = client.post("/api/auth/login", json={"email": "bob@example.com", "password": "wrong"})

    assert resp.status_code == 401


def test_login_unknown_email_rejected(client):
    resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})

    assert resp.status_code == 401


def test_protected_endpoint_requires_token(client):
    resp = client.get("/api/organizations")

    assert resp.status_code in (401, 403)  # HTTPBearer возвращает 403 без заголовка, 401 с неверным токеном


def test_protected_endpoint_rejects_garbage_token(client):
    resp = client.get("/api/organizations", headers={"Authorization": "Bearer not-a-real-token"})

    assert resp.status_code == 401


def test_me_endpoint_returns_current_user(client, make_user, auth_header):
    make_user("carol@example.com", "secret123")
    headers = auth_header("carol@example.com", "secret123")

    resp = client.get("/api/auth/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == "carol@example.com"
