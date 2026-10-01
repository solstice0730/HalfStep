from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.community import CommunityCommentCreate, CommunityPostCreate
from app.services import community as community_service

router = APIRouter(prefix="/posts", tags=["community"])


@router.get("")
def list_posts(
    category: str | None = None,
    age_group: str | None = Query(default=None, alias="ageGroup"),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    posts, next_cursor, has_next = community_service.list_community_posts(
        db, category=category, age_group=age_group, cursor=cursor, limit=limit
    )
    states = community_service.reaction_state(db, posts=posts, user_id=current_user.id)
    return {
        "success": True,
        "data": [community_service.serialize_list_item(post, **states[post.id]) for post in posts],
        "meta": {"cursor": next_cursor, "hasNext": has_next},
    }


@router.get("/{post_id}")
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    post = community_service.get_community_post(db, post_id)
    state = community_service.reaction_state(db, posts=[post], user_id=current_user.id)[post.id]
    data = community_service.serialize_list_item(post, **state)
    data.update(
        {
            "content": post.content,
            "imageUrls": post.image_urls or [],
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


@router.post("/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    data = community_service.set_reaction(db, post_id=post_id, user_id=current_user.id, reaction_type="LIKE", active=True)
    return {"success": True, "data": data}


@router.delete("/{post_id}/like")
def unlike_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    data = community_service.set_reaction(db, post_id=post_id, user_id=current_user.id, reaction_type="LIKE", active=False)
    return {"success": True, "data": data}


@router.post("/{post_id}/bookmark")
def bookmark_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    data = community_service.set_reaction(
        db, post_id=post_id, user_id=current_user.id, reaction_type="BOOKMARK", active=True
    )
    return {"success": True, "data": data}


@router.delete("/{post_id}/bookmark")
def unbookmark_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    data = community_service.set_reaction(
        db, post_id=post_id, user_id=current_user.id, reaction_type="BOOKMARK", active=False
    )
    return {"success": True, "data": data}


@router.get("/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    return {"success": True, "data": community_service.list_comments(db, post_id=post_id, user_id=current_user.id)}


@router.post("/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    payload: CommunityCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = community_service.add_comment(
        db, post_id=post_id, user=current_user, content=payload.content, is_anonymous=payload.isAnonymous
    )
    return {"success": True, "data": data}


@router.delete("/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: int, comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> dict:
    community_service.remove_comment(db, post_id=post_id, comment_id=comment_id, user_id=current_user.id)
    return {"success": True, "data": None}
