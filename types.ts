export interface Account {
  id: string;
  email: string;
  name: string;
}

export interface Vaccine {
  id: string;
  // profileId removed - vaccines now belong directly to the account/user
  name: string;
  dateTaken?: string; // Represents the LATEST dose taken
  history?: string[]; // Array of previous dates taken (ISO strings)
  nextDueDate?: string;
  notes?: string;
  createdAt: number;
  
  // AI Analysis fields
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