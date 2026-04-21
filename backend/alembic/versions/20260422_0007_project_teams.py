"""Add ProjectTeam and ProjectAssignment tables."""

from alembic import op
import sqlalchemy as sa


revision = "20260422_0007"
down_revision = "20260421_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_teams",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("project_id", sa.String(length=64), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "number", name="uq_project_teams_project_number"),
    )
    op.create_table(
        "project_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", sa.String(length=64), sa.ForeignKey("project_teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", name="uq_project_assignments_user"),
    )


def downgrade() -> None:
    op.drop_table("project_assignments")
    op.drop_table("project_teams")
