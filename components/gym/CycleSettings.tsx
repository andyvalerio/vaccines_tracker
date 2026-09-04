import React, { useState } from 'react';
import { TrainingCycle } from '../../types';
import { StorageService } from '../../services/storageService';
import { DEFAULT_CYCLE, todayISO } from '../../services/cycleService';

interface CycleSettingsProps {
    accountId: string;
    cycle: TrainingCycle | null;
    onClose: () => void;
}

/**
 * Modal editor for the global training cycle. Configures the building weeks, whether there
 * is a deload week, and the progression rep range. "Start new cycle" re-anchors the cycle to
 * today without touching its configuration.
 */
export default function CycleSettings({ accountId, cycle, onClose }: CycleSettingsProps) {
    const [draft, setDraft] = useState<TrainingCycle>(cycle || { ...DEFAULT_CYCLE, startDate: todayISO() });
    const [saving, setSaving] = useState(false);

    const update = (patch: Partial<TrainingCycle>) => setDraft(prev => ({ ...prev, ...patch }));

    const save = async (next: TrainingCycle) => {
        setSaving(true);
        try {
            await StorageService.saveTrainingCycle(accountId, next);
            onClose();
        } catch (err) {
            console.error('Failed to save training cycle', err);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4" onClick={onClose}>
            <div
                className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 space-y-5 animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Training Cycle</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Cycle start date</label>
                    <input
                        type="date"
                        aria-label="Cycle start date"
                        value={draft.startDate}
                        max={todayISO()}
                        onChange={e => update({ startDate: e.target.value || todayISO() })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                    <p className="text-xs text-slate-500">Set it to the day you actually started week 1 — it can be in the past.</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Building weeks</label>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Fewer building weeks"
                            onClick={() => update({ accumulationWeeks: Math.max(1, draft.accumulationWeeks - 1) })}
                            className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 text-xl font-bold hover:bg-slate-200 disabled:opacity-40"
                            disabled={draft.accumulationWeeks <= 1}
                        >−</button>
                        <div className="flex-1 text-center text-2xl font-black text-slate-800">{draft.accumulationWeeks}</div>
                        <button
                            type="button"
                            aria-label="More building weeks"
                            onClick={() => update({ accumulationWeeks: draft.accumulationWeeks + 1 })}
                            className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 text-xl font-bold hover:bg-slate-200"
                        >+</button>
                    </div>
                </div>

                <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm font-bold text-slate-700">Deload week</span>
                    <input
                        type="checkbox"
                        aria-label="Deload week"
                        checked={draft.hasDeloadWeek}
                        onChange={e => update({ hasDeloadWeek: e.target.checked })}
                        className="w-5 h-5 accent-blue-600"
                    />
                </label>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Rep range (for progression suggestions)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            aria-label="Minimum reps"
                            min={1}
                            value={draft.repRangeMin}
                            onChange={e => update({ repRangeMin: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-20 p-2.5 text-center bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <input
                            type="number"
                            aria-label="Maximum reps"
                            min={1}
                            value={draft.repRangeMax}
                            onChange={e => update({ repRangeMax: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-20 p-2.5 text-center bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={() => save(draft)}
                        disabled={saving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60"
                    >
                        {cycle ? 'Save' : 'Set up cycle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
