
export interface Account {
  id: string;
  email: string;
  name: string;
}

export interface Vaccine {
  id: string;
  name: string;
  dateTaken?: string;
  history?: string[];
  nextDueDate?: string;
  notes?: string;
  createdAt: number;
  analysisStatus?: 'loading' | 'completed' | 'dismissed' | 'accepted';
  suggestedNextDueDate?: string | null;
  suggestedNotes?: string | null;
}

export interface AiSuggestion {
  nextDueDate: string | null;
  notes: string;
  isRecommended: boolean;
}

export interface Suggestion {
  id: string;
  name: string;
  reason: string;
}

export type DietEntryType = 'food' | 'symptom';

export interface DietEntry {
  id: string;
  type: DietEntryType;
  name: string;
  timestamp: number; // Unix timestamp
  notes?: string;
  intensity?: number; // 1-5, for symptoms
  afterFoodDelay?: string; // e.g., "15m", "1h"
}
