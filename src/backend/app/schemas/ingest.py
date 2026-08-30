
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


class IngestRequest(BaseModel):
    environment: str = Field(..., description="Имя окружения (создаётся, если не существует)")
    asset: IngestAssetIn
    software: list[IngestSoftwareIn] = Field(default_factory=list)
    facts: dict = Field(default_factory=dict, description="Сырые факты по категориям: {'ssh': {'permit_root_login': 'no'}, ...}")
    scan_label: str | None = None


class IngestChecksSummary(BaseModel):
    total: int
    passed: int
    failed: int
    errors: int


class IngestResponse(BaseModel):
    batch_id: str
    asset_id: str
    snapshot_id: str
    checks: IngestChecksSummary
    compliance_score: float | None = None
    report_id: str
