import { useState } from 'react';
import { ActiveWorkout } from '../types';

const STORAGE_KEY = 'health_tracker_active_workout';

export const useWorkoutSession = () => {
    const [activeWorkout, setActiveWorkoutState] = useState<ActiveWorkout | null>(() => {
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
    });

    const setActiveWorkout = (workout: ActiveWorkout | null) => {
        setActiveWorkoutState(workout);
        if (workout) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(workout));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    return { activeWorkout, setActiveWorkout };
};
