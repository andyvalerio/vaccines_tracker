import React, { useState } from 'react';
import { GymExercise } from '../../types';
import { parseTarget } from '../../services/setTargetService';
import ExerciseRepsStepper from './ExerciseRepsStepper';

interface FixSetsSheetProps {
    exercise: GymExercise;
    completedSets: number;
    actualReps: number[];
    actualDurations: number[];
    onCorrectReps: (setIndex: number, reps: number) => void;
    onCorrectTarget: (setIndex: number, value: number) => void;
    onUncompleteLastSet: () => void;
    onClose: () => void;
}

/**
 * Correcting a set that is already logged.
 *
 * The active-set screen is close to full on a small phone before anything is added to it, so this
 * is the only place corrections live: a sheet opened on demand from controls that were already on
 * screen. Nothing here is duplicated inline.
 *
 * Editing follows the same rule as the exercise note — every change commits as it is made, on a tap
 * for reps and on blur for the weight, so tapping away to dismiss the keyboard can never discard a
 * correction and there is no save step to forget.
 */

const safeArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

/** Weight for one already-logged set. Keeps its own draft so typing doesn't write on every keystroke. */
function SetWeightField({ initialValue, unit, label, onCommit }: {
    initialValue: number;
    unit: string;
    label: string;
    onCommit: (value: number) => void;
}) {
    const [draft, setDraft] = useState(initialValue ? String(initialValue) : '');

    const commit = () => {
        const value = parseFloat(draft);
        // Same rule as the target field on the set screen: an empty box is an unfinished edit.
        if (!Number.isFinite(value) || value <= 0) {
            setDraft(initialValue ? String(initialValue) : '');
            return;
        }
        onCommit(value);
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                type="number"
                inputMode="decimal"
                aria-label={label}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commit}
                className="w-20 px-2 py-1.5 text-center text-lg font-bold text-slate-800 bg-white border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <span className="text-sm font-bold text-slate-500">{unit}</span>
        </div>
    );
}

export default function FixSetsSheet({
    exercise,
    completedSets,
    actualReps,
    actualDurations,
    onCorrectReps,
    onCorrectTarget,
    onUncompleteLastSet,
    onClose,
}: FixSetsSheetProps) {
    // The set you came to fix is almost always the one you just finished, so it opens expanded.
    const [expandedIndex, setExpandedIndex] = useState(completedSets - 1);

    const targets = safeArray(exercise.setTargets);
    const lastCompletedIndex = completedSets - 1;

    return (
        <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-label="Fix a set">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />

            <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl sm:mb-6 shadow-2xl max-h-[80dvh] flex flex-col animate-fade-in">
                <div className="flex items-start justify-between gap-2 p-4 pb-3 border-b border-slate-100">
                    <div>
                        <div className="text-lg font-extrabold text-slate-900 leading-tight">{exercise.name}</div>
                        <div className="text-xs text-slate-400 font-medium">Fix a set you already did</div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 -m-1 text-slate-300 hover:text-slate-600 rounded-xl transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                    {Array.from({ length: exercise.setCount }).map((_, index) => {
                        const isDone = index < completedSets;
                        const parsed = parseTarget(targets[index] || '');
                        const isDuration = parsed.metric === 'duration';
                        // A session saved before reps were recorded per set has no actuals to show.
                        const reps = actualReps[index] ?? exercise.targetReps;
                        const seconds = actualDurations[index];

                        if (!isDone) {
                            return (
                                <div key={index} className="flex items-center gap-3 px-4 py-3 text-slate-300">
                                    <span className="text-sm font-bold w-12 shrink-0">Set {index + 1}</span>
                                    <span className="text-sm font-medium">Not done yet</span>
                                </div>
                            );
                        }

                        const isExpanded = index === expandedIndex;

                        return (
                            <div key={index}>
                                <button
                                    type="button"
                                    aria-label={`Edit set ${index + 1}`}
                                    onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left min-h-[44px] transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                >
                                    <span className="text-sm font-bold text-slate-500 w-12 shrink-0">Set {index + 1}</span>
                                    {targets[index] && <span className="text-sm font-bold text-slate-800">{targets[index]}</span>}
                                    <span className="text-sm text-slate-500 ml-auto">
                                        {isDuration ? `${seconds ?? parsed.targetSeconds}s` : `${reps} reps`}
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-1 bg-blue-50 flex flex-col gap-3">
                                        {isDuration ? (
                                            // A timed set is measured by the timer, not typed, so there is
                                            // no number here to have got wrong — only the set itself.
                                            <div className="text-sm text-slate-500 font-medium">
                                                Timed set — recorded as {seconds ?? parsed.targetSeconds}s.
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <SetWeightField
                                                    initialValue={parsed.value}
                                                    unit={parsed.unit}
                                                    label={`Weight for set ${index + 1}`}
                                                    onCommit={value => onCorrectTarget(index, value)}
                                                />
                                                <ExerciseRepsStepper
                                                    value={reps}
                                                    onChange={next => onCorrectReps(index, next)}
                                                    label={`set ${index + 1}`}
                                                />
                                            </div>
                                        )}

                                        {index === lastCompletedIndex && (
                                            <button
                                                type="button"
                                                onClick={onUncompleteLastSet}
                                                className="w-full py-2.5 text-sm font-bold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors active:scale-[0.99]"
                                            >
                                                Mark set {index + 1} not done
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 pt-3 border-t border-slate-100" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl transition-transform active:scale-[0.98]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
