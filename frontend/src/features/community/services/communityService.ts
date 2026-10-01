import { apiRequest } from "@/services/api/apiClient";
import type {
  CommunityComment,
  CommunityPostDetail,
  CommunityPostListItem,
  CreatePostInput,
  GetPostsParams,
  GetPostsResult,
  ReactionState
} from "@/features/community/types/community";

const DEFAULT_LIMIT = 5;

export async function getPosts(accessToken: string, params: GetPostsParams = {}): Promise<GetPostsResult> {
  const { category, ageGroup, cursor, limit = DEFAULT_LIMIT } = params;
  const { data, meta } = await apiRequest<CommunityPostListItem[]>("/posts", {
    accessToken,
    query: { category, ageGroup, cursor: cursor ?? undefined, limit }
  });
  return { items: data, nextCursor: meta?.hasNext ? meta.cursor : null };
}

export async function getPostById(accessToken: string, id: string): Promise<CommunityPostDetail> {
  const { data } = await apiRequest<CommunityPostDetail>(`/posts/${id}`, { accessToken });
  return data;
}

export async function createPost(accessToken: string, input: CreatePostInput): Promise<{ id: string }> {
  const { data } = await apiRequest<{ id: string; similarPosts: unknown[] }>("/posts", {
    method: "POST",
    accessToken,
    body: input
  });
  return { id: data.id };
}

export async function getComments(accessToken: string, postId: string): Promise<CommunityComment[]> {
  const { data } = await apiRequest<CommunityComment[]>(`/posts/${postId}/comments`, { accessToken });
  return data;
}

export async function addComment(
  accessToken: string,
  postId: string,
  input: { content: string; isAnonymous: boolean }
): Promise<CommunityComment> {
  const { data } = await apiRequest<CommunityComment>(`/posts/${postId}/comments`, { method: "POST", accessToken, body: input });
  return data;
}

export async function deleteComment(accessToken: string, postId: string, commentId: string): Promise<void> {
  await apiRequest<null>(`/posts/${postId}/comments/${commentId}`, { method: "DELETE", accessToken });
}

export async function setPostReaction(
  accessToken: string,
  postId: string,
  reaction: "like" | "bookmark",
  active: boolean
): Promise<ReactionState> {
  const { data } = await apiRequest<ReactionState>(`/posts/${postId}/${reaction}`, {
    method: active ? "POST" : "DELETE",
    accessToken
  });
  return data;
}
