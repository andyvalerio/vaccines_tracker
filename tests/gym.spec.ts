import { test, expect } from '@playwright/test';

test.describe('Gym Tracker Requirements', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
        });
        await page.goto('/');

        // Navigate to the gym tab
        await page.getByRole('button', { name: 'Gym' }).click();
    });

    test('US-GYM-01: View Gym Dashboard', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Gym Tracker' })).toBeVisible();
        await expect(page.getByText('Start a Workout')).toBeVisible();
    });

    test('US-GYM-02: Navigate to Edit Routines and view Empty State', async ({ page }) => {
        await page.getByRole('button', { name: 'Routines' }).click();

        // Should be on routines tab
        await expect(page.getByRole('heading', { name: 'My Routines' })).toBeVisible();

        // Go to exercises library
        await page.getByRole('button', { name: 'Exercises' }).click();
        await expect(page.getByRole('heading', { name: 'Exercise Library' })).toBeVisible();
    });

    test('US-GYM-03: Routine editor uses a single builder flow', async ({ page }) => {
        await page.getByRole('button', { name: 'Routines' }).click();
        await page.getByRole('button', { name: 'Edit' }).first().click();

        await expect(page.getByText('Routine Builder')).toBeVisible();
        await expect(page.getByPlaceholder('Search your exercise library')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Remove' }).first()).toBeVisible();
    });

    test('US-GYM-04: Rest view keeps context and session completion is explicit', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await page.getByRole('button', { name: 'Complete Set' }).click();

        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Skip Rest' })).toBeVisible();

        for (let i = 0; i < 7; i++) {
            const skipButton = page.getByRole('button', { name: 'Skip Rest' });
            if (await skipButton.isVisible()) {
                await skipButton.click();
            }
            const completeButton = page.getByRole('button', { name: 'Complete Set' });
            if (await completeButton.isVisible()) {
                await completeButton.click();
            }
        }

        await expect(page.getByText('Session Complete')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save Workout' })).toBeVisible();
    });

    test('US-GYM-05: History defaults to monthly calendar view', async ({ page }) => {
        await page.getByRole('button', { name: 'History' }).click();

        await expect(page.getByText('Monthly Calendar')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Prev Month' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'This Month' })).toBeVisible();
    });

    test('US-GYM-07: Out-of-order training completes all sets of the current exercise before moving on', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Jump to Row Machine (exercise 2) before touching Bench Press (exercise 1)
        await page.getByRole('button', { name: /Row Machine/ }).click();
        await expect(page.getByText('Exercise 2 of 3')).toBeVisible();

        // Complete set 1/3 — should stay on Row Machine, not jump to Bench Press
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByText(/Set 2\/3/)).toBeVisible(); // Row Machine set 2, not Bench Press set 1
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await expect(page.getByText('Exercise 2 of 3')).toBeVisible(); // still on Row Machine

        // Complete set 2/3 — still Row Machine
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await expect(page.getByText('Exercise 2 of 3')).toBeVisible();

        // Complete set 3/3 — Row Machine fully done, now jumps to Bench Press
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByText(/Set 1\/3/)).toBeVisible(); // Bench Press set 1
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await expect(page.getByText('Exercise 1 of 3')).toBeVisible(); // now on Bench Press
    });

    test('US-GYM-08: Rest screen Up Next shows weight for the next set', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        // Navigate to Row Machine so we can distinguish its 45kg from Bench Press 60kg
        await page.getByRole('button', { name: /Row Machine/ }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click();

        // Rest screen: Up Next should show Row Machine with its weight and correct set count
        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByText(/Set 2\/3/)).toBeVisible();
        // The blue weight badge is a <span> — more specific than the pill which uses a <div>
        await expect(page.locator('span').filter({ hasText: '45kg' })).toBeVisible();
    });

    test('US-GYM-09: Exercise pills in the nav strip show per-exercise weight labels', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Pills should show the weight for each exercise immediately on workout start
        await expect(page.getByText('60kg')).toBeVisible(); // Bench Press
        await expect(page.getByText('45kg')).toBeVisible(); // Row Machine
        await expect(page.getByText('1mins')).toBeVisible(); // Plank
    });

    test('US-GYM-10: Abandon session discards progress and shows no Active Session banner', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await page.getByRole('button', { name: 'Complete Set' }).click();

        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Abandon' }).click();

        // Abandon clears the session and navigates to history
        await expect(page.getByText('Workout History')).toBeVisible();
        // Back to dashboard — no Active Session banner (session was discarded)
        await page.getByRole('button', { name: /Back/ }).first().click();
        await expect(page.getByText('Active Session')).not.toBeVisible();
    });

    test('US-GYM-11: Physical back button from workout preserves the session', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();

        // Simulate the phone/browser back button
        await page.evaluate(() => window.history.back());

        // Should land on dashboard with an Active Session resume banner
        await expect(page.getByText('Active Session')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    });

    test('US-GYM-12: Resume from dashboard restores the workout state', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();

        await page.evaluate(() => window.history.back());
        await expect(page.getByText('Active Session')).toBeVisible();

        await page.getByRole('button', { name: 'Resume' }).click();

        // Workout restored at the same point
        await expect(page.getByRole('button', { name: 'Complete Set' })).toBeVisible();
    });

    test('US-GYM-13: Completing one exercise out of order does not trigger Session Complete', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Do all 2 sets of Plank (exercise 3) without touching the others
        await page.getByRole('button', { name: /Plank/ }).click();
        await expect(page.getByText('Exercise 3 of 3')).toBeVisible();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // Plank fully done

        // Must NOT declare the workout complete — Bench Press and Row Machine remain
        await expect(page.getByText('Session Complete')).not.toBeVisible();
        await expect(page.getByText('Up Next')).toBeVisible();
    });

    test('US-GYM-14: Save & Complete with partial completion exits the workout', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // one set done

        // Save & Complete without finishing all sets
        await page.getByRole('button', { name: 'Save & Complete' }).click();

        // Navigated to history, no active session remaining
        await expect(page.getByText('Workout History')).toBeVisible();
        await page.getByRole('button', { name: /Back/ }).first().click();
        await expect(page.getByText('Active Session')).not.toBeVisible();
    });

    test('US-GYM-15: Up Next shows correct set number when an exercise is partially complete', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();
        await page.getByRole('button', { name: /Row Machine/ }).click();

        // Complete sets 1 and 2; after set 2 rest begins
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click();

        // Rest screen should show the third set coming up, not reset to set 1
        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByText(/Set 3\/3/)).toBeVisible();
    });

    test('US-GYM-16: Full out-of-order workout correctly reaches Session Complete', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Row Machine first (3 sets — stays on Row Machine, then jumps to Bench Press)
        await page.getByRole('button', { name: /Row Machine/ }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // set 3 → jumps to Bench Press
        await page.getByRole('button', { name: 'Skip Rest' }).click();

        // Bench Press now (3 sets)
        await expect(page.getByText('Exercise 1 of 3')).toBeVisible();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // set 3 → jumps to Plank
        await page.getByRole('button', { name: 'Skip Rest' }).click();

        // Plank now (2 sets — all done after set 2)
        await expect(page.getByText('Exercise 3 of 3')).toBeVisible();
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // last set → Session Complete

        await expect(page.getByText('Session Complete')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save Workout' })).toBeVisible();
    });

    test('US-GYM-17: History exercise row shows "Progress" label, not "Open Progress"', async ({ page }) => {
        // Seed a completed session directly into mock storage
        await page.evaluate(() => {
            localStorage.setItem('MOCK_DB_GYM_SESSIONS', JSON.stringify([{
                id: 's1',
                startedAt: Date.now() - 3600000,
                endedAt: Date.now(),
                dayId: 'gd1',
                dayName: 'Push Day',
                status: 'completed',
                exercisesCompleted: [{
                    exerciseId: 'gx1', exerciseName: 'Bench Press',
                    completedSets: 3, targetReps: 8, totalReps: 24,
                    totalVolume: 1440, unit: 'kg', metric: 'weight',
                    setTargets: ['60kg', '60kg', '60kg']
                }]
            }]));
        });

        await page.getByRole('button', { name: 'History' }).click();
        // Click the calendar day that has a training session (shows ✓)
        await page.locator('button').filter({ hasText: '✓' }).first().click();

        await expect(page.getByText('Progress').last()).toBeVisible();
        await expect(page.getByText('Open Progress')).not.toBeVisible();
    });

    test('US-GYM-06: Starting a workout does not crash on legacy malformed gym data', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx_old_1', name: 'Legacy Bench', setCount: 3, targetReps: 8, restTimeSeconds: 90 },
                { id: 'gx_old_2', name: 'Legacy Row', targetReps: 10 }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd_old_1', name: 'Legacy Day' }
            ]));
            localStorage.removeItem('health_tracker_active_workout');
        });

        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText('Routine has no valid exercises.')).toBeVisible();
        expect(pageErrors).toEqual([]);
    });

});
