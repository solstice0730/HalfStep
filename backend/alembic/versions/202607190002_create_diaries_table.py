"""create diaries table

Revision ID: 202607190002
Revises: 202607190001
Create Date: 2026-07-19 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "202607190002"
down_revision: Union[str, None] = "202607190001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    )
    op.create_index(op.f("ix_diaries_id"), "diaries", ["id"], unique=False)
    op.create_index(op.f("ix_diaries_baby_id"), "diaries", ["baby_id"], unique=False)
    op.create_index(op.f("ix_diaries_user_id"), "diaries", ["user_id"], unique=False)
    op.create_index(op.f("ix_diaries_diary_date"), "diaries", ["diary_date"], unique=False)

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


def downgrade() -> None:
    op.drop_index(op.f("ix_diary_photos_diary_id"), table_name="diary_photos")
    op.drop_index(op.f("ix_diary_photos_id"), table_name="diary_photos")
    op.drop_table("diary_photos")
    op.drop_index(op.f("ix_diaries_diary_date"), table_name="diaries")
    op.drop_index(op.f("ix_diaries_user_id"), table_name="diaries")
    op.drop_index(op.f("ix_diaries_baby_id"), table_name="diaries")
    op.drop_index(op.f("ix_diaries_id"), table_name="diaries")
    op.drop_table("diaries")
