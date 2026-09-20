"""add pack result columns

Результат проверки контент-пака привязывается к версии пака и id проверки:
без этого после обновления правил оценки прошлых периодов нельзя воспроизвести
и сравнивать. evidence — короткое обезличенное свидетельство для аудиторского
отчёта (совпавшая строка конфигурации с замаскированными секретами).
assets.platform_tags — теги платформы актива (класс → семейство → продукт).

Все колонки nullable: старый путь (facts → hardening_rules) их не заполняет.

Revision ID: a3f1c9d27b40
Revises: 5bbca4cdfbaa
Create Date: 2026-09-20 21:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a3f1c9d27b40'
down_revision: Union[str, Sequence[str], None] = '5bbca4cdfbaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("scan_check_results", "hardening_checks"):
        op.add_column(table, sa.Column("check_id", sa.Text(), nullable=True), schema="public")
        op.add_column(table, sa.Column("pack_id", sa.Text(), nullable=True), schema="public")
        op.add_column(table, sa.Column("pack_version", sa.Text(), nullable=True), schema="public")
    op.add_column("scan_check_results", sa.Column("evidence", sa.Text(), nullable=True), schema="public")
    op.add_column(
        "assets",
        sa.Column("platform_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        schema="public",
    )


def downgrade() -> None:
    op.drop_column("assets", "platform_tags", schema="public")
    op.drop_column("scan_check_results", "evidence", schema="public")
    for table in ("hardening_checks", "scan_check_results"):
        op.drop_column(table, "pack_version", schema="public")
        op.drop_column(table, "pack_id", schema="public")
        op.drop_column(table, "check_id", schema="public")
