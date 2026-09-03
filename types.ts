
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

export type DietEntryType = 'food' | 'symptom' | 'medicine';

export interface DietEntry {
  id: string;
  type: DietEntryType;
  name: string;
  timestamp: number; // Unix timestamp
  notes?: string;
  intensity?: number; // 1-5, for symptoms
  afterFoodDelay?: string; // e.g., "15m", "1h"
}

export interface BloodMarker {
  id: string;
  name: string;
  unit?: string;
  rangeMin?: number;
  rangeMax?: number;
}

export interface BloodMarkerRecord {
  id: string;
  markerId: string;
  date: string; // ISO date string YYYY-MM-DD
  value: number;
}

// -- Gym Tracker Types --

export interface GymExercise {
  id: string;
  name: string;
  notes?: string;
  setCount: number;
  targetReps: number;
  restTimeSeconds: number;
  setTargets: string[]; // e.g. ["15kg", "20kg", "25kg"]
  lastActualReps?: Record<string, number>; // set index (as string) -> reps actually performed last time
}

export interface GymDay {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface ActiveWorkout {
  startedAt: number;
  dayId: string;
  currentExerciseIndex: number;
  completedSetsByExercise: Record<string, number>; // exerciseId -> completed count
  status: 'active' | 'resting' | 'completed';
  restEndsAt?: number;
  completedAt?: number;
  lastCompletedExerciseId?: string;
  setStartedAt?: number; // when the current set began (for time-based duration tracking)
  actualSetDurations?: Record<string, number[]>; // exerciseId -> elapsed seconds per completed set
  actualSetReps?: Record<string, number[]>; // exerciseId -> reps performed per completed set, this session
  draftReps?: Record<string, number>; // exerciseId -> reps shown for the not-yet-completed set, survives navigating away and back
  pendingRestTaskName?: string; // Cloud Tasks name of the queued "rest over" push, so it can be cancelled
}

export interface WorkoutHistorySet {
  exerciseId: string;
  exerciseName: string;
  completedSets: number;
  targetReps: number;
  totalReps: number;
  totalVolume: number;
  unit: string;
  metric: 'weight' | 'duration';
  setTargets: string[];
  actualReps: number[]; // reps actually performed, index-aligned with setTargets
}

export interface WorkoutSession {
  id: string;
  startedAt: number; // Unix Timestamp
  endedAt: number; // Unix Timestamp
  dayId: string;
  dayName: string;
  exercisesCompleted: WorkoutHistorySet[];
  status?: 'completed' | 'abandoned';
}
