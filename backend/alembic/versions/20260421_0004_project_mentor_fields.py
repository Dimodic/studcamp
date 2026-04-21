"""Add project description and mentor fields."""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0004"
down_revision = "20260419_0003"
branch_labels = None
depends_on = None


PROJECT_COLUMNS = (
    ("description", sa.Text()),
    ("mentor_name", sa.String(length=255)),
    ("mentor_position", sa.String(length=500)),
    ("mentor_city", sa.String(length=128)),
    ("mentor_telegram", sa.String(length=128)),
    ("mentor_photo", sa.String(length=500)),
    ("mentor_work_format", sa.String(length=255)),
)


def upgrade() -> None:
    for name, column_type in PROJECT_COLUMNS:
        op.add_column("projects", sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    for name, _ in reversed(PROJECT_COLUMNS):
        op.drop_column("projects", name)
