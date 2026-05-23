import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StorageService } from '../../services/storageService';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { ActiveWorkout as ActiveWorkoutState, GymDay, GymExercise, WorkoutHistorySet } from '../../types';
import { NotificationService } from '../../services/notificationService';

interface ActiveWorkoutProps {
    accountId: string;
    onFinish: () => void;
}

const safeArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

const getCompletedSetCount = (workout: ActiveWorkoutState, exerciseId: string) => {
    return (workout.completedSetsByExercise || {})[exerciseId] || 0;
};

const isExerciseComplete = (workout: ActiveWorkoutState, exercise: GymExercise) => {
    return getCompletedSetCount(workout, exercise.id) >= exercise.setCount;
};

const getFirstUncompletedExerciseIndex = (routineExercises: GymExercise[], workout: ActiveWorkoutState) => {
    return routineExercises.findIndex(exercise => !isExerciseComplete(workout, exercise));
};

const parseTarget = (target: string) => {
    const value = parseFloat(target) || 0;
    const unitMatch = target.match(/[a-zA-Z]+/);
    const unit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';
    const metric = unit.includes('min') ? 'duration' as const : 'weight' as const;
    return { value, unit, metric };
};

const buildExerciseSummary = (exercise: GymExercise, completedSets: number): WorkoutHistorySet => {
    const completedTargets = safeArray(exercise.setTargets).slice(0, completedSets);
    const parsedTargets = completedTargets.map(parseTarget);
    const durationTotal = parsedTargets.reduce((sum, item) => sum + item.value, 0);
    const weightTotal = parsedTargets.reduce((sum, item) => sum + (item.value * exercise.targetReps), 0);
    const metric = parsedTargets.some(item => item.metric === 'duration') ? 'duration' as const : 'weight' as const;
    const unit = parsedTargets[0]?.unit || 'kg';

    return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        completedSets,
        targetReps: exercise.targetReps,
        totalReps: completedSets * exercise.targetReps,
        totalVolume: metric === 'duration' ? durationTotal : weightTotal,
        unit,
        metric,
        setTargets: completedTargets
    };
};

