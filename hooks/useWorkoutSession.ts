import { useState, useEffect } from 'react';
import { ActiveWorkout } from '../types';

const STORAGE_KEY = 'health_tracker_active_workout';

export const useWorkoutSession = () => {
    const [activeWorkout, setActiveWorkoutState] = useState<ActiveWorkout | null>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
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
