from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    environment_id: Optional[UUID] = None
    hostname: str
    ip_address: Optional[str] = None
    os: Optional[str] = None
    asset_type: Optional[str] = None
    criticality: Optional[str] = None
    created_at: Optional[datetime] = None


class OrganizationAssetOut(BaseModel):
    id: UUID
    environment_id: Optional[UUID] = None
    environment_name: Optional[str] = None
    hostname: str
    ip_address: Optional[str] = None
    os: Optional[str] = None
    asset_type: Optional[str] = None
    criticality: Optional[str] = None
    created_at: Optional[datetime] = None
    software_count: int = 0
    failed_checks_count: int = 0


class SoftwareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset_id: Optional[UUID] = None
    name: str
    version: Optional[str] = None
    vendor: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None


class ScanSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    scan_number: int
    total_checks: Optional[int] = 0
    passed: Optional[int] = 0
    failed: Optional[int] = 0
    compliance_score: Optional[Decimal] = None
    snapshot_label: Optional[str] = None
    status: Optional[str] = None
    total_assets: int
    total_software: int
    created_at: Optional[datetime] = None


class LatestReportOut(BaseModel):
    compliance_score: Optional[float] = None
    generated_at: Optional[datetime] = None
    total_checks: int = 0
    failed: int = 0


class DashboardSummaryOut(BaseModel):
    assetsCount: int = 0
    softwareCount: int = 0
    checksCount: int = 0
    failedChecks: int = 0
    reportsCount: int = 0
    latestReport: Optional[LatestReportOut] = None
    environmentsCount: int = 0
    criticalAssets: int = 0
