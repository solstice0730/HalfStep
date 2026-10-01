export interface SavedDiary {
  id: number;
  babyId: number;
  date: string;
  title: string;
  content: string;
  highlights: string[];
  imageUrls: string[];
  isAiGenerated: boolean;
  notice: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryInput {
  babyId: number;
  date: string;
  title: string;
  content: string;
  highlights: string[];
  imageUrls: string[];
  isAiGenerated: boolean;
  notice?: string | null;
}

/** 일기 재료 화면에서 고른 사진. 추가 즉시 업로드하고 장면 캡션을 받아둔다. */
export interface DiaryPhotoDraft {
  uri: string;
  /** 업로드된 공개 URL. 업로드 실패 시 null이며 저장 시 다시 시도한다. */
  url: string | null;
  /** AI 장면 캡션 (없으면 null). */
  caption: string | null;
  /** 보호자가 직접 적은 설명. */
  description: string;
  /** 사진을 추가한 시각(HH:mm) — 썸네일 배지에 표시. */
  addedAt: string;
  status: "uploading" | "analyzing" | "ready" | "error";
}

export interface DiaryMaterialCounts {
  records: number;
  photos: number;
  chats: number;
}

export interface UpdateDiaryInput {
  title?: string;
  content?: string;
  imageUrls?: string[];
}
