"""Add is_hidden flag to main content entities."""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0006"
down_revision = "20260421_0005"
branch_labels = None
depends_on = None


TABLES = (
    "events",
    "projects",
    "stories",
    "org_updates",
    "campus_categories",
    "materials",
    "resources",
)


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        )


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_column(table, "is_hidden")
