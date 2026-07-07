"""create family rooms tables

Revision ID: 202607070245
Revises: 202607070215
Create Date: 2026-07-07 11:45:00.000000
"""
from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "202607070245"
down_revision: str | None = "202607070215"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    existing_tables = set()
    if not context.is_offline_mode():
        existing_tables = set(sa.inspect(op.get_bind()).get_table_names())

    if "family_rooms" not in existing_tables:
        op.create_table(
            "family_rooms",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("baby_id", sa.String(length=64), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("invite_code", sa.String(length=20), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("invite_code", name="uq_family_rooms_invite_code"),
            sa.UniqueConstraint("owner_user_id", name="uq_family_rooms_owner_user_id"),
        )
        op.create_index(op.f("ix_family_rooms_baby_id"), "family_rooms", ["baby_id"], unique=False)
        op.create_index(op.f("ix_family_rooms_id"), "family_rooms", ["id"], unique=False)
        op.create_index(op.f("ix_family_rooms_invite_code"), "family_rooms", ["invite_code"], unique=False)
        op.create_index(op.f("ix_family_rooms_owner_user_id"), "family_rooms", ["owner_user_id"], unique=False)

    if "family_room_members" not in existing_tables:
        op.create_table(
            "family_room_members",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("family_room_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["family_room_id"], ["family_rooms.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("family_room_id", "user_id", name="uq_family_room_members_room_user"),
        )
        op.create_index(
            op.f("ix_family_room_members_family_room_id"),
            "family_room_members",
            ["family_room_id"],
            unique=False,
        )
        op.create_index(op.f("ix_family_room_members_id"), "family_room_members", ["id"], unique=False)
        op.create_index(op.f("ix_family_room_members_user_id"), "family_room_members", ["user_id"], unique=False)


def downgrade() -> None:
    existing_tables = set()
    if not context.is_offline_mode():
        existing_tables = set(sa.inspect(op.get_bind()).get_table_names())

    if context.is_offline_mode() or "family_room_members" in existing_tables:
        op.drop_index(op.f("ix_family_room_members_user_id"), table_name="family_room_members")
        op.drop_index(op.f("ix_family_room_members_id"), table_name="family_room_members")
        op.drop_index(op.f("ix_family_room_members_family_room_id"), table_name="family_room_members")
        op.drop_table("family_room_members")

    if context.is_offline_mode() or "family_rooms" in existing_tables:
        op.drop_index(op.f("ix_family_rooms_owner_user_id"), table_name="family_rooms")
        op.drop_index(op.f("ix_family_rooms_invite_code"), table_name="family_rooms")
        op.drop_index(op.f("ix_family_rooms_id"), table_name="family_rooms")
        op.drop_index(op.f("ix_family_rooms_baby_id"), table_name="family_rooms")
        op.drop_table("family_rooms")