export default function ActiveWorkout({ accountId, onFinish }: ActiveWorkoutProps) {
    const { activeWorkout, setActiveWorkout } = useWorkoutSession();
    const [days, setDays] = useState<GymDay[]>([]);
    const [exercises, setExercises] = useState<GymExercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0);
    const [messagingToken, setMessagingToken] = useState<string | null>(null);
    const [showRestCompleteCue, setShowRestCompleteCue] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const previousStatusRef = useRef<ActiveWorkoutState['status'] | null>(activeWorkout?.status || null);

    useEffect(() => {
        const unsubscribeDays = StorageService.subscribeGymDays(accountId, (loadedDays) => {
            setDays(loadedDays);
            setLoading(false);
        });
        const unsubscribeExercises = StorageService.subscribeGymExercises(accountId, setExercises);

        return () => {
            unsubscribeDays();
            unsubscribeExercises();
        };
    }, [accountId]);

    const day = useMemo(() => {
        if (!activeWorkout) return null;
        return days.find(item => item.id === activeWorkout.dayId) || null;
    }, [activeWorkout, days]);

    const routineExercises = useMemo(() => {
        if (!day) return [];
        return safeArray(day.exerciseIds)
            .map(id => safeArray(exercises).find(exercise => exercise.id === id))
            .filter(Boolean) as GymExercise[];
    }, [day, exercises]);

    useEffect(() => {
        if (loading || !activeWorkout) return;
        if (!day) {
            onFinish();
        }
    }, [loading, activeWorkout, day, onFinish]);

    useEffect(() => {
        if (!activeWorkout || routineExercises.length === 0) return;

        const firstUncompletedIndex = getFirstUncompletedExerciseIndex(routineExercises, activeWorkout);
        const hasCompletedEverything = firstUncompletedIndex === -1;

        if (hasCompletedEverything && activeWorkout.status !== 'completed') {
            setActiveWorkout({
                ...activeWorkout,
                status: 'completed',
                restEndsAt: undefined,
                completedAt: Date.now()
            });
            return;
        }

        if (!hasCompletedEverything && activeWorkout.currentExerciseIndex >= routineExercises.length) {
            setActiveWorkout({ ...activeWorkout, currentExerciseIndex: firstUncompletedIndex });
        }
    }, [activeWorkout, routineExercises, setActiveWorkout]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;

        if (activeWorkout?.status === 'resting' && activeWorkout.restEndsAt) {
            interval = setInterval(() => {
                const left = Math.max(0, Math.ceil((activeWorkout.restEndsAt! - Date.now()) / 1000));
                setTimeLeft(left);
                if (left <= 0) {
                    const firstUncompletedIndex = getFirstUncompletedExerciseIndex(routineExercises, activeWorkout);
                    const hasCompletedEverything = firstUncompletedIndex === -1;
                    setActiveWorkout({
                        ...activeWorkout,
                        status: hasCompletedEverything ? 'completed' : 'active',
                        currentExerciseIndex: hasCompletedEverything ? activeWorkout.currentExerciseIndex : Math.max(0, firstUncompletedIndex),
                        restEndsAt: undefined,
                        completedAt: hasCompletedEverything ? Date.now() : activeWorkout.completedAt
                    });
                }
            }, 1000);
        } else {
            setTimeLeft(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeWorkout, routineExercises, setActiveWorkout]);

    useEffect(() => {
        const previousStatus = previousStatusRef.current;
        const currentStatus = activeWorkout?.status || null;

        if (previousStatus === 'resting' && currentStatus && currentStatus !== 'resting' && document.visibilityState === 'visible') {
            NotificationService.playForegroundTimerComplete();
            NotificationService.vibrateTimerComplete();
            setShowRestCompleteCue(true);
            window.setTimeout(() => setShowRestCompleteCue(false), 3200);
        }

        previousStatusRef.current = currentStatus;
    }, [activeWorkout?.status]);

    const currentExercise = activeWorkout && routineExercises[activeWorkout.currentExerciseIndex]
        ? routineExercises[activeWorkout.currentExerciseIndex]
        : null;

    const firstUncompletedIndex = activeWorkout ? getFirstUncompletedExerciseIndex(routineExercises, activeWorkout) : -1;
    const nextFocusIndex = firstUncompletedIndex === -1
        ? -1
        : firstUncompletedIndex === activeWorkout?.currentExerciseIndex
            ? (firstUncompletedIndex + 1 < routineExercises.length ? firstUncompletedIndex + 1 : -1)
            : firstUncompletedIndex;
    const nextExercise = nextFocusIndex >= 0 ? routineExercises[nextFocusIndex] : null;

    const totalSets = routineExercises.reduce((sum, exercise) => sum + exercise.setCount, 0);
    const totalSetsCompleted = activeWorkout
        ? Object.values(activeWorkout.completedSetsByExercise || {}).reduce((sum, value) => sum + Number(value), 0)
        : 0;
    const progress = Math.min(100, Math.round((totalSetsCompleted / Math.max(totalSets, 1)) * 100));

    const requestNotificationToken = async () => {
        const token = await NotificationService.requestPushToken();
        setMessagingToken(token);
        return token;
    };

    const handleTargetChange = (newTarget: string) => {
        if (!currentExercise) return;
        const updatedExercises = safeArray(exercises).map(exercise => {
            if (exercise.id !== currentExercise.id) return exercise;
            const updatedTargets = [...safeArray(exercise.setTargets)];
            const targetIndex = Math.min(getCompletedSetCount(activeWorkout!, exercise.id), exercise.setCount - 1);
            updatedTargets[targetIndex] = newTarget;
            return { ...exercise, setTargets: updatedTargets };
        });
        setExercises(updatedExercises);
    };

    const handleTargetBlur = async (oldTarget: string, newTarget: string) => {
        if (!currentExercise || oldTarget === newTarget) return;
        const oldNum = parseFloat(oldTarget) || 0;
        const newNum = parseFloat(newTarget) || 0;
        if (newNum <= oldNum) return;

        const updatedExercise = safeArray(exercises).find(exercise => exercise.id === currentExercise.id);
        if (!updatedExercise) return;

        try {
            await StorageService.updateGymExercise(accountId, updatedExercise);
        } catch (error) {
            console.error('Failed to update gym exercise globally', error);
        }
    };

    const goToFirstUncompletedExercise = () => {
        if (!activeWorkout || firstUncompletedIndex === -1) return;
        setActiveWorkout({ ...activeWorkout, currentExerciseIndex: firstUncompletedIndex });
    };

    const goToExerciseIndex = (index: number) => {
        if (!activeWorkout || index < 0 || index >= routineExercises.length) return;
        setActiveWorkout({ ...activeWorkout, currentExerciseIndex: index });
    };

    const handleSwipeStart = (event: React.TouchEvent<HTMLDivElement>) => {
        setTouchStartX(event.touches[0]?.clientX || null);
    };

    const handleSwipeEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        if (!activeWorkout || touchStartX === null) return;
        const endX = event.changedTouches[0]?.clientX || touchStartX;
        const deltaX = endX - touchStartX;
        setTouchStartX(null);

        if (Math.abs(deltaX) < 40) return;
        if (deltaX < 0) {
            goToExerciseIndex(activeWorkout.currentExerciseIndex + 1);
        } else {
            goToExerciseIndex(activeWorkout.currentExerciseIndex - 1);
        }
    };

    const handleCompleteSet = async () => {
        if (!activeWorkout || !currentExercise) return;

        const nextSetCount = getCompletedSetCount(activeWorkout, currentExercise.id) + 1;
        const completedSetsByExercise = {
            ...(activeWorkout.completedSetsByExercise || {}),
            [currentExercise.id]: nextSetCount
        };
        const updatedWorkout: ActiveWorkoutState = {
            ...activeWorkout,
            completedSetsByExercise,
            lastCompletedExerciseId: currentExercise.id
        };

        const firstRemainingIndex = getFirstUncompletedExerciseIndex(routineExercises, updatedWorkout);
        const hasCompletedEverything = firstRemainingIndex === -1;

        if (hasCompletedEverything) {
            setActiveWorkout({
                ...updatedWorkout,
                currentExerciseIndex: activeWorkout.currentExerciseIndex,
                status: 'completed',
                restEndsAt: undefined,
                completedAt: Date.now()
            });
            return;
        }

        if (currentExercise.restTimeSeconds <= 0) {
            setActiveWorkout({
                ...updatedWorkout,
                currentExerciseIndex: firstRemainingIndex,
                status: 'active',
                restEndsAt: undefined
            });
            return;
        }

        const restEndsAt = Date.now() + currentExercise.restTimeSeconds * 1000;
        setActiveWorkout({
            ...updatedWorkout,
            currentExerciseIndex: firstRemainingIndex,
            status: 'resting',
            restEndsAt
        });
        setTimeLeft(currentExercise.restTimeSeconds);

        try {
            const token = messagingToken || await requestNotificationToken();
            if (token) {
                await NotificationService.scheduleRestNotification(token, currentExercise.restTimeSeconds);
            }
        } catch (error) {
            console.warn('Failed to schedule rest notification', error);
        }
    };

    const handleSaveAndCompleteSession = async () => {
        if (!activeWorkout || !day) return;

        try {
            const exercisesCompleted = routineExercises
                .map(exercise => {
                    const completedSets = getCompletedSetCount(activeWorkout, exercise.id);
                    if (completedSets === 0) return null;
                    return buildExerciseSummary(exercise, completedSets);
                })
                .filter(Boolean) as WorkoutHistorySet[];

            await StorageService.addWorkoutSession(accountId, {
                id: '',
                startedAt: activeWorkout.startedAt,
                endedAt: Date.now(),
                dayId: day.id,
                dayName: day.name,
                status: activeWorkout.status === 'completed' ? 'completed' : 'abandoned',
                exercisesCompleted
            });
        } catch (error) {
            console.error('Failed to save history', error);
        }

        onFinish();
    };

    const skipRest = () => {
        if (!activeWorkout) return;
        const nextIndex = firstUncompletedIndex === -1 ? activeWorkout.currentExerciseIndex : firstUncompletedIndex;
        setActiveWorkout({
            ...activeWorkout,
            currentExerciseIndex: nextIndex,
            status: firstUncompletedIndex === -1 ? 'completed' : 'active',
            restEndsAt: undefined,
            completedAt: firstUncompletedIndex === -1 ? Date.now() : activeWorkout.completedAt
        });
    };

    const abandonSession = () => {
        if (confirm('Are you sure you want to abandon this session? Progress will be lost.')) {
            onFinish();
        }
    };

    if (loading || !activeWorkout) return <div className="animate-pulse p-4 text-slate-500">Loading workout...</div>;
    if (routineExercises.length === 0) return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Routine has no valid exercises. <button onClick={onFinish} className="underline font-bold ml-2">End Session</button></div>;
    if (!currentExercise) return <div className="p-4 text-slate-500">Loading current exercise...</div>;

    const currentSetsCompleted = getCompletedSetCount(activeWorkout, currentExercise.id);
    const currentSetTargetIndex = Math.min(currentSetsCompleted, currentExercise.setCount - 1);
    const currentSetTarget = safeArray(currentExercise.setTargets)[currentSetTargetIndex] || '';
    const parsedTarget = parseTarget(currentSetTarget);
    const isResting = activeWorkout.status === 'resting';
    const isCompleted = activeWorkout.status === 'completed';

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden min-h-[70vh] max-h-[78vh] p-5 sm:p-6 relative flex flex-col">
            {showRestCompleteCue && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-600/10 backdrop-blur-[1px] pointer-events-none">
                    <div className="relative text-center animate-fade-in">
                        <div className="absolute -inset-10 rounded-full border-8 border-blue-300/60 animate-ping"></div>
                        <div className="absolute -inset-20 rounded-full border-4 border-emerald-300/40 animate-ping [animation-delay:180ms]"></div>
                        <div className="relative bg-white shadow-2xl border border-blue-100 rounded-3xl px-8 py-6">
                            <div className="text-xs font-black uppercase tracking-[0.35em] text-blue-600 mb-2">Rest Over</div>
                            <div className="text-3xl font-extrabold text-slate-900 mb-2">Time for your next set</div>
                            <div className="text-slate-500 font-medium">{currentExercise.name} is ready.</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-start justify-between gap-4 mb-5">
                <button onClick={abandonSession} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">
                    Abandon Session
                </button>
                {!isCompleted && (
                    <button onClick={handleSaveAndCompleteSession} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-colors shadow-sm">
                        Save & Complete
                    </button>
                )}
            </div>

            <div className="w-full mb-5">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    <span>{day.name}</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-blue-600 h-full transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
                {routineExercises.map((exercise, index) => {
                    const completed = isExerciseComplete(activeWorkout, exercise);
                    const isCurrent = index === activeWorkout.currentExerciseIndex;
                    return (
                        <button
                            key={exercise.id}
                            onClick={() => goToExerciseIndex(index)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isCurrent ? 'bg-slate-900 text-white' : completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {index + 1}. {exercise.name}
                        </button>
                    );
                })}
            </div>

            <div className="transition-all w-full flex-1 overflow-hidden" onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}>
                {isCompleted ? (
                    <div className="relative h-full overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8 text-center shadow-inner flex flex-col items-center justify-center">
                        <div className="absolute top-6 left-8 w-6 h-6 rounded-full bg-amber-300 animate-bounce"></div>
                        <div className="absolute top-10 right-10 w-4 h-4 rounded-full bg-blue-300 animate-ping"></div>
                        <div className="absolute bottom-10 left-1/4 w-5 h-5 rounded-full bg-emerald-300 animate-pulse"></div>
                        <div className="absolute bottom-8 right-1/4 w-3 h-3 rounded-full bg-pink-300 animate-bounce"></div>
                        <div className="text-xs font-black uppercase tracking-[0.45em] text-emerald-600 mb-4">Session Complete</div>
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-3">Workout finished</h2>
                        <p className="text-slate-600 max-w-lg mx-auto mb-8">Every exercise in this routine has been completed. Save it now while the session details are fresh.</p>
                        <button onClick={handleSaveAndCompleteSession} className="w-full max-w-md mx-auto py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xl rounded-3xl shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                            Save Workout
                        </button>
                    </div>
                ) : isResting ? (
                    <div className="animate-fade-in h-full rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 flex flex-col justify-center">
                        <div className="text-center mb-6">
                            <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Rest Interval</div>
                            <div className="text-7xl font-light text-slate-800 tracking-tighter tabular-nums mb-3">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 mb-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Exercise</div>
                                <div className="font-bold text-slate-900 text-2xl">{currentExercise.name}</div>
                                <div className="text-sm text-slate-500 mt-1">{Math.min(currentSetsCompleted, currentExercise.setCount)} of {currentExercise.setCount} sets complete</div>
                                {currentExercise.notes && (
                                    <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900">
                                        {currentExercise.notes}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Next Exercise</div>
                                <div className="font-bold text-slate-900 text-2xl">{nextExercise?.name || 'Finish strong'}</div>
                                <div className="text-sm text-slate-500 mt-1">
                                    {nextExercise ? `${nextExercise.setCount} sets x ${nextExercise.targetReps} reps` : 'No more incomplete exercises after this one.'}
                                </div>
                                <div className="mt-4 text-sm text-slate-500">Progress: {totalSetsCompleted} / {totalSets} total sets</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center">
                            <button onClick={skipRest} className="text-slate-700 font-bold bg-white border border-slate-200 px-6 py-2.5 rounded-full hover:bg-slate-50 transition-colors">Skip Rest</button>
                            {firstUncompletedIndex >= 0 && (
                                <button onClick={goToFirstUncompletedExercise} className="text-blue-700 font-bold bg-blue-100 border border-blue-200 px-6 py-2.5 rounded-full hover:bg-blue-200 transition-colors">Go To Next Unfinished</button>
                            )}
                            {!messagingToken && (
                                <button onClick={requestNotificationToken} className="text-blue-700 font-bold bg-white border border-blue-200 px-6 py-2.5 rounded-full hover:bg-blue-50 transition-colors">Enable Notifications</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in h-full flex flex-col items-center justify-center w-full max-w-xl mx-auto">
                        <div className="flex items-center justify-between w-full mb-4">
                            <button onClick={() => goToExerciseIndex(activeWorkout.currentExerciseIndex - 1)} disabled={activeWorkout.currentExerciseIndex === 0} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="text-sm font-bold text-blue-500 uppercase tracking-widest">Exercise {activeWorkout.currentExerciseIndex + 1} of {routineExercises.length}</div>
                            <button onClick={() => goToExerciseIndex(activeWorkout.currentExerciseIndex + 1)} disabled={activeWorkout.currentExerciseIndex === routineExercises.length - 1} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <h2 className="text-3xl mx-8 font-extrabold text-slate-800 mb-6 leading-tight text-center">{currentExercise.name}</h2>

                        {currentSetsCompleted >= currentExercise.setCount ? (
                            <div className="w-full p-4 bg-green-50 rounded-2xl border border-green-100 mb-6 text-center">
                                <div className="text-green-600 font-bold mb-1">Exercise complete</div>
                                <div className="text-green-700 text-sm">You&apos;ve completed {currentSetsCompleted} sets for this exercise.</div>
                                {firstUncompletedIndex >= 0 && firstUncompletedIndex !== activeWorkout.currentExerciseIndex && (
                                    <button onClick={goToFirstUncompletedExercise} className="mt-4 text-xs font-bold text-green-700 bg-white px-3 py-1.5 rounded shadow-sm border border-green-200">Go to first unfinished exercise</button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-center gap-4 w-full mb-8">
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Set</div>
                                        <div className="text-xl font-bold text-slate-800">{currentSetsCompleted + 1} <span className="text-sm text-slate-400 font-medium">/ {currentExercise.setCount}</span></div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reps</div>
                                        <div className="text-xl font-bold text-slate-800">{currentExercise.targetReps || '-'}</div>
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-2xl border border-blue-200 shadow-sm shadow-blue-100">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 text-center">Target</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="number"
                                                value={parsedTarget.value || ''}
                                                onChange={e => handleTargetChange(`${e.target.value}${parsedTarget.unit}`)}
                                                onFocus={(e) => e.currentTarget.dataset.oldValue = e.currentTarget.value}
                                                onBlur={(e) => handleTargetBlur(`${e.currentTarget.dataset.oldValue || 0}${parsedTarget.unit}`, `${e.currentTarget.value}${parsedTarget.unit}`)}
                                                className="w-16 text-center text-xl font-bold text-slate-800 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="0"
                                            />
                                            <select
                                                value={parsedTarget.unit}
                                                onChange={e => handleTargetChange(`${parsedTarget.value}${e.target.value}`)}
                                                className="text-sm font-bold text-slate-500 bg-transparent focus:outline-none appearance-none cursor-pointer hover:text-blue-600"
                                            >
                                                <option value="kg">kg</option>
                                                <option value="mins">mins</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {currentExercise.notes && (
                                    <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium text-left w-full">
                                        {currentExercise.notes}
                                    </div>
                                )}

                                <button onClick={handleCompleteSet} className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Complete Set
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
