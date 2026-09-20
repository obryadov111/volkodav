"""add check metadata snapshot to results

Результат проверки контент-пака самодостаточен: название, критичность и рекомендация
на момент прогона хранятся в самой записи (у таких результатов нет строки в hardening_rules).
Так интерфейс показывает их без изменений фронтенда (COALESCE с правилом), а отчёт за прошлый
период не зависит от последующих правок пака. evidence добавляется в текущее состояние
(hardening_checks) — раньше оно хранилось только в истории.

Все колонки nullable: прежний путь (facts -> hardening_rules) их не заполняет.

Revision ID: b7d2e4f18c63
Revises: a3f1c9d27b40
Create Date: 2026-09-20 22:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7d2e4f18c63'
down_revision: Union[str, Sequence[str], None] = 'a3f1c9d27b40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("hardening_checks", "scan_check_results"):
        op.add_column(table, sa.Column("title", sa.Text(), nullable=True), schema="public")
        op.add_column(table, sa.Column("severity", sa.Text(), nullable=True), schema="public")
        op.add_column(table, sa.Column("remediation", sa.Text(), nullable=True), schema="public")
    op.add_column("hardening_checks", sa.Column("evidence", sa.Text(), nullable=True), schema="public")


def downgrade() -> None:
    op.drop_column("hardening_checks", "evidence", schema="public")
    for table in ("scan_check_results", "hardening_checks"):
        op.drop_column(table, "remediation", schema="public")
        op.drop_column(table, "severity", schema="public")
        op.drop_column(table, "title", schema="public")
