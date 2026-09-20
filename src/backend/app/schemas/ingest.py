
from pydantic import BaseModel, Field


class IngestSoftwareIn(BaseModel):
    name: str
    version: str | None = None
    vendor: str | None = None
    category: str | None = None
    type: str | None = None


class IngestAssetIn(BaseModel):
    hostname: str
    ip_address: str | None = None
    os: str | None = None
    asset_type: str | None = None
    criticality: str | None = None


class IngestPackRef(BaseModel):
    id: str = Field(..., max_length=100)
    version: str = Field(..., max_length=32)


class IngestProbeResult(BaseModel):
    """Результат одной пробы агента. found=False — проба не смогла выполниться (нет файла, команда не отработала)."""

    found: bool = True
    value: str | int | float | bool | None = None
    evidence: str | None = Field(default=None, max_length=500, description="Совпавшая строка, секреты замаскированы")
    error: str | None = Field(default=None, max_length=500)


class IngestRequest(BaseModel):
    environment: str = Field(..., description="Имя окружения (создаётся, если не существует)")
    asset: IngestAssetIn
    software: list[IngestSoftwareIn] = Field(default_factory=list)
    facts: dict = Field(default_factory=dict, description="Сырые факты по категориям: {'ssh': {'permit_root_login': 'no'}, ...}")
    scan_label: str | None = None
    platform_tags: list[str] = Field(
        default_factory=list, max_length=20,
        description="Теги платформы (класс → семейство → продукт); правило с product_type из тегов тоже применяется",
    )
    pack: IngestPackRef | None = Field(default=None, description="Пак, по которому агент собрал probe_results")
    probe_results: dict[str, IngestProbeResult] = Field(
        default_factory=dict, description="{id проверки пака: результат пробы}"
    )


class IngestChecksSummary(BaseModel):
    total: int
    passed: int
    failed: int
    errors: int


class IngestCoverage(BaseModel):
    total: int
    evaluated: int
    errors: int
    ratio: float | None = None


class IngestResponse(BaseModel):
    batch_id: str
    asset_id: str
    snapshot_id: str
    checks: IngestChecksSummary
    compliance_score: float | None = None
    coverage: IngestCoverage | None = None
    report_id: str
