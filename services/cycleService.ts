import { TrainingCycle } from '../types';

/**
 * Periodization helpers. A training cycle is a repeating block of `accumulationWeeks`
 * building weeks followed by an optional deload ("go light") week. Which week you are in
 * is always *derived* from the anchor `startDate` and today — never stored, never manually
 * advanced — so a missed calendar week can't desynchronise the counter.
 */

export const DEFAULT_CYCLE: TrainingCycle = {
    accumulationWeeks: 4,
    hasDeloadWeek: true,
    startDate: todayISO(),
    repRangeMin: 8,
    repRangeMax: 12,
};

export function todayISO(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export interface CycleState {
    weekInCycle: number;   // 0-based index of the current week within the cycle
    totalWeeks: number;    // accumulation weeks + (deload ? 1 : 0)
    isDeloadWeek: boolean;
    cycleNumber: number;   // 1-based count of how many full cycles have elapsed + current
}

/**
 * Number of whole weeks between two calendar dates, floored, based on local midnight of each
 * so that clock time within a day never nudges the boundary.
 */
function weeksBetween(startDate: string, now: Date): number {
    const [y, m, d] = startDate.split('-').map(Number);
    if (!y || !m || !d) return 0;
    const start = new Date(y, m - 1, d).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.floor((today - start) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return 0;
    return Math.floor(diffDays / 7);
}

export function getCycleState(cycle: TrainingCycle, now: Date = new Date()): CycleState {
    const accumulation = Math.max(1, Math.floor(cycle.accumulationWeeks) || 1);
    const totalWeeks = accumulation + (cycle.hasDeloadWeek ? 1 : 0);
    const weeksSinceStart = weeksBetween(cycle.startDate, now);
    const weekInCycle = weeksSinceStart % totalWeeks;
    const cycleNumber = Math.floor(weeksSinceStart / totalWeeks) + 1;
    const isDeloadWeek = cycle.hasDeloadWeek && weekInCycle === accumulation;
    return { weekInCycle, totalWeeks, isDeloadWeek, cycleNumber };
}

/**
 * Plain-language summary of where you are, e.g. "Week 3 of 4 · deload next week"
 * or "Deload week — go light".
 */
export function describeCycle(cycle: TrainingCycle, now: Date = new Date()): string {
    const { weekInCycle, isDeloadWeek } = getCycleState(cycle, now);
    const accumulation = Math.max(1, Math.floor(cycle.accumulationWeeks) || 1);
    if (isDeloadWeek) return 'Deload week — go light';
    const humanWeek = weekInCycle + 1;
    const deloadNext = cycle.hasDeloadWeek && humanWeek === accumulation;
    const suffix = deloadNext ? ' · deload next week' : '';
    return `Week ${humanWeek} of ${accumulation}${suffix}`;
}
