"""baseline existing schema

Revision ID: 91c43e6f135e
Revises: 
Create Date: 2026-08-30 10:29:34.266118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91c43e6f135e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: помечает уже существующую (созданную вручную через schema_fixed.sql)
    схему как отправную точку для Alembic. Дальше — все изменения только миграциями.
    Применяется через `alembic stamp` на живой БД, а не `upgrade`."""
    pass


def downgrade() -> None:
    pass
