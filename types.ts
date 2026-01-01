export interface Account {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  id: string;
  accountId: string;
  name: string;
  isPrimary: boolean; // The profile created for the account holder
  color: string; // UI decoration
}

export interface Vaccine {
  id: string;
  profileId: string; // Links to Profile.id
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