"""create babies table

Revision ID: 202607190001
Revises: 202607070215
Create Date: 2026-07-19 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "202607190001"
down_revision: Union[str, None] = "202607070215"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "babies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(length=10), nullable=False, server_default="UNKNOWN"),
        sa.Column("profile_image_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_babies_id"), "babies", ["id"], unique=False)
    op.create_index(op.f("ix_babies_owner_user_id"), "babies", ["owner_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_babies_owner_user_id"), table_name="babies")
    op.drop_index(op.f("ix_babies_id"), table_name="babies")
    op.drop_table("babies")
