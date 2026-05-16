import React, { useState, useEffect } from 'react';
import { Account, GymDay } from '../../types';
import { getGymDays } from '../../services/gymService';
import WorkoutEditor from './WorkoutEditor';
import ActiveWorkout from './ActiveWorkout';
import WorkoutHistory from './WorkoutHistory';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';

interface GymDashboardProps {
    account: Account;
}

export default function GymDashboard({ account }: GymDashboardProps) {
    const [activeView, setActiveView] = useState<'dashboard' | 'editor' | 'workout' | 'history'>('dashboard');
    const [days, setDays] = useState<GymDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const { activeWorkout, setActiveWorkout } = useWorkoutSession();

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const loadData = async () => {
        setLoading(true);
        const d = await getGymDays();
        setDays(d);
        setLoading(false);
    };

    useEffect(() => {
        if (activeView === 'dashboard') {
            loadData();
        }
    }, [activeView]);

    // If there's an active workout stored, force them into it
    useEffect(() => {
        if (activeWorkout && activeWorkout.status !== 'finished') {
            setActiveView('workout');
        }
    }, [activeWorkout]);

    const startWorkout = (dayId: string) => {
        setActiveWorkout({
            startedAt: Date.now(),
            dayId: dayId,
            currentExerciseIndex: 0,
            completedSetsByExercise: {},
            status: 'active'
        });
        setActiveView('workout');
    };

    const finishWorkout = () => {
        setActiveWorkout(null);
        setActiveView('history');
    }

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
    };

    if (activeView === 'editor') return <WorkoutEditor onBack={() => setActiveView('dashboard')} />;
    if (activeView === 'workout' && activeWorkout) return <ActiveWorkout onFinish={finishWorkout} />;
    if (activeView === 'history') return <WorkoutHistory onBack={() => setActiveView('dashboard')} />;

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
                    <button onClick={() => setActiveView('history')} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">
                        History
                    </button>
                    <button onClick={() => setActiveView('editor')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
                        Routines
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Start a Workout</h3>
                <p className="text-slate-500 mb-6 text-sm">Select one of your curated routines to begin tracking.</p>

                {loading ? (
                    <div className="animate-pulse text-slate-400 font-medium">Loading routines...</div>
                ) : days.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-slate-300 bg-slate-50 rounded-xl">
                        <p className="text-slate-500 mb-4 font-medium">You have no routines.</p>
                        <button onClick={() => setActiveView('editor')} className="text-blue-600 font-bold hover:text-blue-800 hover:underline">Create Routine Now</button>
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
