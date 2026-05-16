import React, { useState, useEffect } from 'react';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import { GymDay, GymExercise } from '../../types';
import { getGymDays, getGymExercises, saveWorkoutSession, saveGymExercise } from '../../services/gymService';
import { functions } from '../../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { getMessaging, getToken } from 'firebase/messaging';

export default function ActiveWorkout({ onFinish }: { onFinish: () => void }) {
    const { activeWorkout, setActiveWorkout } = useWorkoutSession();
    const [day, setDay] = useState<GymDay | null>(null);
    const [exercises, setExercises] = useState<GymExercise[]>([]);
    const [loading, setLoading] = useState(true);

    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [messagingToken, setMessagingToken] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [d, e] = await Promise.all([getGymDays(), getGymExercises()]);
            if (activeWorkout) {
                setDay(d.find(x => x.id === activeWorkout.dayId) || null);
                setExercises(e);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Timer rendering
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeWorkout?.status === 'resting' && activeWorkout.restEndsAt) {
            interval = setInterval(() => {
                const left = Math.max(0, Math.floor((activeWorkout.restEndsAt! - Date.now()) / 1000));
                setTimeLeft(left);
                if (left === 0) {
                    setActiveWorkout({ ...activeWorkout, status: 'active', restEndsAt: undefined });
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeWorkout]);

    const requestNotificationToken = async () => {
        try {
            const messaging = getMessaging();
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const swPath = import.meta.env.BASE_URL + 'firebase-messaging-sw.js';
                const registration = await navigator.serviceWorker.register(swPath);
                const token = await getToken(messaging, { serviceWorkerRegistration: registration });
                setMessagingToken(token);
                return token;
            }
        } catch (e) {
            console.warn("Push notifications not supported or permitted", e);
        }
        return null;
    };

    if (loading || !activeWorkout || !day) return <div className="animate-pulse p-4 text-slate-500">Loading workout...</div>;

    const routineExercises = day.exerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean) as GymExercise[];
    if (routineExercises.length === 0) {
        return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Routine has no valid exercises. <button onClick={onFinish} className="underline font-bold ml-2">End Session</button></div>;
    }

    const currentExercise = routineExercises[activeWorkout.currentExerciseIndex];
    if (!currentExercise) return <div className="p-4">Error loading exercise</div>;

    const currentSetsCompleted = (activeWorkout.completedSetsByExercise || {})[currentExercise.id] || 0;
    const currentSetTargetIndex = Math.min(currentSetsCompleted, currentExercise.setCount - 1);
    const currentSetTarget = (currentExercise.setTargets || [])[currentSetTargetIndex] || '';
    const parsedVal = parseFloat(currentSetTarget) || 0;
    const unitMatch = currentSetTarget.match(/[a-zA-Z]+/);
    const parsedUnit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';

    const handleTargetChange = (newTarget: string) => {
        const updatedExercises = [...exercises];
        const idx = updatedExercises.findIndex(ex => ex.id === currentExercise.id);

        // Deep copy to not mutate react state improperly
        const updatedEx = { ...updatedExercises[idx] };
        updatedEx.setTargets = [...(updatedEx.setTargets || [])];
        updatedEx.setTargets[currentSetTargetIndex] = newTarget;

        updatedExercises[idx] = updatedEx;
        setExercises(updatedExercises);
    };

    const handleTargetBlur = async (oldTarget: string, newTarget: string) => {
        if (oldTarget === newTarget) return;

        // Parse numbers to decide if they increased
        const oldNum = parseFloat(oldTarget) || 0;
        const newNum = parseFloat(newTarget) || 0;

        if (newNum > oldNum) {
            // Safe to save globally
            const idx = exercises.findIndex(ex => ex.id === currentExercise.id);
            const updatedEx = exercises[idx];
            try {
                await saveGymExercise(updatedEx);
                // Optional: You could show a small toast here marking "Global target increased"
            } catch (e) {
                console.error("Failed to update gym exercise globally", e);
            }
        }
    };

    const handleCompleteSet = async () => {
        let nextSetCount = currentSetsCompleted + 1;
        let nextExIndex = activeWorkout.currentExerciseIndex;

        let newCompletedMap = { ...(activeWorkout.completedSetsByExercise || {}), [currentExercise.id]: nextSetCount };

        const restSeconds = currentExercise.restTimeSeconds;
        const endsAt = Date.now() + restSeconds * 1000;

        let newStatus: 'active' | 'resting' = 'resting';

        if (nextSetCount >= currentExercise.setCount) {
            if (nextExIndex < routineExercises.length - 1) {
                nextExIndex++;
            }
        }

        setActiveWorkout({
            ...activeWorkout,
            completedSetsByExercise: newCompletedMap,
            currentExerciseIndex: nextExIndex,
            status: newStatus,
            restEndsAt: endsAt
        });
        setTimeLeft(restSeconds);

        try {
            const token = messagingToken || await requestNotificationToken();
            if (token && restSeconds > 0) {
                const scheduleGymRestTimer = httpsCallable(functions, 'scheduleGymRestTimer');
                scheduleGymRestTimer({ deviceToken: token, restTimeSeconds: restSeconds });
            }
        } catch (err) { }
    };

    const handleSaveAndCompleteSession = async () => {
        try {
            await saveWorkoutSession({
                id: '',
                startedAt: activeWorkout.startedAt,
                endedAt: Date.now(),
                dayId: day.id,
                dayName: day.name,
                exercisesCompleted: routineExercises.map(ex => {
                    const repsCompleted = (activeWorkout.completedSetsByExercise || {})[ex.id] || 0;
                    if (repsCompleted === 0) return null;
                    return {
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                        reps: repsCompleted * ex.targetReps
                    };
                }).filter(Boolean) as any[]
            });
        } catch (err) {
            console.error("Failed to save history", err);
        }
        onFinish();
    };

    const skipRest = () => {
        setActiveWorkout({ ...activeWorkout, status: 'active', restEndsAt: undefined });
    };

    const goToPrevExercise = () => {
        if (activeWorkout.currentExerciseIndex > 0) {
            setActiveWorkout({ ...activeWorkout, currentExerciseIndex: activeWorkout.currentExerciseIndex - 1 });
        }
    };

    const goToNextExercise = () => {
        if (activeWorkout.currentExerciseIndex < routineExercises.length - 1) {
            setActiveWorkout({ ...activeWorkout, currentExerciseIndex: activeWorkout.currentExerciseIndex + 1 });
        }
    };

    const isResting = activeWorkout.status === 'resting';
    const totalSets = routineExercises.reduce((acc, ex) => acc + ex.setCount, 0);
    const totalSetsCompleted = Object.values(activeWorkout.completedSetsByExercise || {}).reduce((a, b) => a + Number(b), 0);
    const progress = Math.min(100, Math.round((totalSetsCompleted / Math.max(totalSets, 1)) * 100));

    return (
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden min-h-[70vh] flex flex-col items-center justify-center p-8 relative">

            <button onClick={handleSaveAndCompleteSession} className="absolute top-4 left-4 text-xs font-bold text-white bg-green-600 px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                Save & Complete
            </button>

            {!messagingToken && (
                <button onClick={requestNotificationToken} className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                    Enable Notifications
                </button>
            )}

            {/* Progress Indicator */}
            <div className="w-full max-w-sm mb-12 mt-8">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    <span>{day.name}</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-blue-600 h-full transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Main Display */}
            <div className="text-center transition-all w-full flex-1 flex flex-col justify-center">
                {isResting ? (
                    <div className="animate-fade-in flex flex-col items-center justify-center">
                        <div className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-4">Rest Interval</div>
                        <div className="text-7xl font-light text-slate-800 tracking-tighter tabular-nums mb-8">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
                        <button onClick={skipRest} className="text-slate-500 font-bold hover:text-slate-800 transition-colors bg-slate-100 px-6 py-2 rounded-full">Skip Rest</button>
                    </div>
                ) : (
                    <div className="animate-fade-in flex flex-col items-center justify-center w-full max-w-sm mx-auto relative">

                        {/* Navigation Arrows */}
                        <div className="flex items-center justify-between w-full mb-2">
                            <button onClick={goToPrevExercise} disabled={activeWorkout.currentExerciseIndex === 0} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="text-sm font-bold text-blue-500 uppercase tracking-widest">Exercise {activeWorkout.currentExerciseIndex + 1} of {routineExercises.length}</div>
                            <button onClick={goToNextExercise} disabled={activeWorkout.currentExerciseIndex === routineExercises.length - 1} className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        <h2 className="text-3xl mx-8 font-extrabold text-slate-800 mb-8 leading-tight">{currentExercise.name}</h2>

                        {currentSetsCompleted >= currentExercise.setCount ? (
                            <div className="w-full p-4 bg-green-50 rounded-2xl border border-green-100 mb-8">
                                <div className="text-green-600 font-bold mb-1">Target Meets!</div>
                                <div className="text-green-700 text-sm">You've completed {currentSetsCompleted} sets for this exercise.</div>
                                <button onClick={handleCompleteSet} className="mt-4 text-xs font-bold text-green-700 bg-white px-3 py-1.5 rounded shadow-sm border border-green-200">+ Do extra set</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-center gap-6 w-full mb-12">
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Set</div>
                                        <div className="text-xl font-bold text-slate-800">{currentSetsCompleted + 1} <span className="text-sm text-slate-400 font-medium">/ {currentExercise.setCount}</span></div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reps</div>
                                        <div className="text-xl font-bold text-slate-800">{currentExercise.targetReps || '-'}</div>
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-2xl border border-blue-200 shadow-sm shadow-blue-100 relative group transition-all">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 text-center">Target</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="number"
                                                value={parsedVal || ''}
                                                onChange={e => handleTargetChange(`${e.target.value}${parsedUnit}`)}
                                                onFocus={(e) => e.target.dataset.oldValue = e.target.value}
                                                onBlur={(e) => handleTargetBlur(`${e.target.dataset.oldValue || 0}${parsedUnit}`, `${e.target.value}${parsedUnit}`)}
                                                className="w-16 text-center text-xl font-bold text-slate-800 border-b-2 border-transparent focus:border-blue-500 focus:outline-none bg-transparent"
                                                placeholder="0"
                                            />
                                            <select
                                                value={parsedUnit}
                                                onChange={e => handleTargetChange(`${parsedVal}${e.target.value}`)}
                                                className="text-sm font-bold text-slate-500 bg-transparent focus:outline-none appearance-none cursor-pointer hover:text-blue-600"
                                            >
                                                <option value="kg">kg</option>
                                                <option value="mins">mins</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {currentExercise.notes && (
                                    <div className="mb-12 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium text-left w-full">
                                        💡 {currentExercise.notes}
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

            <button onClick={() => { if (confirm("Are you sure you want to abandon this session? Progress will be lost.")) onFinish(); }} className="mt-8 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">
                Abandon Session
            </button>

        </div>
    );
}
