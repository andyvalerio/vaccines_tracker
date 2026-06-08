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

const getCompletedSetCount = (workout: ActiveWorkoutState, exerciseId: string) =>
    (workout.completedSetsByExercise || {})[exerciseId] || 0;

const isExerciseComplete = (workout: ActiveWorkoutState, exercise: GymExercise) =>
    getCompletedSetCount(workout, exercise.id) >= exercise.setCount;

const getFirstUncompletedExerciseIndex = (routineExercises: GymExercise[], workout: ActiveWorkoutState) =>
    routineExercises.findIndex(exercise => !isExerciseComplete(workout, exercise));

const parseTarget = (target: string) => {
    const value = parseFloat(target) || 0;
    const unitMatch = target.match(/[a-zA-Z]+/);
    const unit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';
    const metric = unit.includes('min') ? 'duration' as const : 'weight' as const;
    return { value, unit, metric };
};

const buildExerciseSummary = (
    exercise: GymExercise,
    completedSets: number,
    actualDurations?: number[]
): WorkoutHistorySet => {
    const completedTargets = safeArray(exercise.setTargets).slice(0, completedSets);
    const parsedTargets = completedTargets.map(parseTarget);
    const metric = parsedTargets.some(t => t.metric === 'duration') ? 'duration' as const : 'weight' as const;
    const unit = parsedTargets[0]?.unit || 'kg';

    let totalVolume: number;
    if (metric === 'duration') {
        totalVolume = parsedTargets.reduce((sum, t, i) =>
            sum + Math.max(t.value, actualDurations?.[i] ?? 0), 0);
    } else {
        totalVolume = parsedTargets.reduce((sum, t) => sum + t.value * exercise.targetReps, 0);
    }

    return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        completedSets,
        targetReps: exercise.targetReps,
        totalReps: completedSets * exercise.targetReps,
        totalVolume,
        unit,
        metric,
        setTargets: completedTargets,
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
        const unsubDays = StorageService.subscribeGymDays(accountId, (loadedDays) => {
            setDays(loadedDays);
            setLoading(false);
        });
        const unsubExercises = StorageService.subscribeGymExercises(accountId, setExercises);
        return () => { unsubDays(); unsubExercises(); };
    }, [accountId]);

    const day = useMemo(() => {
        if (!activeWorkout) return null;
        return days.find(d => d.id === activeWorkout.dayId) || null;
    }, [activeWorkout, days]);

    const routineExercises = useMemo(() => {
        if (!day) return [];
        return safeArray(day.exerciseIds)
            .map(id => safeArray(exercises).find(e => e.id === id))
            .filter(Boolean) as GymExercise[];
    }, [day, exercises]);

    useEffect(() => {
        if (loading || !activeWorkout) return;
        if (!day) onFinish();
    }, [loading, activeWorkout, day, onFinish]);

    // Safety guard: keep index in bounds
    useEffect(() => {
        if (!activeWorkout || routineExercises.length === 0 || activeWorkout.status === 'completed') return;
        if (activeWorkout.currentExerciseIndex >= routineExercises.length) {
            const idx = getFirstUncompletedExerciseIndex(routineExercises, activeWorkout);
            if (idx >= 0) setActiveWorkout({ ...activeWorkout, currentExerciseIndex: idx });
        }
    }, [activeWorkout, routineExercises, setActiveWorkout]);

    // Rest timer countdown
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (activeWorkout?.status === 'resting' && activeWorkout.restEndsAt) {
            interval = setInterval(() => {
                const left = Math.max(0, Math.ceil((activeWorkout.restEndsAt! - Date.now()) / 1000));
                setTimeLeft(left);
                if (left <= 0) {
                    const allDone = getFirstUncompletedExerciseIndex(routineExercises, activeWorkout) === -1;
                    const now = Date.now();
                    setActiveWorkout({
                        ...activeWorkout,
                        status: allDone ? 'completed' : 'active',
                        // currentExerciseIndex was already set correctly when entering rest; respect any manual navigation the user did during the rest
                        restEndsAt: undefined,
                        completedAt: allDone ? now : activeWorkout.completedAt,
                        setStartedAt: allDone ? activeWorkout.setStartedAt : now,
                    });
                }
            }, 1000);
        } else {
            setTimeLeft(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [activeWorkout, routineExercises, setActiveWorkout]);

    // Rest-complete sound/vibrate cue
    useEffect(() => {
        const prev = previousStatusRef.current;
        const cur = activeWorkout?.status || null;
        if (prev === 'resting' && cur && cur !== 'resting' && document.visibilityState === 'visible') {
            NotificationService.playForegroundTimerComplete();
            NotificationService.vibrateTimerComplete();
            setShowRestCompleteCue(true);
            window.setTimeout(() => setShowRestCompleteCue(false), 3200);
        }
        previousStatusRef.current = cur;
    }, [activeWorkout?.status]);

    const firstUncompletedIndex = activeWorkout
        ? getFirstUncompletedExerciseIndex(routineExercises, activeWorkout)
        : -1;

    const currentExercise = activeWorkout && routineExercises[activeWorkout.currentExerciseIndex]
        ? routineExercises[activeWorkout.currentExerciseIndex]
        : null;

    const lastCompletedExercise = activeWorkout?.lastCompletedExerciseId
        ? routineExercises.find(e => e.id === activeWorkout.lastCompletedExerciseId) || null
        : null;

    const totalSets = routineExercises.reduce((sum, e) => sum + e.setCount, 0);
    const totalSetsCompleted = activeWorkout
        ? Object.values(activeWorkout.completedSetsByExercise || {}).reduce((s, v) => s + Number(v), 0)
        : 0;
    const progress = Math.min(100, Math.round((totalSetsCompleted / Math.max(totalSets, 1)) * 100));

    const requestNotificationToken = async () => {
        const token = await NotificationService.requestPushToken();
        setMessagingToken(token);
        return token;
    };

    const handleTargetChange = (newTarget: string) => {
        if (!currentExercise || !activeWorkout) return;
        const updatedExercises = safeArray(exercises).map(exercise => {
            if (exercise.id !== currentExercise.id) return exercise;
            const targets = [...safeArray(exercise.setTargets)];
            const idx = Math.min(getCompletedSetCount(activeWorkout, exercise.id), exercise.setCount - 1);
            targets[idx] = newTarget;
            return { ...exercise, setTargets: targets };
        });
        setExercises(updatedExercises);
    };

    const handleTargetBlur = async (oldTarget: string, newTarget: string) => {
        if (!currentExercise || oldTarget === newTarget) return;
        if ((parseFloat(newTarget) || 0) <= (parseFloat(oldTarget) || 0)) return;
        const updated = safeArray(exercises).find(e => e.id === currentExercise.id);
        if (!updated) return;
        try {
            await StorageService.updateGymExercise(accountId, updated);
        } catch (err) {
            console.error('Failed to update exercise globally', err);
        }
    };

    const goToExerciseIndex = (index: number) => {
        if (!activeWorkout || index < 0 || index >= routineExercises.length) return;
        setActiveWorkout({ ...activeWorkout, currentExerciseIndex: index });
    };

    const handleSwipeStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setTouchStartX(e.touches[0]?.clientX || null);
    };

    const handleSwipeEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!activeWorkout || touchStartX === null) return;
        const delta = (e.changedTouches[0]?.clientX || touchStartX) - touchStartX;
        setTouchStartX(null);
        if (Math.abs(delta) < 40) return;
        goToExerciseIndex(activeWorkout.currentExerciseIndex + (delta < 0 ? 1 : -1));
    };

    const handleCompleteSet = async () => {
        if (!activeWorkout || !currentExercise) return;

        const setsCompleted = getCompletedSetCount(activeWorkout, currentExercise.id);
        const currentTargetIdx = Math.min(setsCompleted, currentExercise.setCount - 1);
        const currentSetTarget = safeArray(currentExercise.setTargets)[currentTargetIdx] || '';
        const isTimeBased = parseTarget(currentSetTarget).metric === 'duration';

        // Record actual duration for time-based sets
        let updatedActualDurations = activeWorkout.actualSetDurations;
        if (isTimeBased && activeWorkout.setStartedAt) {
            const elapsed = Math.round((Date.now() - activeWorkout.setStartedAt) / 1000);
            updatedActualDurations = {
                ...(activeWorkout.actualSetDurations || {}),
                [currentExercise.id]: [
                    ...(activeWorkout.actualSetDurations?.[currentExercise.id] || []),
                    elapsed,
                ],
            };
        }

        const completedSetsByExercise = {
            ...(activeWorkout.completedSetsByExercise || {}),
            [currentExercise.id]: setsCompleted + 1,
        };
        const updatedWorkout: ActiveWorkoutState = {
            ...activeWorkout,
            completedSetsByExercise,
            lastCompletedExerciseId: currentExercise.id,
            actualSetDurations: updatedActualDurations,
        };

        const firstRemainingIdx = getFirstUncompletedExerciseIndex(routineExercises, updatedWorkout);
        const allDone = firstRemainingIdx === -1;
        const now = Date.now();

        if (allDone) {
            setActiveWorkout({ ...updatedWorkout, status: 'completed', restEndsAt: undefined, completedAt: now });
            return;
        }

        // Stay on the current exercise if it still has sets remaining; only jump away when it's fully done
        const currentExerciseStillHasSets = !isExerciseComplete(updatedWorkout, currentExercise);
        const nextIndex = currentExerciseStillHasSets ? activeWorkout.currentExerciseIndex : firstRemainingIdx;

        if (currentExercise.restTimeSeconds <= 0) {
            setActiveWorkout({ ...updatedWorkout, currentExerciseIndex: nextIndex, status: 'active', restEndsAt: undefined, setStartedAt: now });
            return;
        }

        setActiveWorkout({ ...updatedWorkout, currentExerciseIndex: nextIndex, status: 'resting', restEndsAt: now + currentExercise.restTimeSeconds * 1000 });
        setTimeLeft(currentExercise.restTimeSeconds);

        try {
            const token = messagingToken || await requestNotificationToken();
            if (token) await NotificationService.scheduleRestNotification(token, currentExercise.restTimeSeconds);
        } catch (err) {
            console.warn('Failed to schedule rest notification', err);
        }
    };

    const skipRest = () => {
        if (!activeWorkout) return;
        const allDone = firstUncompletedIndex === -1;
        const now = Date.now();
        setActiveWorkout({
            ...activeWorkout,
            // currentExerciseIndex is already correct (set when entering rest)
            status: allDone ? 'completed' : 'active',
            restEndsAt: undefined,
            completedAt: allDone ? now : activeWorkout.completedAt,
            setStartedAt: allDone ? activeWorkout.setStartedAt : now,
        });
    };

    const handleSaveAndCompleteSession = async () => {
        if (!activeWorkout || !day) return;
        try {
            const exercisesCompleted = routineExercises
                .map(exercise => {
                    const done = getCompletedSetCount(activeWorkout, exercise.id);
                    if (done === 0) return null;
                    return buildExerciseSummary(exercise, done, activeWorkout.actualSetDurations?.[exercise.id]);
                })
                .filter(Boolean) as WorkoutHistorySet[];

            await StorageService.addWorkoutSession(accountId, {
                id: '',
                startedAt: activeWorkout.startedAt,
                endedAt: Date.now(),
                dayId: day.id,
                dayName: day.name,
                status: activeWorkout.status === 'completed' ? 'completed' : 'abandoned',
                exercisesCompleted,
            });
        } catch (err) {
            console.error('Failed to save session', err);
        }
        onFinish();
    };

    const abandonSession = () => {
        if (confirm('Abandon this session? Progress will be lost.')) onFinish();
    };

    if (loading || !activeWorkout) return <div className="animate-pulse p-4 text-slate-500">Loading workout...</div>;
    if (routineExercises.length === 0) return (
        <div className="p-4 text-red-500 bg-red-50 rounded-xl">
            Routine has no valid exercises.
            <button onClick={onFinish} className="underline font-bold ml-2">End Session</button>
        </div>
    );
    if (!currentExercise) return <div className="p-4 text-slate-500">Loading exercise...</div>;

    const currentSetsCompleted = getCompletedSetCount(activeWorkout, currentExercise.id);
    const currentSetTargetIndex = Math.min(currentSetsCompleted, currentExercise.setCount - 1);
    const currentSetTarget = safeArray(currentExercise.setTargets)[currentSetTargetIndex] || '';
    const parsedTarget = parseTarget(currentSetTarget);
    const isResting = activeWorkout.status === 'resting';
    const isCompleted = activeWorkout.status === 'completed';

    // Weight for "up next" during rest — currentExercise IS the first uncompleted after the jump
    const upNextSetsCompleted = getCompletedSetCount(activeWorkout, currentExercise.id);
    const upNextTargetIdx = Math.min(upNextSetsCompleted, currentExercise.setCount - 1);
    const upNextWeight = safeArray(currentExercise.setTargets)[upNextTargetIdx] || '';

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-4 sm:p-5 relative flex flex-col gap-3 min-h-[75dvh]">
            {showRestCompleteCue && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-600/10 backdrop-blur-[1px] pointer-events-none rounded-3xl">
                    <div className="relative text-center animate-fade-in">
                        <div className="absolute -inset-10 rounded-full border-8 border-blue-300/60 animate-ping" />
                        <div className="absolute -inset-20 rounded-full border-4 border-emerald-300/40 animate-ping [animation-delay:180ms]" />
                        <div className="relative bg-white shadow-2xl border border-blue-100 rounded-3xl px-8 py-6">
                            <div className="text-xs font-black uppercase tracking-[0.35em] text-blue-600 mb-2">Rest Over</div>
                            <div className="text-3xl font-extrabold text-slate-900 mb-2">Time for your next set</div>
                            <div className="text-slate-500 font-medium">{currentExercise.name} is ready.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header — day name with subtle icon actions */}
            {!isCompleted && (
                <div className="flex items-center justify-between gap-2">
                    <button
                        onClick={abandonSession}
                        title="Abandon session"
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="font-bold text-slate-800 text-sm truncate">{day?.name}</div>
                    <button
                        onClick={handleSaveAndCompleteSession}
                        title="Save & complete session"
                        className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Progress bar */}
            <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    <span>{day?.name}</span>
                    <span>{totalSetsCompleted}/{totalSets} sets · {progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Exercise pills — horizontally scrollable, with weight label */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 flex-nowrap -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {routineExercises.map((exercise, index) => {
                    const done = isExerciseComplete(activeWorkout, exercise);
                    const isCurrent = index === activeWorkout.currentExerciseIndex && !isResting;
                    const isJustCompleted = exercise.id === activeWorkout.lastCompletedExerciseId && isResting;
                    const setsCompleted = getCompletedSetCount(activeWorkout, exercise.id);
                    const weightIdx = Math.min(setsCompleted, exercise.setCount - 1);
                    const weight = safeArray(exercise.setTargets)[weightIdx] || '';
                    return (
                        <button
                            key={exercise.id}
                            onClick={() => goToExerciseIndex(index)}
                            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                                isJustCompleted ? 'bg-blue-600 text-white' :
                                isCurrent ? 'bg-slate-900 text-white' :
                                done ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-slate-100 text-slate-600'
                            }`}
                        >
                            <div className="text-[11px] font-bold leading-tight">{index + 1}. {exercise.name}</div>
                            {weight && <div className="text-[10px] opacity-60 leading-tight font-medium">{weight}</div>}
                        </button>
                    );
                })}
            </div>

            {/* Main content area */}
            <div
                className="flex-1 min-h-0"
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
            >
                {isCompleted ? (
                    <div className="relative h-full overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8 text-center shadow-inner flex flex-col items-center justify-center gap-4">
                        <div className="absolute top-6 left-8 w-6 h-6 rounded-full bg-amber-300 animate-bounce" />
                        <div className="absolute top-10 right-10 w-4 h-4 rounded-full bg-blue-300 animate-ping" />
                        <div className="absolute bottom-10 left-1/4 w-5 h-5 rounded-full bg-emerald-300 animate-pulse" />
                        <div className="absolute bottom-8 right-1/4 w-3 h-3 rounded-full bg-pink-300 animate-bounce" />
                        <div className="text-xs font-black uppercase tracking-[0.45em] text-emerald-600">Session Complete</div>
                        <h2 className="text-4xl font-extrabold text-slate-900">Workout finished</h2>
                        <p className="text-slate-600 max-w-lg mx-auto">Every exercise completed. Save it now while it&apos;s fresh.</p>
                        <button
                            onClick={handleSaveAndCompleteSession}
                            className="w-full max-w-md py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xl rounded-3xl shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Save Workout
                        </button>
                        <button onClick={abandonSession} className="text-xs text-slate-400 hover:text-red-500 font-bold transition-colors">
                            Abandon instead
                        </button>
                    </div>

                ) : isResting ? (
                    <div className="animate-fade-in h-full flex flex-col gap-3">
                        {/* Timer */}
                        <div className="text-center pt-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
                                Rest · {lastCompletedExercise?.name ?? 'Set done'}
                            </div>
                            <div className="text-6xl font-light text-slate-800 tracking-tighter tabular-nums leading-none">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                            {lastCompletedExercise && (
                                <div className="text-[11px] text-slate-400 mt-1">
                                    {Math.min(getCompletedSetCount(activeWorkout, lastCompletedExercise.id), lastCompletedExercise.setCount)}/{lastCompletedExercise.setCount} sets done
                                </div>
                            )}
                        </div>

                        {/* Up Next — prominently shows weight */}
                        <div className="flex-1 rounded-2xl border border-blue-100 bg-blue-50 p-4 flex flex-col justify-center min-h-0">
                            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Up Next</div>
                            {currentExercise ? (
                                <>
                                    <div className="text-xl font-extrabold text-slate-900 leading-tight">{currentExercise.name}</div>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className="text-sm text-slate-500">
                                            Set {upNextSetsCompleted + 1}/{currentExercise.setCount} · {currentExercise.targetReps} reps
                                        </span>
                                        {upNextWeight && (
                                            <span className="px-3 py-0.5 bg-blue-600 text-white text-sm font-extrabold rounded-full">
                                                {upNextWeight}
                                            </span>
                                        )}
                                    </div>
                                    {currentExercise.notes && (
                                        <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2">
                                            {currentExercise.notes}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-lg font-bold text-slate-700">Last set — almost there!</div>
                            )}
                        </div>

                        {/* Buttons — always at the bottom, never scrolled away */}
                        <div className="flex gap-2">
                            <button
                                onClick={skipRest}
                                className="flex-1 py-3 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-2xl hover:bg-slate-50 transition-colors"
                            >
                                Skip Rest
                            </button>
                            {!messagingToken && (
                                <button
                                    onClick={requestNotificationToken}
                                    className="px-4 py-3 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors"
                                >
                                    Notify me
                                </button>
                            )}
                        </div>
                    </div>

                ) : (
                    <div className="animate-fade-in h-full flex flex-col items-center justify-center w-full max-w-xl mx-auto gap-4">
                        <div className="flex items-center justify-between w-full">
                            <button
                                onClick={() => goToExerciseIndex(activeWorkout.currentExerciseIndex - 1)}
                                disabled={activeWorkout.currentExerciseIndex === 0}
                                className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="text-sm font-bold text-blue-500 uppercase tracking-widest">
                                Exercise {activeWorkout.currentExerciseIndex + 1} of {routineExercises.length}
                            </div>
                            <button
                                onClick={() => goToExerciseIndex(activeWorkout.currentExerciseIndex + 1)}
                                disabled={activeWorkout.currentExerciseIndex === routineExercises.length - 1}
                                className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <h2 className="text-3xl font-extrabold text-slate-800 leading-tight text-center px-4">
                            {currentExercise.name}
                        </h2>

                        {currentSetsCompleted >= currentExercise.setCount ? (
                            <div className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                <div className="text-emerald-600 font-bold mb-1">Exercise complete</div>
                                <div className="text-emerald-700 text-sm">{currentSetsCompleted} sets done.</div>
                                {firstUncompletedIndex >= 0 && firstUncompletedIndex !== activeWorkout.currentExerciseIndex && (
                                    <button
                                        onClick={() => goToExerciseIndex(firstUncompletedIndex)}
                                        className="mt-3 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-emerald-200"
                                    >
                                        Go to first unfinished
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-center gap-3 w-full">
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Set</div>
                                        <div className="text-xl font-bold text-slate-800">
                                            {currentSetsCompleted + 1} <span className="text-sm text-slate-400 font-medium">/ {currentExercise.setCount}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reps</div>
                                        <div className="text-xl font-bold text-slate-800">{currentExercise.targetReps || '—'}</div>
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-2xl border border-blue-200 shadow-sm shadow-blue-100">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 text-center">Target</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="number"
                                                value={parsedTarget.value || ''}
                                                onChange={e => handleTargetChange(`${e.target.value}${parsedTarget.unit}`)}
                                                onFocus={e => { e.currentTarget.dataset.oldValue = e.currentTarget.value; }}
                                                onBlur={e => handleTargetBlur(`${e.currentTarget.dataset.oldValue || 0}${parsedTarget.unit}`, `${e.currentTarget.value}${parsedTarget.unit}`)}
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
                                    <div className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium">
                                        {currentExercise.notes}
                                    </div>
                                )}

                                <button
                                    onClick={handleCompleteSet}
                                    className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
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
