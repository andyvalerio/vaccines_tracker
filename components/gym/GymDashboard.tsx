import React, { useState, useEffect, useCallback } from 'react';
import { Account, GymDay } from '../../types';
import { StorageService } from '../../services/storageService';
import WorkoutEditor from './WorkoutEditor';
import ActiveWorkout from './ActiveWorkout';
import WorkoutHistory from './WorkoutHistory';
import ExerciseProgressView from './ExerciseProgressView';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';

type GymView = 'dashboard' | 'editor' | 'workout' | 'history' | 'exercise-progress';

interface GymDashboardProps {
    account: Account;
}

export default function GymDashboard({ account }: GymDashboardProps) {
    const [activeView, setActiveViewState] = useState<GymView>('dashboard');
    const [days, setDays] = useState<GymDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);

    const { activeWorkout, setActiveWorkout } = useWorkoutSession();

    const navigateTo = useCallback((view: GymView, backView: GymView = 'dashboard') => {
        window.history.pushState({ gymView: view, gymBackView: backView }, '');
        setActiveViewState(view);
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const backView = (event.state?.gymBackView as GymView) || 'dashboard';
            setActiveViewState(backView);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    useEffect(() => {
        const unsubscribe = StorageService.subscribeGymDays(account.id, (loadedDays) => {
            setDays(loadedDays);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [account.id]);

    useEffect(() => {
        if (loading || !activeWorkout) return;
        const routineExists = days.some(day => day.id === activeWorkout.dayId);
        if (!routineExists) {
            setActiveWorkout(null);
            setActiveViewState('dashboard');
        }
    }, [loading, activeWorkout, days, setActiveWorkout]);

    const startWorkout = (dayId: string) => {
        const now = Date.now();
        setActiveWorkout({
            startedAt: now,
            dayId,
            currentExerciseIndex: 0,
            completedSetsByExercise: {},
            status: 'active',
            setStartedAt: now,
        });
        navigateTo('workout');
    };

    const finishWorkout = () => {
        setActiveWorkout(null);
        navigateTo('history');
    };

    const openExerciseProgress = (exerciseName: string) => {
        setSelectedExerciseName(exerciseName);
        navigateTo('exercise-progress', 'history');
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        }
    };

    const activeDayName = activeWorkout ? days.find(d => d.id === activeWorkout.dayId)?.name : null;

    if (activeView === 'editor') return <WorkoutEditor accountId={account.id} onBack={() => navigateTo('dashboard')} onViewProgress={openExerciseProgress} />;
    if (activeView === 'workout' && activeWorkout) return <ActiveWorkout accountId={account.id} onFinish={finishWorkout} />;
    if (activeView === 'history') return <WorkoutHistory accountId={account.id} onBack={() => navigateTo('dashboard')} onOpenExerciseProgress={openExerciseProgress} />;
    if (activeView === 'exercise-progress' && selectedExerciseName) return <ExerciseProgressView accountId={account.id} exerciseName={selectedExerciseName} onBack={() => navigateTo('history')} />;

    return (
        <div className="space-y-6 animate-fade-in shadow-none p-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800">Gym Tracker</h2>
                    {deferredPrompt && (
                        <button onClick={handleInstallClick} className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2 py-1 rounded-md hover:bg-amber-200 transition-colors">
                            Install App
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigateTo('history')} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">
                        History
                    </button>
                    <button onClick={() => navigateTo('editor')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                        Routines
                    </button>
                </div>
            </div>

            {activeDayName && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Active Session</div>
                        <div className="font-bold text-slate-800">{activeDayName}</div>
                    </div>
                    <button onClick={() => navigateTo('workout')} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-md shrink-0">
                        Resume
                    </button>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Start a Workout</h3>
                <p className="text-slate-500 mb-6 text-sm">Select one of your curated routines to begin tracking.</p>

                {loading ? (
                    <div className="animate-pulse text-slate-400 font-medium">Loading routines...</div>
                ) : days.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-slate-300 bg-slate-50 rounded-xl">
                        <p className="text-slate-500 mb-4 font-medium">You have no routines.</p>
                        <button onClick={() => navigateTo('editor')} className="text-blue-600 font-bold hover:text-blue-800 hover:underline">Create Routine Now</button>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {days.map(day => (
                            <div key={day.id} className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex justify-between items-center hover:bg-white hover:shadow-md transition-all">
                                <div>
                                    <div className="font-bold text-slate-800 text-lg">{day.name}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-0.5 tracking-wide uppercase">{day.exerciseIds?.length || 0} Exercises</div>
                                </div>
                                <button onClick={() => startWorkout(day.id)} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:origin-top hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-blue-600/30">
                                    Start
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
