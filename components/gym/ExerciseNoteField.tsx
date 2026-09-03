import React, { useState } from 'react';

interface ExerciseNoteFieldProps {
    note?: string;
    onSave: (note: string) => void;
    compact?: boolean;
}

/**
 * The exercise note, editable in place during a workout.
 *
 * Built for a phone held mid-set: big tap targets, no keyboard shortcuts to cancel.
 * Saving happens on Done or on blur, because tapping away to dismiss the keyboard is
 * the normal way a phone user finishes typing and must never discard the note.
 */
export default function ExerciseNoteField({ note, onSave, compact = false }: ExerciseNoteFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(note || '');

    const startEditing = () => {
        setDraft(note || '');
        setIsEditing(true);
    };

    const commit = () => {
        if (!isEditing) return;
        setIsEditing(false);
        const trimmed = draft.trim();
        if ((note || '') !== trimmed) onSave(trimmed);
    };

    if (isEditing) {
        return (
            <div className={`w-full ${compact ? 'mt-3' : ''}`}>
                <textarea
                    aria-label="Exercise note"
                    autoFocus
                    rows={compact ? 2 : 3}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commit}
                    placeholder="e.g. Keep elbows tucked"
                    className="w-full p-3 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-900 text-sm font-medium placeholder:text-amber-400 focus:border-amber-400 focus:outline-none resize-none"
                />
                <button
                    type="button"
                    // Keeps the textarea focused through the press so this click always registers;
                    // without it, blur fires first and can unmount this button mid-click.
                    onMouseDown={e => e.preventDefault()}
                    onClick={commit}
                    className="mt-2 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-colors active:scale-[0.98]"
                >
                    Done
                </button>
            </div>
        );
    }

    if (!note) {
        return (
            <button
                type="button"
                onClick={startEditing}
                className={`w-full text-left text-amber-700/70 hover:text-amber-800 hover:border-amber-300 border-2 border-dashed border-amber-200/70 rounded-xl transition-colors ${compact ? 'mt-3 p-2 text-xs' : 'p-3 text-sm'} font-medium`}
            >
                + Add note
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={startEditing}
            className={`w-full text-left bg-amber-50 border border-amber-100 hover:border-amber-300 rounded-xl text-amber-800 font-medium transition-colors ${compact ? 'mt-3 p-2 text-xs' : 'p-3 text-sm'}`}
        >
            <span className="block whitespace-pre-wrap">{note}</span>
            <span className="block mt-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600/70">
                Edit note
            </span>
        </button>
    );
}
