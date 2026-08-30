"""Движок сравнения «факт vs политика» — ядро проекта Yakilka.

Берёт сырые факты, собранные агентом на активе (`facts`, JSON вида
{"<категория>": {"<ключ>": "<значение>"}}), сравнивает их с активными
правилами из `hardening_rules` (rule_code вида "<категория>.<ключ>",
expected_value — ожидаемое значение) и возвращает результат по каждому
правилу: pass/fail/error.

`error` — правило применимо к типу актива, но агент не прислал факт для
этого ключа (нечего сравнивать). Правила с product_type, не совпадающим
с типом актива, пропускаются (не попадают в результат вовсе).
"""
from dataclasses import dataclass

from app.models.hardening import HardeningRule


@dataclass
class CheckResult:
    rule_id: str
    rule_code: str | None
    actual_value: str | None
    expected_value: str | None
    status: str  # pass | fail | error


def _normalize(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip().lower()


def _lookup_fact(facts: dict, rule_code: str) -> tuple[object | None, bool]:
    """Возвращает (значение, найдено_ли). rule_code = 'category.key'."""
    if not rule_code or "." not in rule_code:
        return None, False
    category, key = rule_code.split(".", 1)
    bucket = facts.get(category)
    if not isinstance(bucket, dict) or key not in bucket:
        return None, False
    return bucket[key], True


def evaluate_asset(facts: dict, rules: list[HardeningRule], asset_type: str | None) -> list[CheckResult]:
    """Прогоняет факты одного актива против набора правил.

    Правило применяется, если rule.product_type пуст (общее для всех типов
    активов) либо совпадает с asset_type актива (регистронезависимо).
    """
    results: list[CheckResult] = []
    normalized_asset_type = (asset_type or "").strip().lower()

    for rule in rules:
        rule_scope = (rule.product_type or "").strip().lower()
        if rule_scope and normalized_asset_type and rule_scope != normalized_asset_type:
            continue

        actual, found = _lookup_fact(facts, rule.rule_code or "")

        if not found:
            results.append(
                CheckResult(
                    rule_id=str(rule.id),
                    rule_code=rule.rule_code,
                    actual_value=None,
                    expected_value=rule.expected_value,
                    status="error",
                )
            )
            continue

        status = "pass" if _normalize(actual) == _normalize(rule.expected_value) else "fail"
        results.append(
            CheckResult(
                rule_id=str(rule.id),
                rule_code=rule.rule_code,
                actual_value=_normalize(actual) if not isinstance(actual, str) else str(actual),
                expected_value=rule.expected_value,
                status=status,
            )
        )

    return results


def compute_compliance_score(results: list[CheckResult]) -> tuple[float | None, int, int, int]:
    """Возвращает (compliance_score 0-100 | None, total, passed, failed).
    error/skipped считаются в total, но не в passed/failed — не участвуют
    в score как самостоятельная категория, но не искажают числитель."""
    total = len(results)
    passed = sum(1 for r in results if r.status == "pass")
    failed = sum(1 for r in results if r.status == "fail")
    scoreable = passed + failed
    score = round((passed / scoreable) * 100, 2) if scoreable else None
    return score, total, passed, failed
