"""Реестр паков: загрузка YAML-файлов из каталога, поиск по id и версии.

Версии одного пака хранятся рядом (по файлу на версию): результат прогона привязан
к версии пака, поэтому старые версии не удаляются — иначе прошлый отчёт нельзя
воспроизвести.
"""
from pathlib import Path

import yaml
from pydantic import ValidationError

from app.services.packs.models import Pack


class PackError(Exception):
    """Пак не загрузился: некорректный YAML или нарушение формата."""


class PackRegistry:
    def __init__(self, packs: list[Pack] | None = None):
        self._packs: dict[str, dict[str, Pack]] = {}
        for pack in packs or []:
            self.add(pack)

    def add(self, pack: Pack) -> None:
        versions = self._packs.setdefault(pack.pack, {})
        if pack.version in versions:
            raise PackError(f"пак {pack.pack} версии {pack.version} загружен дважды")
        versions[pack.version] = pack

    def get(self, pack_id: str, version: str | None = None) -> Pack | None:
        versions = self._packs.get(pack_id)
        if not versions:
            return None
        if version is not None:
            return versions.get(version)
        return max(versions.values(), key=lambda p: p.version_tuple)

    def latest(self, transport: str | None = None) -> list[Pack]:
        latest_packs = [self.get(pack_id) for pack_id in sorted(self._packs)]
        return [p for p in latest_packs if p is not None and (transport is None or p.transport == transport)]


def load_pack_file(path: Path) -> Pack:
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise PackError(f"{path.name}: не удалось прочитать YAML: {exc}") from exc
    if not isinstance(raw, dict):
        raise PackError(f"{path.name}: ожидался YAML-словарь на верхнем уровне")
    try:
        return Pack.model_validate(raw)
    except ValidationError as exc:
        details = "; ".join(f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors())
        raise PackError(f"{path.name}: {details}") from exc


def load_registry(directory: Path) -> PackRegistry:
    registry = PackRegistry()
    if not directory.is_dir():
        return registry
    for path in sorted([*directory.rglob("*.yaml"), *directory.rglob("*.yml")]):
        registry.add(load_pack_file(path))
    return registry
