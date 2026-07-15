"""create records tables

Revision ID: 202607150900
Revises: 202607070215
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607150900"
down_revision: str | None = "202607070215"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "babies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(20), nullable=False, server_default="UNKNOWN"),
        sa.Column("profile_image_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_babies_id", "babies", ["id"])
    op.create_index("ix_babies_owner_user_id", "babies", ["owner_user_id"])
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
    op.create_table(
        "care_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("baby_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("log_type", sa.String(20), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("amount_ml", sa.Integer(), nullable=True),
        sa.Column("feeding_type", sa.String(20), nullable=True),
        sa.Column("diaper_type", sa.String(20), nullable=True),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("extra_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["baby_id"], ["babies.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("id", "baby_id", "user_id", "log_type", "occurred_at"):
        op.create_index(f"ix_care_logs_{column}", "care_logs", [column])


def downgrade() -> None:
    op.drop_table("care_logs")
    op.drop_table("baby_caregivers")
    op.drop_table("babies")
