export interface SavedDiary {
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  highlights: string[];
  photoUris: string[];
  generatedByAi: boolean;
  savedAt: string; // ISO datetime
}
