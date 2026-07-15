"""drop baby caregivers

Revision ID: 202607151600
Revises: 202607150900
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607151600"
down_revision: str | None = "202607150900"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("baby_caregivers")


def downgrade() -> None:
    op.create_table(
        "baby_caregivers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("baby_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="CAREGIVER"),
        sa.Column("relation", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["baby_id"], ["babies.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("baby_id", "user_id", name="uq_baby_caregiver"),
    )
    op.create_index("ix_baby_caregivers_baby_id", "baby_caregivers", ["baby_id"])
    op.create_index("ix_baby_caregivers_user_id", "baby_caregivers", ["user_id"])
