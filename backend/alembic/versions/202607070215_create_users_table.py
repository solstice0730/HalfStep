"""create users table

Revision ID: 202607070215
Revises:
Create Date: 2026-07-07 11:15:00.000000
"""
from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "202607070215"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not context.is_offline_mode():
        inspector = sa.inspect(op.get_bind())
        if "users" in inspector.get_table_names():
            return

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("nickname", sa.String(length=100), nullable=True),
        sa.Column("profile_image_url", sa.String(length=500), nullable=True),
        sa.Column("social_provider", sa.String(length=30), nullable=False),
        sa.Column("social_user_id", sa.String(length=255), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=True),
        sa.Column("refresh_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("social_provider", "social_user_id", name="uq_users_social_identity"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_social_provider"), "users", ["social_provider"], unique=False)
    op.create_index(op.f("ix_users_social_user_id"), "users", ["social_user_id"], unique=False)


def downgrade() -> None:
    if not context.is_offline_mode():
        inspector = sa.inspect(op.get_bind())
        if "users" not in inspector.get_table_names():
            return

    op.drop_index(op.f("ix_users_social_user_id"), table_name="users")
    op.drop_index(op.f("ix_users_social_provider"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
