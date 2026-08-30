"""add agent_api_keys table

Revision ID: 332ce34492ff
Revises: 91c43e6f135e
Create Date: 2026-08-30 10:29:34.979681

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '332ce34492ff'
down_revision: Union[str, Sequence[str], None] = '91c43e6f135e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_api_keys",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("client_organizations.id"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("key_hash", sa.Text(), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        schema="public",
    )
    op.create_index("ix_agent_api_keys_organization_id", "agent_api_keys", ["organization_id"], schema="public")


def downgrade() -> None:
    op.drop_index("ix_agent_api_keys_organization_id", table_name="agent_api_keys", schema="public")
    op.drop_table("agent_api_keys", schema="public")
