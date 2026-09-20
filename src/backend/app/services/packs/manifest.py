"""Манифест пака для агента и его подпись.

В манифест попадает только то, что нужно агенту: как распознать платформу и какие
пробы выполнить. Утверждения, критичность и рекомендации остаются на сервере —
их можно править без пересбора данных и без обновления агента.

Подпись — HMAC-SHA256 по каноническому JSON (стандартная библиотека, чтобы агент
оставался «одним файлом без зависимостей»). Ограничение: ключ симметричный, им же
проверяет агент — компрометация хоста с агентом раскрывает ключ подписи. Поэтому
ключ подписи отделён от ключа агента и должен быть свой на организацию; интерфейс
sign/verify рассчитан на замену на асимметричную подпись (Ed25519) без изменения
формата манифеста.
"""
import hashlib
import hmac
import json

from app.services.packs.models import Pack

MANIFEST_SCHEMA_VERSION = 1


def build_manifest(pack: Pack) -> dict:
    return {
        "schema": MANIFEST_SCHEMA_VERSION,
        "pack": pack.pack,
        "version": pack.version,
        "maturity": pack.maturity,
        "tags": list(pack.tags),
        "transport": pack.transport,
        "asset_type": pack.asset_type,
        "detect": [rule.model_dump(mode="json", exclude_none=True) for rule in pack.detect],
        "checks": [
            {"id": check.id, "probe": check.probe.model_dump(mode="json", exclude_none=True)}
            for check in pack.checks
        ],
    }


def canonical_json(manifest: dict) -> bytes:
    """Одинаковый набор байт на сервере и в агенте: сортировка ключей, без пробелов, UTF-8."""
    return json.dumps(manifest, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sign_manifest(manifest: dict, key: str) -> str:
    return hmac.new(key.encode("utf-8"), canonical_json(manifest), hashlib.sha256).hexdigest()


def verify_manifest(manifest: dict, signature: str, key: str) -> bool:
    return hmac.compare_digest(sign_manifest(manifest, key), signature)
