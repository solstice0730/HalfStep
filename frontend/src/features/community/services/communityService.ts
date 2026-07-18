import { apiRequest } from "@/services/api/apiClient";
import type {
  CommunityPostDetail,
  CommunityPostListItem,
  CreatePostInput,
  GetPostsParams,
  GetPostsResult
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
