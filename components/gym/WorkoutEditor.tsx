import React, { useState, useEffect } from 'react';
import { getGymDays, getGymExercises, saveGymExercise, saveGymDay, deleteGymExercise, deleteGymDay } from '../../services/gymService';
import { GymDay, GymExercise } from '../../types';

export default function WorkoutEditor({ onBack }: { onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<'days' | 'exercises'>('days');
    const [days, setDays] = useState<GymDay[]>([]);
    const [exercises, setExercises] = useState<GymExercise[]>([]);
    const [loading, setLoading] = useState(true);

    // States for Editing
    const [editingExercise, setEditingExercise] = useState<GymExercise | null>(null);
    const [editingDay, setEditingDay] = useState<GymDay | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [d, e] = await Promise.all([getGymDays(), getGymExercises()]);
            setDays(d);
            setExercises(e);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleSaveExercise = async () => {
        if (!editingExercise || !editingExercise.name.trim()) return;
        await saveGymExercise(editingExercise);
        setEditingExercise(null);
        loadData();
    };

    const handleSaveDay = async () => {
        if (!editingDay || !editingDay.name.trim()) return;
        await saveGymDay(editingDay);
        setEditingDay(null);
        loadData();
    };

    const toggleExerciseInDay = (exerciseId: string) => {
        if (!editingDay) return;
        const isSelected = (editingDay.exerciseIds || []).includes(exerciseId);
        let newIds = [];
        if (isSelected) {
            newIds = (editingDay.exerciseIds || []).filter(id => id !== exerciseId);
        } else {
            newIds = [...(editingDay.exerciseIds || []), exerciseId];
        }
        setEditingDay({ ...editingDay, exerciseIds: newIds });
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

    const updateSetTarget = (index: number, val: string) => {
        if (!editingExercise) return;
        const newTargets = [...(editingExercise.setTargets || [])];
        newTargets[index] = val;
        setEditingExercise({ ...editingExercise, setTargets: newTargets });
    };

    if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading routines...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <button onClick={onBack} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('days')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'days' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Routines (Days)</button>
                    <button onClick={() => setActiveTab('exercises')} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'exercises' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Global Exercises</button>
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
                                    {exercises.map(ex => (
                                        <div key={ex.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-800">{ex.name}</div>
                                                <div className="text-xs text-slate-500">{ex.setCount} Sets &times; {ex.targetReps} Reps</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingExercise(ex)} className="px-3 py-1 text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100">Edit</button>
                                                <button onClick={async () => { await deleteGymExercise(ex.id); loadData(); }} className="px-3 py-1 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100">Del</button>
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes (Optional)</label>
                                        <input type="text" value={editingExercise.notes || ''} onChange={e => setEditingExercise({ ...editingExercise, notes: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Keep elbows tucked" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Sets</label>
                                        <input type="number" min="1" value={editingExercise.setCount} onChange={e => updateSetCount(parseInt(e.target.value) || 1)} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Reps</label>
                                        <input type="number" min="1" value={editingExercise.targetReps} onChange={e => setEditingExercise({ ...editingExercise, targetReps: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rest Time (s)</label>
                                        <input type="number" step="15" min="0" value={editingExercise.restTimeSeconds} onChange={e => setEditingExercise({ ...editingExercise, restTimeSeconds: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>

                                {/* Specific Set Targets (Weight / Length) */}
                                <div className="bg-white border text-center border-slate-100 rounded-xl p-4 mt-4">
                                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-4 border-b pb-2">Target Weight or Length Per Set</h4>
                                    <div className="space-y-2">
                                        {Array.from({ length: editingExercise.setCount }).map((_, i) => {
                                            const tStr = (editingExercise.setTargets || [])[i] || '';
                                            const val = parseFloat(tStr) || 0;
                                            const unitMatch = tStr.match(/[a-zA-Z]+/);
                                            const unit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';
                                            return (
                                                <div key={i} className="flex items-center justify-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 w-12 text-right">SET {i + 1}</span>
                                                    <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
                                                        <input
                                                            type="number"
                                                            value={val || ''}
                                                            onChange={e => updateSetTarget(i, `${e.target.value}${unit}`)}
                                                            className="w-24 p-2 text-sm text-center focus:outline-none placeholder:text-slate-300 font-bold text-slate-700"
                                                            placeholder="15"
                                                        />
                                                        <select
                                                            value={unit}
                                                            onChange={e => updateSetTarget(i, `${val}${e.target.value}`)}
                                                            className="p-2 text-sm bg-slate-50 focus:outline-none text-slate-500 font-medium border-l border-slate-200 cursor-pointer"
                                                        >
                                                            <option value="kg">kg</option>
                                                            <option value="mins">mins</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )
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
                                                <div className="text-xs text-slate-500">{day.exerciseIds?.length || 0} Exercises</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingDay(day)} className="px-3 py-1 text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Edit</button>
                                                <button onClick={async () => { await deleteGymDay(day.id); loadData(); }} className="px-3 py-1 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Del</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-slate-800">{editingDay.id ? 'Edit Routine' : 'Create Routine'}</h3>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Routine Name</label>
                                    <input type="text" value={editingDay.name} onChange={e => setEditingDay({ ...editingDay, name: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Pull Day" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Select Exercises from Library</label>
                                    {exercises.length === 0 ? (
                                        <p className="text-slate-400 text-xs italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">Create globally shared exercises in the other tab first!</p>
                                    ) : (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                                            {exercises.map(ex => {
                                                const isSelected = editingDay.exerciseIds?.includes(ex.id);
                                                return (
                                                    <div key={ex.id} onClick={() => toggleExerciseInDay(ex.id)} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-slate-50 bg-white'}`}>
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                                                            {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                        </div>
                                                        <div>
                                                            <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{ex.name}</div>
                                                            <div className={`text-xs ${isSelected ? 'text-blue-600/70' : 'text-slate-400'}`}>{ex.setCount} Sets</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-6">
                                    <button onClick={handleSaveDay} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors">Save Routine</button>
                                    <button onClick={() => setEditingDay(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
