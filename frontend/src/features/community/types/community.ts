// backend/app/models/community.py 시드 데이터(alembic 202607130900/202607131000) 기준 실제 카테고리.
export type CommunityCategoryCode =
  | "PREGNANCY"
  | "BIRTH_STORY"
  | "POSTPARTUM_CENTER"
  | "NEWBORN"
  | "FEEDING"
  | "HEALTH"
  | "SLEEP_DEVELOPMENT"
  | "FREE"
  | "COUNSELING";

export const CATEGORY_LABELS: Record<CommunityCategoryCode, string> = {
  PREGNANCY: "임신",
  BIRTH_STORY: "출산 후기",
  POSTPARTUM_CENTER: "조리원 정보",
  NEWBORN: "신생아",
  FEEDING: "수유·이유식",
  HEALTH: "건강·병원",
  SLEEP_DEVELOPMENT: "수면·발달",
  FREE: "자유",
  COUNSELING: "고민 상담"
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as CommunityCategoryCode[];

// backend/app/services/community.py AGE_GROUPS + "ALL_AGES" (목록 조회 필터 전용 버킷).
export type AgeGroup = "M0_2" | "M3_5" | "M6_8" | "M9_11" | "M12_17" | "M18_24" | "ALL_AGES";

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  M0_2: "0~2개월",
  M3_5: "3~5개월",
  M6_8: "6~8개월",
  M9_11: "9~11개월",
  M12_17: "12~17개월",
  M18_24: "18~24개월",
  ALL_AGES: "월령 무관"
};

export const AGE_GROUP_OPTIONS = Object.keys(AGE_GROUP_LABELS) as AgeGroup[];

// 글쓰기 화면에서 월령 구간을 고르면 실제 저장할 대표 개월 수(babyAgeMonths, 0~24 정수)로 변환.
export const AGE_GROUP_REPRESENTATIVE_MONTHS: Record<Exclude<AgeGroup, "ALL_AGES">, number> = {
  M0_2: 1,
  M3_5: 4,
  M6_8: 7,
  M9_11: 10,
  M12_17: 14,
  M18_24: 20
};

export const MAX_POST_IMAGES = 5;

export interface CommunityAuthor {
  userId: string | null;
  nickname: string;
  isAnonymous: boolean;
}

export interface CommunityPostListItem {
  id: string;
  category: CommunityCategoryCode;
  title: string;
  preview: string;
  babyAgeMonths: number | null;
  author: CommunityAuthor;
  likeCount: number;
  commentCount: number;
  imageCount: number;
  createdAt: string;
}

export interface CommunityPostDetail extends CommunityPostListItem {
  content: string;
  imageUrls: string[];
  isLiked: boolean;
  updatedAt: string;
}

export interface GetPostsParams {
  category?: CommunityCategoryCode;
  ageGroup?: AgeGroup;
  cursor?: string | null;
  limit?: number;
}

export interface GetPostsResult {
  items: CommunityPostListItem[];
  nextCursor: string | null;
}

export interface CreatePostInput {
  category: CommunityCategoryCode;
  title: string;
  content: string;
  imageUrls: string[];
  babyAgeMonths: number | null;
  isAnonymous: boolean;
}
