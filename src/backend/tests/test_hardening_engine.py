from types import SimpleNamespace

from app.services.hardening_engine import compute_compliance_score, evaluate_asset


def rule(rule_code, expected_value, product_type=None):
    return SimpleNamespace(id="rule-id", rule_code=rule_code, expected_value=expected_value, product_type=product_type)


def test_evaluate_asset_pass_and_fail():
    rules = [
        rule("ssh.permit_root_login", "no"),
        rule("ssh.password_authentication", "no"),
    ]
    facts = {"ssh": {"permit_root_login": "no", "password_authentication": "yes"}}

    results = evaluate_asset(facts, rules, asset_type="server")

    by_code = {r.rule_code: r.status for r in results}
    assert by_code["ssh.permit_root_login"] == "pass"
    assert by_code["ssh.password_authentication"] == "fail"


def test_evaluate_asset_missing_fact_is_error():
    rules = [rule("firewall.ufw_enabled", "true")]
    results = evaluate_asset({}, rules, asset_type="server")

    assert results[0].status == "error"
    assert results[0].actual_value is None


def test_evaluate_asset_comparison_is_case_and_whitespace_insensitive():
    rules = [rule("ssh.permit_root_login", "No")]
    facts = {"ssh": {"permit_root_login": "  NO  "}}

    results = evaluate_asset(facts, rules, asset_type="server")

    assert results[0].status == "pass"


def test_evaluate_asset_scopes_by_product_type():
    rules = [
        rule("docker.no_privileged_containers", "true", product_type="container_host"),
    ]
    facts = {"docker": {"no_privileged_containers": "false"}}

    results = evaluate_asset(facts, rules, asset_type="server")

    assert results == []


def test_compute_compliance_score():
    from app.services.hardening_engine import CheckResult

    results = [
        CheckResult(rule_id="1", rule_code="a", actual_value="no", expected_value="no", status="pass"),
        CheckResult(rule_id="2", rule_code="b", actual_value="yes", expected_value="no", status="fail"),
        CheckResult(rule_id="3", rule_code="c", actual_value=None, expected_value="no", status="error"),
    ]

    score, total, passed, failed = compute_compliance_score(results)

    assert total == 3
    assert passed == 1
    assert failed == 1
    assert score == 50.0  # 1 pass / (1 pass + 1 fail), error не искажает знаменатель


def test_compute_compliance_score_no_scoreable_checks_is_none():
    from app.services.hardening_engine import CheckResult

    results = [CheckResult(rule_id="1", rule_code="a", actual_value=None, expected_value="no", status="error")]
    score, total, passed, failed = compute_compliance_score(results)

    assert score is None
    assert total == 1
