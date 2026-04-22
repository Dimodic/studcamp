"""camps.is_active + initial activation.

Каждый кемп получает булев флаг is_active. Только один кемп может быть
активным; организатор переключает его через /admin/camps/{id}/activate.
Миграция активирует первый по id кемп, чтобы система не осталась без
активного (бэкенд требует active camp для bootstrap'a всех пользователей).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260422_0008"
down_revision = "20260422_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "camps",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Активируем самый ранний по id кемп (обычно seeded «Алиса и умные …»).
    op.execute(
        "UPDATE camps SET is_active = TRUE "
        "WHERE id = (SELECT id FROM camps ORDER BY id LIMIT 1)"
    )
    op.alter_column("camps", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_column("camps", "is_active")
