"""add missing FK indexes

Postgres does not auto-index foreign keys (unlike primary keys). Ingest and
report queries filter/join on these columns on every request, so without
indexes they degrade to full table scans as data grows.

Revision ID: 5bbca4cdfbaa
Revises: df4fc6d56bf8
Create Date: 2026-08-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '5bbca4cdfbaa'
down_revision: Union[str, Sequence[str], None] = 'df4fc6d56bf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_hardening_checks_asset_id",
        "hardening_checks",
        ["asset_id"],
        schema="public",
    )
    op.create_index(
        "ix_scan_check_results_snapshot_id_asset_id",
        "scan_check_results",
        ["snapshot_id", "asset_id"],
        schema="public",
    )
    op.create_index(
        "ix_assets_environment_id",
        "assets",
        ["environment_id"],
        schema="public",
    )
    op.create_index(
        "ix_environments_organization_id",
        "environments",
        ["organization_id"],
        schema="public",
    )
    op.create_index(
        "ix_agent_collections_asset_id",
        "agent_collections",
        ["asset_id"],
        schema="public",
    )
    op.create_index(
        "ix_hardening_reports_organization_id",
        "hardening_reports",
        ["organization_id"],
        schema="public",
    )


def downgrade() -> None:
    op.drop_index("ix_hardening_reports_organization_id", table_name="hardening_reports", schema="public")
    op.drop_index("ix_agent_collections_asset_id", table_name="agent_collections", schema="public")
    op.drop_index("ix_environments_organization_id", table_name="environments", schema="public")
    op.drop_index("ix_assets_environment_id", table_name="assets", schema="public")
    op.drop_index("ix_scan_check_results_snapshot_id_asset_id", table_name="scan_check_results", schema="public")
    op.drop_index("ix_hardening_checks_asset_id", table_name="hardening_checks", schema="public")
