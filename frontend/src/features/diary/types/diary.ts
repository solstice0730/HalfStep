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

export interface UpdateDiaryInput {
  title?: string;
  content?: string;
  imageUrls?: string[];
}
