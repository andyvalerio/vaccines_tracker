import React from 'react';
import { TrainingCycle } from '../../types';
import { getCycleState, describeCycle } from '../../services/cycleService';

interface CycleIndicatorProps {
    cycle: TrainingCycle | null;
    onConfigure: () => void;
}

/**
 * The periodization banner on the Gym dashboard. When no cycle exists it is a quiet
 * "set one up" affordance; once configured it shows a row of week markers with the
 * current week highlighted and the deload week visually distinct, plus a plain label.
 * Purely informational — tapping opens the settings, nothing here changes any target.
 */
export default function CycleIndicator({ cycle, onConfigure }: CycleIndicatorProps) {
    if (!cycle) {
        return (
            <button
                onClick={onConfigure}
                className="w-full text-left bg-white border border-dashed border-slate-300 rounded-2xl p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
            >
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Progressive Overload</div>
                <div className="font-bold text-slate-700">Set up a training cycle →</div>
                <div className="text-xs text-slate-500 mt-0.5">Building weeks + a deload, so you always know where you are.</div>
            </button>
        );
    }

    const { weekInCycle, isDeloadWeek } = getCycleState(cycle);
    const accumulation = Math.max(1, Math.floor(cycle.accumulationWeeks) || 1);
    const pips: Array<{ key: string; isDeload: boolean; index: number }> = [];
    for (let i = 0; i < accumulation; i++) pips.push({ key: `w${i}`, isDeload: false, index: i });
    if (cycle.hasDeloadWeek) pips.push({ key: 'deload', isDeload: true, index: accumulation });

    return (
        <button
            onClick={onConfigure}
            aria-label="Training cycle"
            className={`w-full text-left rounded-2xl p-4 border transition-colors ${
                isDeloadWeek
                    ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    : 'bg-white border-slate-100 hover:border-blue-200'
            }`}
        >
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Training Cycle</div>
                <div className={`text-sm font-bold ${isDeloadWeek ? 'text-amber-700' : 'text-slate-700'}`}>
                    {describeCycle(cycle)}
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {pips.map(pip => {
                    const isCurrent = pip.index === weekInCycle;
                    const isPast = pip.index < weekInCycle;
                    let cls: string;
                    if (pip.isDeload) {
                        cls = isCurrent
                            ? 'bg-amber-500 ring-2 ring-amber-300 ring-offset-1'
                            : isPast ? 'bg-amber-300' : 'bg-amber-100 border border-amber-300';
                    } else {
                        cls = isCurrent
                            ? 'bg-blue-600 ring-2 ring-blue-300 ring-offset-1'
                            : isPast ? 'bg-blue-400' : 'bg-slate-200';
                    }
                    return (
                        <div
                            key={pip.key}
                            title={pip.isDeload ? 'Deload week' : `Week ${pip.index + 1}`}
                            className={`h-2.5 flex-1 rounded-full transition-colors ${cls}`}
                        />
                    );
                })}
            </div>
        </button>
    );
}
