"""Оценка проверок пака: результаты проб агента vs утверждения пака."""
from app.services.hardening_engine import CheckResult
from app.services.packs.assertions import check_assertion, describe_assertion
from app.services.packs.models import Pack


def evaluate_pack(pack: Pack, probe_results: dict) -> list[CheckResult]:
    """Прогоняет результаты проб по всем проверкам пака.

    probe_results — {check_id: {found, value, evidence, error}} от агента. Нет результата
    по проверке или проба не смогла выполниться (found=False) — статус error,
    а не fail: нечего сравнивать. Лишние ключи в probe_results игнорируются.
    """
    results: list[CheckResult] = []
    for check in pack.checks:
        raw = probe_results.get(check.id)
        expected = describe_assertion(check.assertion.op, check.assertion.value)

        if raw is None or not raw.found:
            status, actual, evidence = "error", None, None
        else:
            status = check_assertion(raw.value, check.assertion.op, check.assertion.value)
            actual = None if raw.value is None else str(raw.value)
            evidence = raw.evidence

        results.append(
            CheckResult(
                rule_id=None,
                rule_code=check.id,
                actual_value=actual,
                expected_value=expected,
                status=status,
                check_id=check.id,
                pack_id=pack.pack,
                pack_version=pack.version,
                evidence=evidence,
            )
        )
    return results
