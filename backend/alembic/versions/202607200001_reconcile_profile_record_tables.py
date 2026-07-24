"""reconcile profile, diary, and record tables on existing databases

Revision ID: 202607200001
Revises: 202607131100
Create Date: 2026-07-20 00:00:00.000000

The profile/record revisions were inserted before an already-deployed head. Existing
databases therefore reported the latest revision without having these tables. This
forward migration repairs those databases while remaining a no-op on fresh installs.
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607200001"
down_revision: str | None = "202607131100"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    tables = set(sa.inspect(op.get_bind()).get_table_names())

    if "babies" not in tables:
        op.create_table(
            "babies",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("birth_date", sa.Date(), nullable=False),
            sa.Column("gender", sa.String(length=10), nullable=False, server_default="UNKNOWN"),
            sa.Column("profile_image_url", sa.String(length=500), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_babies_id"), "babies", ["id"], unique=False)
        op.create_index(op.f("ix_babies_owner_user_id"), "babies", ["owner_user_id"], unique=False)
        tables.add("babies")

    if "diaries" not in tables:
        op.create_table(
            "diaries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("baby_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("diary_date", sa.Date(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("highlights", sa.Text(), nullable=True),
            sa.Column("notice", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["baby_id"], ["babies.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("baby_id", "diary_date", name="uq_diaries_baby_date"),
        )
        op.create_index(op.f("ix_diaries_id"), "diaries", ["id"], unique=False)
        op.create_index(op.f("ix_diaries_baby_id"), "diaries", ["baby_id"], unique=False)
        op.create_index(op.f("ix_diaries_user_id"), "diaries", ["user_id"], unique=False)
        op.create_index(op.f("ix_diaries_diary_date"), "diaries", ["diary_date"], unique=False)
        tables.add("diaries")

    if "diary_photos" not in tables:
        op.create_table(
            "diary_photos",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("diary_id", sa.Integer(), nullable=False),
            sa.Column("image_url", sa.String(length=500), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["diary_id"], ["diaries.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_diary_photos_id"), "diary_photos", ["id"], unique=False)
        op.create_index(op.f("ix_diary_photos_diary_id"), "diary_photos", ["diary_id"], unique=False)
        tables.add("diary_photos")

    if "care_logs" not in tables:
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
    # This repair may be a no-op on clean databases, so it must not drop tables
    # that are owned by earlier revisions.
    pass
