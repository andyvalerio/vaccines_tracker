/**
 * A set's target — "60kg" or "1mins" — is stored as a single string on the exercise, so parsing it
 * is shared by everything that has to reason about a set: the active workout, the corrections sheet,
 * and the summary written to history.
 */

// Duration volume is always stored in seconds, because that is what a set is actually measured in.
export const DURATION_UNIT = 's';

export interface ParsedTarget {
    value: number;
    unit: string;
    metric: 'weight' | 'duration';
    targetSeconds: number;
}

export const parseTarget = (target: string): ParsedTarget => {
    const value = parseFloat(target) || 0;
    const unitMatch = target.match(/[a-zA-Z]+/);
    const unit = unitMatch ? unitMatch[0].toLowerCase() : 'kg';
    const metric = unit.includes('min') ? 'duration' as const : 'weight' as const;
    // Targets are written in minutes but sets are timed in seconds; normalise so the two are comparable.
    const targetSeconds = metric === 'duration' ? Math.round(value * 60) : 0;
    return { value, unit, metric, targetSeconds };
};

/**
 * Whether a target names a real load or time. An empty or unparseable field is someone midway
 * through retyping on a phone, never a request to train at zero, so it must never be saved over
 * the weight that is already there.
 */
export const hasTargetValue = (target: string) => (parseFloat(target) || 0) > 0;
