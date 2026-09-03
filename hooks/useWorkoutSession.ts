import { useCallback, useRef, useState } from 'react';
import { ActiveWorkout } from '../types';

const STORAGE_KEY = 'health_tracker_active_workout';

type WorkoutUpdate = ActiveWorkout | null | ((previous: ActiveWorkout | null) => ActiveWorkout | null);

const readStoredWorkout = (): ActiveWorkout | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
        const parsed = JSON.parse(stored) as ActiveWorkout & { status?: string };
        if (parsed.status === 'finished') {
            return { ...parsed, status: 'completed' };
        }
        return parsed;
    } catch {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
};

export const useWorkoutSession = () => {
    const [activeWorkout, setActiveWorkoutState] = useState<ActiveWorkout | null>(readStoredWorkout);

    // Mirrors the current value so updater functions see the latest session even when several
    // updates land in one render, and so the setter itself can stay stable across renders.
    const latestWorkout = useRef(activeWorkout);

    const setActiveWorkout = useCallback((update: WorkoutUpdate) => {
        const workout = typeof update === 'function' ? update(latestWorkout.current) : update;

        latestWorkout.current = workout;
        setActiveWorkoutState(workout);

        if (workout) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workout));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    return { activeWorkout, setActiveWorkout };
};
