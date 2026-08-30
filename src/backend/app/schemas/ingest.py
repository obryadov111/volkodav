from typing import Optional

from pydantic import BaseModel, Field


class IngestSoftwareIn(BaseModel):
    name: str
    version: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None


class IngestAssetIn(BaseModel):
    hostname: str
    ip_address: Optional[str] = None
    os: Optional[str] = None
    asset_type: Optional[str] = None
    criticality: Optional[str] = None


class IngestRequest(BaseModel):
    environment: str = Field(..., description="Имя окружения (создаётся, если не существует)")
    asset: IngestAssetIn
    software: list[IngestSoftwareIn] = Field(default_factory=list)
    facts: dict = Field(default_factory=dict, description="Сырые факты по категориям: {'ssh': {'permit_root_login': 'no'}, ...}")
    scan_label: Optional[str] = None


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
    compliance_score: Optional[float] = None
    report_id: str
