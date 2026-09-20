from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_agent_organization_id, get_pack_registry
from app.core.config import settings
from app.services.packs.manifest import build_manifest, sign_manifest
from app.services.packs.registry import PackRegistry

router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/manifests")
def list_manifests(
    transport: str | None = Query(default=None, pattern="^(local|ssh)$"),
    _organization_id: str = Depends(get_agent_organization_id),
    registry: PackRegistry = Depends(get_pack_registry),
):
    """Подписанные манифесты актуальных версий паков для агента.

    Агент сам определяет по detect-условиям, какие паки подходят его хосту, проверяет подпись
    и выполняет только описанные в манифесте пробы. Подпись — HMAC по PACK_SIGNING_KEY.
    """
    if not settings.PACK_SIGNING_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ключ подписи паков не настроен (PACK_SIGNING_KEY)",
        )
    manifests = []
    for pack in registry.latest(transport):
        manifest = build_manifest(pack)
        manifests.append({"manifest": manifest, "signature": sign_manifest(manifest, settings.PACK_SIGNING_KEY)})
    return {"manifests": manifests}
