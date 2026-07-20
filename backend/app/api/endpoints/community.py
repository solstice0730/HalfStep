from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.community import CommunityPostCreate
from app.services import community as community_service

router = APIRouter(prefix="/posts", tags=["community"])


@router.get("")
def list_posts(
    category: str | None = None,
    age_group: str | None = Query(default=None, alias="ageGroup"),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    posts, next_cursor, has_next = community_service.list_community_posts(
        db, category=category, age_group=age_group, cursor=cursor, limit=limit
    )
    return {
        "success": True,
        "data": [community_service.serialize_list_item(post) for post in posts],
        "meta": {"cursor": next_cursor, "hasNext": has_next},
    }


@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    post = community_service.get_community_post(db, post_id)
    data = community_service.serialize_list_item(post)
    data.update(
        {
            "content": post.content,
            "imageUrls": post.image_urls or [],
            "isLiked": False,
            "author": community_service.serialize_author(post, include_user_id=True),
            "updatedAt": post.updated_at,
        }
    )
    return {"success": True, "data": data}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_post(
    payload: CommunityPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    post = community_service.create_community_post(db, payload=payload, current_user=current_user)
    return {"success": True, "data": {"id": str(post.id), "similarPosts": []}}
