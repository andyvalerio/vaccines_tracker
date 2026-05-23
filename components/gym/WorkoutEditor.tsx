import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '../../services/storageService';
import { GymDay, GymExercise } from '../../types';

interface WorkoutEditorProps {
    accountId: string;
    onBack: () => void;
    onViewProgress: (exerciseName: string) => void;
}

export default function WorkoutEditor({ accountId, onBack, onViewProgress }: WorkoutEditorProps) {
    const [activeTab, setActiveTab] = useState<'days' | 'exercises'>('days');
    const [days, setDays] = useState<GymDay[]>([]);
    const [exercises, setExercises] = useState<GymExercise[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingExercise, setEditingExercise] = useState<GymExercise | null>(null);
    const [editingDay, setEditingDay] = useState<GymDay | null>(null);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);

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

    const filteredExercises = useMemo(() => {
        const query = exerciseSearch.trim().toLowerCase();
        if (!query) return exercises;
        return exercises.filter(exercise => exercise.name.toLowerCase().includes(query));
    }, [exerciseSearch, exercises]);

    const selectedExercises = useMemo(() => {
        return (editingDay?.exerciseIds || [])
            .map(exerciseId => exercises.find(exercise => exercise.id === exerciseId))
            .filter(Boolean) as GymExercise[];
    }, [editingDay, exercises]);

    const handleSaveExercise = async () => {
        if (!editingExercise || !editingExercise.name.trim()) return;

        const normalizedExercise = {
            ...editingExercise,
            name: editingExercise.name.trim(),
            notes: editingExercise.notes?.trim() || undefined,
            setTargets: Array.from({ length: editingExercise.setCount }).map((_, index) => editingExercise.setTargets[index] || '')
        };

        if (editingExercise.id) {
            await StorageService.updateGymExercise(accountId, normalizedExercise);
        } else {
            await StorageService.addGymExercise(accountId, normalizedExercise);
        }

        setEditingExercise(null);
    };

    const handleSaveDay = async () => {
        if (!editingDay || !editingDay.name.trim()) return;

        const normalizedDay = {
            ...editingDay,
            name: editingDay.name.trim(),
            exerciseIds: editingDay.exerciseIds || []
        };

        if (editingDay.id) {
            await StorageService.updateGymDay(accountId, normalizedDay);
        } else {
            await StorageService.addGymDay(accountId, normalizedDay);
        }

        setEditingDay(null);
        setExerciseSearch('');
    };

    const addExerciseToDay = (exerciseId: string) => {
        if (!editingDay) return;
        if ((editingDay.exerciseIds || []).includes(exerciseId)) return;
        setEditingDay({
            ...editingDay,
            exerciseIds: [...(editingDay.exerciseIds || []), exerciseId]
        });
    };

    const removeExerciseFromDay = (exerciseId: string) => {
        if (!editingDay) return;
        setEditingDay({
            ...editingDay,
            exerciseIds: (editingDay.exerciseIds || []).filter(id => id !== exerciseId)
        });
    };

    const moveExerciseInDay = (exerciseId: string, targetIndex: number) => {
        if (!editingDay) return;
        const currentIds = [...(editingDay.exerciseIds || [])];
        const currentIndex = currentIds.indexOf(exerciseId);
        if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length) return;
        const [item] = currentIds.splice(currentIndex, 1);
        currentIds.splice(targetIndex, 0, item);
        setEditingDay({ ...editingDay, exerciseIds: currentIds });
    };

    const updateSetCount = (count: number) => {
        if (!editingExercise) return;
        let newTargets = [...(editingExercise.setTargets || [])];
        if (count > newTargets.length) {
            newTargets = [...newTargets, ...Array(count - newTargets.length).fill('')];
        } else {
            newTargets = newTargets.slice(0, count);
        }
        setEditingExercise({ ...editingExercise, setCount: count, setTargets: newTargets });
    };

    const updateSetTarget = (index: number, value: string) => {
        if (!editingExercise) return;
        const newTargets = [...(editingExercise.setTargets || [])];
        newTargets[index] = value;
        setEditingExercise({ ...editingExercise, setTargets: newTargets });
    };

    if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading routines...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <button onClick={onBack} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('days')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'days' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Routines</button>
                    <button onClick={() => setActiveTab('exercises')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'exercises' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Exercises</button>
                </div>
            </div>

            <div className="p-6">
                {activeTab === 'exercises' && (
                    <div>
                        {!editingExercise ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Exercise Library</h3>
                                    <button onClick={() => setEditingExercise({ id: '', name: '', setCount: 3, targetReps: 10, restTimeSeconds: 60, setTargets: ['', '', ''] })} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium text-xs">
                                        + New Exercise
                                    </button>
                                </div>
                                {exercises.length === 0 && <p className="text-slate-500">No exercises created yet.</p>}
                                <div className="space-y-2">
                                    {exercises.map(exercise => (
                                        <div key={exercise.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-800">{exercise.name}</div>
                                                <div className="text-xs text-slate-500">{exercise.setCount} sets x {exercise.targetReps} reps</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => onViewProgress(exercise.name)} className="px-3 py-1 text-emerald-700 font-medium bg-emerald-50 rounded-lg hover:bg-emerald-100">Progress</button>
                                                <button onClick={() => setEditingExercise(exercise)} className="px-3 py-1 text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100">Edit</button>
                                                <button onClick={async () => { await StorageService.deleteGymExercise(accountId, exercise.id); }} className="px-3 py-1 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100">Del</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-slate-800">{editingExercise.id ? 'Edit Exercise' : 'Create Exercise'}</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                                        <input type="text" value={editingExercise.name} onChange={e => setEditingExercise({ ...editingExercise, name: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Bench Press" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                                        <input type="text" value={editingExercise.notes || ''} onChange={e => setEditingExercise({ ...editingExercise, notes: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Keep elbows tucked" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sets</label>
                                        <input type="number" min="1" value={editingExercise.setCount} onChange={e => updateSetCount(parseInt(e.target.value, 10) || 1)} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reps</label>
                                        <input type="number" min="1" value={editingExercise.targetReps} onChange={e => setEditingExercise({ ...editingExercise, targetReps: parseInt(e.target.value, 10) || 1 })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rest (s)</label>
                                        <input type="number" step="15" min="0" value={editingExercise.restTimeSeconds} onChange={e => setEditingExercise({ ...editingExercise, restTimeSeconds: parseInt(e.target.value, 10) || 0 })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>

                                <div className="bg-white border text-center border-slate-100 rounded-xl p-4 mt-4">
                                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 border-b pb-2">Target Per Set</h4>
                                    <div className="space-y-2">
                                        {Array.from({ length: editingExercise.setCount }).map((_, index) => {
                                            const target = (editingExercise.setTargets || [])[index] || '';
                                            const value = parseFloat(target) || 0;
                                            const unitMatch = target.match(/[a-zA-Z]+/);
                                            const unit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';
                                            return (
                                                <div key={index} className="flex items-center justify-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 w-12 text-right">SET {index + 1}</span>
                                                    <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
                                                        <input
                                                            type="number"
                                                            value={value || ''}
                                                            onChange={e => updateSetTarget(index, `${e.target.value}${unit}`)}
                                                            className="w-24 p-2 text-sm text-center focus:outline-none placeholder:text-slate-300 font-bold text-slate-700"
                                                            placeholder="15"
                                                        />
                                                        <select
                                                            value={unit}
                                                            onChange={e => updateSetTarget(index, `${value}${e.target.value}`)}
                                                            className="p-2 text-sm bg-slate-50 focus:outline-none text-slate-500 font-medium border-l border-slate-200 cursor-pointer"
                                                        >
                                                            <option value="kg">kg</option>
                                                            <option value="mins">mins</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-6">
                                    <button onClick={handleSaveExercise} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">Save Exercise</button>
                                    <button onClick={() => setEditingExercise(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'days' && (
                    <div>
                        {!editingDay ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-slate-800">My Routines</h3>
                                    <button onClick={() => setEditingDay({ id: '', name: '', exerciseIds: [] })} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors">
                                        + New Routine
                                    </button>
                                </div>
                                {days.length === 0 && <p className="text-slate-500">No routines created yet.</p>}
                                <div className="space-y-2">
                                    {days.map(day => (
                                        <div key={day.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-800">{day.name}</div>
                                                <div className="text-xs text-slate-500">{day.exerciseIds?.length || 0} exercises</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingDay(day)} className="px-3 py-1 text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Edit</button>
                                                <button onClick={async () => { await StorageService.deleteGymDay(accountId, day.id); }} className="px-3 py-1 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Del</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{editingDay.id ? 'Edit Routine' : 'Create Routine'}</h3>
                                        <p className="text-slate-500 text-sm">Add, search, order, and remove exercises in one builder.</p>
                                    </div>
                                    <button onClick={() => setEditingDay(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Close</button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Routine Name</label>
                                    <input type="text" value={editingDay.name} onChange={e => setEditingDay({ ...editingDay, name: e.target.value })} className="w-full border border-slate-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Pull Day" />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Routine Builder</div>
                                                <div className="text-sm text-slate-400 mt-1">Drag items to reorder them.</div>
                                            </div>
                                            <div className="text-xs font-medium text-slate-400">{selectedExercises.length} selected</div>
                                        </div>

                                        {selectedExercises.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                                                Start typing on the right and add exercises into this routine.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedExercises.map((exercise, index) => (
                                                    <div
                                                        key={exercise.id}
                                                        draggable
                                                        onDragStart={() => setDraggedExerciseId(exercise.id)}
                                                        onDragOver={(event) => event.preventDefault()}
                                                        onDrop={() => {
                                                            if (!draggedExerciseId) return;
                                                            moveExerciseInDay(draggedExerciseId, index);
                                                            setDraggedExerciseId(null);
                                                        }}
                                                        onDragEnd={() => setDraggedExerciseId(null)}
                                                        className="rounded-xl border border-slate-200 bg-white px-3 py-3 flex items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-slate-800 truncate">{exercise.name}</div>
                                                            <div className="text-xs text-slate-400">{exercise.setCount} sets x {exercise.targetReps} reps</div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={() => onViewProgress(exercise.name)} className="px-2.5 py-1.5 text-emerald-700 font-medium bg-emerald-50 rounded-lg hover:bg-emerald-100">Progress</button>
                                                            <button type="button" onClick={() => removeExerciseFromDay(exercise.id)} className="px-2.5 py-1.5 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100">Remove</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add Exercises</label>
                                        <input
                                            type="text"
                                            value={exerciseSearch}
                                            onChange={e => setExerciseSearch(e.target.value)}
                                            placeholder="Search your exercise library"
                                            className="w-full border border-slate-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                                        />
                                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                            {filteredExercises.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                                                    No matching exercises.
                                                </div>
                                            ) : (
                                                filteredExercises.map(exercise => {
                                                    const isSelected = editingDay.exerciseIds.includes(exercise.id);
                                                    return (
                                                        <button
                                                            key={exercise.id}
                                                            type="button"
                                                            onClick={() => addExerciseToDay(exercise.id)}
                                                            disabled={isSelected}
                                                            className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${isSelected ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold truncate">{exercise.name}</div>
                                                                    <div className="text-xs text-slate-400">{exercise.setCount} sets x {exercise.targetReps} reps</div>
                                                                </div>
                                                                <div className="text-xs font-bold">{isSelected ? 'Added' : 'Add'}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-6">
                                    <button onClick={handleSaveDay} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">Save Routine</button>
                                    <button onClick={() => setEditingDay(null)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
