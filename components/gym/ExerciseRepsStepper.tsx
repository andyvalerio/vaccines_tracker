import React from 'react';

interface ExerciseRepsStepperProps {
    value: number;
    onChange: (value: number) => void;
    atTopOfRange?: boolean;
}

/**
 * Reps for the current set: a plain +/- stepper, no keyboard entry.
 *
 * Built for a phone held mid-set, same as ExerciseNoteField: big tap targets. Zero is a
 * valid value (a failed set is still worth recording), so the minus button disables there
 * instead of going negative. There's no upper bound. When the current reps sit at or above
 * the cycle's rep-range top, a subtle ring signals "you've maxed this set's range".
 */
export default function ExerciseRepsStepper({ value, onChange, atTopOfRange = false }: ExerciseRepsStepperProps) {
    const decrement = () => onChange(Math.max(0, value - 1));
    const increment = () => onChange(value + 1);

    return (
        <div className={`flex-1 bg-white p-3 rounded-2xl border border-emerald-200 shadow-sm shadow-emerald-100 ${atTopOfRange ? 'ring-2 ring-emerald-300' : ''}`}>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 text-center">Reps</div>
            <div className="flex items-center justify-center gap-1">
                <button
                    type="button"
                    onClick={decrement}
                    disabled={value <= 0}
                    aria-label="Decrease reps"
                    className="w-9 h-9 shrink-0 rounded-full bg-emerald-50 text-emerald-700 text-xl font-bold flex items-center justify-center transition-colors hover:bg-emerald-100 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                    &minus;
                </button>
                <span className="w-10 text-center text-xl font-bold text-slate-800 tabular-nums">{value}</span>
                <button
                    type="button"
                    onClick={increment}
                    aria-label="Increase reps"
                    className="w-9 h-9 shrink-0 rounded-full bg-emerald-50 text-emerald-700 text-xl font-bold flex items-center justify-center transition-colors hover:bg-emerald-100 active:scale-95"
                >
                    +
                </button>
            </div>
        </div>
    );
}
