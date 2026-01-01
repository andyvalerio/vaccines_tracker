export interface Account {
  id: string;
  email: string;
  name: string;
}

export interface Vaccine {
  id: string;
  // profileId removed - vaccines now belong directly to the account/user
  name: string;
  dateTaken: string;
  nextDueDate?: string;
  notes?: string;
  createdAt: number;
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