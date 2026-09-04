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

    test('US-GYM-18: Time-based sets are saved in seconds, not mislabelled as minutes', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Plank is the only time-based exercise: 2 sets targeting "1mins" each.
        await page.getByRole('button', { name: /Plank/ }).click();
        await expect(page.getByText('Exercise 3 of 3')).toBeVisible();

        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Complete Set' }).click(); // Plank fully done

        // Save with the other two exercises untouched, so the session holds only the Plank summary.
        await page.getByRole('button', { name: 'Save & Complete' }).click();
        await expect(page.getByText('Workout History')).toBeVisible();

        await page.locator('button').filter({ hasText: '✓' }).first().click();

        // Two sets targeting one minute each = 120 seconds. The old code stored 2 and called it "mins",
        // or stored the measured seconds and still called them "mins".
        const plankRow = page.getByRole('button').filter({ hasText: 'Plank' });
        await expect(plankRow).toContainText('120 s');
        await expect(plankRow).not.toContainText('mins');
    });

    // US-GYM-19 — editing exercise notes mid-session.

    test('US-GYM-19: A note added during a set is saved onto the exercise itself', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Bench Press has no note yet, so the field offers to add one.
        await page.getByRole('button', { name: 'Add note' }).click();
        await page.getByLabel('Exercise note').fill('Elbows tucked, pause on chest');
        await page.getByRole('button', { name: 'Done' }).click();

        await expect(page.getByText('Elbows tucked, pause on chest')).toBeVisible();

        // The note lives on the exercise, so the library shows it too.
        await page.evaluate(() => window.history.back());
        await page.getByRole('button', { name: 'Routines' }).click();
        await page.getByRole('button', { name: 'Exercises' }).click();
        await page.getByRole('button', { name: 'Edit' }).first().click();

        await expect(page.getByPlaceholder('e.g. Keep elbows tucked'))
            .toHaveValue('Elbows tucked, pause on chest');
    });

    test('US-GYM-19: During rest the note belongs to the exercise shown under Up Next', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            // Bench Press has a single set, so completing it hands the rest screen over to Row Machine.
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', notes: 'Bench cue', setCount: 1, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg'] },
                { id: 'gx2', name: 'Row Machine', notes: 'Row cue', setCount: 3, targetReps: 10, restTimeSeconds: 75, setTargets: ['45kg', '45kg', '45kg'] }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1', 'gx2'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(page.getByText('Up Next')).toBeVisible();
        // Exact match: the nav pill above also reads "Row Machine", just with its weight appended.
        await expect(page.getByText('Row Machine', { exact: true })).toBeVisible();

        // Up Next is now Row Machine, so its note is the one on offer — not the finished Bench Press.
        await expect(page.getByText('Bench cue')).not.toBeVisible();
        await page.getByRole('button', { name: 'Edit note' }).click();
        await page.getByLabel('Exercise note').fill('Squeeze at the top');
        await page.getByRole('button', { name: 'Done' }).click();

        await expect(page.getByText('Squeeze at the top')).toBeVisible();
        await expect(page.getByText('Row cue')).not.toBeVisible();

        // The countdown must not have been restarted or skipped by the edit.
        await expect(page.getByRole('button', { name: 'Skip Rest' })).toBeVisible();
    });

    test('US-GYM-19: Tapping away from the field saves the note rather than discarding it', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        await page.getByRole('button', { name: 'Add note' }).click();
        await page.getByLabel('Exercise note').fill('Typed then tapped away');
        // A phone user dismisses the keyboard by tapping elsewhere; that must not lose the note.
        await page.getByLabel('Exercise note').blur();

        await expect(page.getByText('Typed then tapped away')).toBeVisible();
    });

    test('US-GYM-19: Clearing the text removes the note', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', notes: 'Old cue', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'] }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await page.getByRole('button', { name: 'Edit note' }).click();
        await page.getByLabel('Exercise note').fill('');
        await page.getByRole('button', { name: 'Done' }).click();

        await expect(page.getByText('Old cue')).not.toBeVisible();
        // With no note left, the field goes back to offering to add one.
        await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
    });

    // US-GYM-20 — editing reps per set, and recalling what was actually performed last time.

    test('US-GYM-20: Reps tile is a stepper, not a static display', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByRole('button', { name: 'Increase reps' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Decrease reps' })).toBeVisible();

        // Bench Press has no recorded history yet, so it opens on the configured target, 8.
        const repsTile = page.getByRole('button', { name: 'Increase reps' }).locator('../..');
        await expect(repsTile).toContainText('8');
    });

    test('US-GYM-20: Completing a set records the reps actually shown, not the configured target', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        const increase = page.getByRole('button', { name: 'Increase reps' });
        const repsTile = increase.locator('../..');
        await expect(repsTile).toContainText('8');
        await increase.click();
        await increase.click();
        await expect(repsTile).toContainText('10');

        await page.getByRole('button', { name: 'Complete Set' }).click();
        // Save with just this one set done, and check what got recorded.
        await page.getByRole('button', { name: 'Save & complete session' }).click();

        await expect(page.getByText('Workout History')).toBeVisible();
        await page.locator('button').filter({ hasText: '✓' }).first().click();
        // 1 set at 10 reps — not the configured target of 8.
        await expect(page.getByText('1 sets • 10 reps')).toBeVisible();
    });

    test('US-GYM-20: Next time this exercise is started, each set recalls what was actually performed on that same set last time', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { 0: 10, 1: 9, 2: 8 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        const repsTile = page.getByRole('button', { name: 'Increase reps' }).locator('../..');
        await expect(repsTile).toContainText('10'); // set 1 recalls 10, not the configured target of 8

        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await expect(repsTile).toContainText('9'); // set 2 recalls 9

        await page.getByRole('button', { name: 'Complete Set' }).click();
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await expect(repsTile).toContainText('8'); // set 3 recalls 8
    });

    test('US-GYM-20: Recalled reps take priority even when the configured target has since changed', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            // Recorded at 10/9/8; targetReps has since been changed to 12.
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 12, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { 0: 10, 1: 9, 2: 8 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        const repsTile = page.getByRole('button', { name: 'Increase reps' }).locator('../..');
        await expect(repsTile).toContainText('10');
        await expect(repsTile).not.toContainText('12');
    });

    test('US-GYM-20: An exercise reconfigured with more sets still recalls the sets that have history and falls back for new ones', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            // Previously done with 3 sets (10/9/8); reconfigured to 5 sets targeting 6 reps.
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 5, targetReps: 6, restTimeSeconds: 0, setTargets: ['60kg', '60kg', '60kg', '60kg', '60kg'], lastActualReps: { 0: 10, 1: 9, 2: 8 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        const repsTile = page.getByRole('button', { name: 'Increase reps' }).locator('../..');
        await expect(repsTile).toContainText('10'); // set 1: recalled
        await page.getByRole('button', { name: 'Complete Set' }).click(); // no rest configured, stays active
        await expect(repsTile).toContainText('9'); // set 2: recalled
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(repsTile).toContainText('8'); // set 3: recalled
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(repsTile).toContainText('6'); // set 4: no history for this index, falls back to the target
    });

    test('US-GYM-20: Abandoning a session still remembers the reps from sets that were completed', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        const increase = page.getByRole('button', { name: 'Increase reps' });
        await increase.click();
        await increase.click(); // Bench Press set 1: 8 -> 10
        await page.getByRole('button', { name: 'Complete Set' }).click();

        page.on('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Skip Rest' }).click();
        await page.getByRole('button', { name: 'Abandon' }).click();

        await expect(page.getByText('Workout History')).toBeVisible();
        await page.getByRole('button', { name: /Back/ }).first().click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        // A fresh workout for the same routine — Bench Press set 1 recalls 10, not the abandoned session's loss.
        const repsTile = page.getByRole('button', { name: 'Increase reps' }).locator('../..');
        await expect(repsTile).toContainText('10');
    });

    test('US-GYM-20: Up Next panel during rest shows the same recalled reps as the upcoming set will open with', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.removeItem('health_tracker_active_workout');
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { 1: 9 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([
                { id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        // Set 1 has no recorded history (defaults to the target, 8); set 2 does (9).
        await page.getByRole('button', { name: 'Complete Set' }).click();
        await expect(page.getByText('Up Next')).toBeVisible();
        await expect(page.getByText(/9 reps/)).toBeVisible();
    });

    test('US-GYM-20: An unfinished edit to reps is preserved when navigating to another exercise and back', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        const increase = page.getByRole('button', { name: 'Increase reps' });
        const repsTile = increase.locator('../..');
        await increase.click();
        await increase.click();
        await expect(repsTile).toContainText('10');

        await page.getByRole('button', { name: /Row Machine/ }).click();
        await page.getByRole('button', { name: /Bench Press/ }).click();

        await expect(repsTile).toContainText('10');
    });

    test('US-GYM-21: With no cycle set up, the dashboard offers to set one up and shows no week markers', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Set up a training cycle/ })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Training cycle', exact: true })).not.toBeVisible();
    });

    test('US-GYM-21: Setting up a cycle shows the current week, defaulting to week 1 of a 4+1 cycle', async ({ page }) => {
        await page.getByRole('button', { name: /Set up a training cycle/ }).click();
        await expect(page.getByRole('heading', { name: 'Training Cycle' })).toBeVisible();
        await page.getByRole('button', { name: 'Set up cycle' }).click();

        // Anchored today, so we are in the first building week.
        await expect(page.getByText('Week 1 of 4')).toBeVisible();
    });

    test('US-GYM-21: A retroactive start date puts you in the right week of the cycle', async ({ page }) => {
        const start = new Date();
        start.setDate(start.getDate() - 15); // 2 whole weeks ago -> the third week
        const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

        await page.getByRole('button', { name: /Set up a training cycle/ }).click();
        await page.getByLabel('Cycle start date').fill(iso);
        await page.getByRole('button', { name: 'Set up cycle' }).click();

        await expect(page.getByText('Week 3 of 4')).toBeVisible();
    });

    test('US-GYM-21: Cycle configuration (building weeks and rep range) persists', async ({ page }) => {
        await page.getByRole('button', { name: /Set up a training cycle/ }).click();
        await page.getByRole('button', { name: 'More building weeks' }).click(); // 4 -> 5
        await page.getByLabel('Maximum reps').fill('15');
        await page.getByRole('button', { name: 'Set up cycle' }).click();

        // Five building weeks now, still the first of them.
        await expect(page.getByText('Week 1 of 5')).toBeVisible();

        // Reopen: the saved rep range is still there.
        await page.getByRole('button', { name: 'Training cycle', exact: true }).click();
        await expect(page.getByLabel('Maximum reps')).toHaveValue('15');
    });

    test('US-GYM-21: During a deload week the dashboard says so', async ({ page }) => {
        await page.addInitScript(() => {
            const anchor = new Date();
            anchor.setDate(anchor.getDate() - 30); // ~4 weeks in: the deload week of a 4+1 cycle
            const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();

        await expect(page.getByRole('button', { name: 'Training cycle', exact: true })).toContainText('Deload week');
    });

    test('US-GYM-21: A deload week shows a passive go-light reminder inside the workout', async ({ page }) => {
        await page.addInitScript(() => {
            const anchor = new Date();
            anchor.setDate(anchor.getDate() - 30);
            const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText('Deload Week')).toBeVisible();
        await expect(page.getByText('Go light')).toBeVisible();
    });

    test('US-GYM-21: A building week shows no deload reminder inside the workout', async ({ page }) => {
        await page.addInitScript(() => {
            const anchor = new Date(); // anchored today: first building week
            const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText('Deload Week')).not.toBeVisible();
    });

    test('US-GYM-22: Maxing the rep range on every set last time suggests adding weight', async ({ page }) => {
        await page.addInitScript(() => {
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { '0': 12, '1': 12, '2': 12 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([{ id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }]));
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText(/consider adding weight/i)).toBeVisible();
    });

    test('US-GYM-22: The suggestion is qualitative — no number, no automatic weight change', async ({ page }) => {
        await page.addInitScript(() => {
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { '0': 12, '1': 12, '2': 12 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([{ id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }]));
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        // The weight target is untouched by the suggestion.
        await expect(page.getByRole('spinbutton').first()).toHaveValue('60');
        // The suggestion names no target weight to jump to.
        const suggestion = page.getByText(/consider adding weight/i);
        await expect(suggestion).not.toContainText(/\d/);
    });

    test('US-GYM-22: No suggestion when a set fell short of the range top last time', async ({ page }) => {
        await page.addInitScript(() => {
            const today = new Date();
            const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { '0': 12, '1': 11, '2': 12 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([{ id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }]));
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText(/consider adding weight/i)).not.toBeVisible();
    });

    test('US-GYM-22: No suggestion during a deload week even if the range was maxed', async ({ page }) => {
        await page.addInitScript(() => {
            const anchor = new Date();
            anchor.setDate(anchor.getDate() - 30); // deload week of a 4+1 cycle
            const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { '0': 12, '1': 12, '2': 12 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([{ id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }]));
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText('Deload Week')).toBeVisible();
        await expect(page.getByText(/consider adding weight/i)).not.toBeVisible();
    });

    test('US-GYM-22: No suggestion without a configured cycle', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('MOCK_DB_GYM_EXERCISES', JSON.stringify([
                { id: 'gx1', name: 'Bench Press', setCount: 3, targetReps: 8, restTimeSeconds: 90, setTargets: ['60kg', '60kg', '60kg'], lastActualReps: { '0': 12, '1': 12, '2': 12 } }
            ]));
            localStorage.setItem('MOCK_DB_GYM_DAYS', JSON.stringify([{ id: 'gd1', name: 'Push Day', exerciseIds: ['gx1'] }]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'Start' }).first().click();

        await expect(page.getByText(/consider adding weight/i)).not.toBeVisible();
    });

    test('US-GYM-22: Lowering a set weight is saved, not discarded as a non-increase', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        const target = page.getByRole('spinbutton').first();
        await expect(target).toHaveValue('60');
        await target.fill('50');
        await target.blur();

        // Leave and resume, so the value has to come back from storage rather than local state.
        await page.evaluate(() => window.history.back());
        await page.getByRole('button', { name: 'Resume' }).click();

        await expect(page.getByRole('spinbutton').first()).toHaveValue('50');
    });

    test('US-GYM-22: Clearing the weight field restores the previous value instead of saving zero', async ({ page }) => {
        await page.getByRole('button', { name: 'Start' }).first().click();

        const target = page.getByRole('spinbutton').first();
        await target.fill('');
        await target.blur();

        await expect(target).toHaveValue('60');
        await expect(page.getByRole('button', { name: /Bench Press/ })).toContainText('60kg');
    });

    test('US-GYM-23: The progress chart overlays cycles, marking deload weeks and cycle boundaries', async ({ page }) => {
        await page.addInitScript(() => {
            const day = 24 * 60 * 60 * 1000;
            const start = new Date(Date.now() - 40 * day);
            const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
            const mkSession = (offsetDays: number, volume: number, id: string) => {
                const startedAt = start.getTime() + offsetDays * day;
                return {
                    id, startedAt, endedAt: startedAt + 3600000, dayId: 'gd1', dayName: 'Push Day', status: 'completed',
                    exercisesCompleted: [{ exerciseId: 'gx1', exerciseName: 'Bench Press', completedSets: 3, targetReps: 8, totalReps: 24, totalVolume: volume, unit: 'kg', metric: 'weight', setTargets: ['60kg', '60kg', '60kg'] }]
                };
            };
            localStorage.setItem('MOCK_DB_GYM_SESSIONS', JSON.stringify([
                mkSession(2, 1400, 's1'),   // cycle 1, building week
                mkSession(30, 1200, 's2'),  // cycle 1, deload week
                mkSession(38, 1500, 's3'),  // cycle 2, building week
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'History' }).click();
        await page.locator('button').filter({ hasText: '✓' }).first().click();
        await page.getByRole('button').filter({ hasText: 'Bench Press' }).click();

        await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();
        // Legend explains the overlay.
        await expect(page.getByText('Building week')).toBeVisible();
        await expect(page.getByText('Deload week')).toBeVisible();
        await expect(page.getByText('New cycle')).toBeVisible();
        // Exactly one cycle boundary (cycle 1 -> cycle 2) is drawn.
        await expect(page.locator('.recharts-reference-line')).toHaveCount(1);
        await expect(page.getByText('Cycle 2')).toBeVisible();
    });

    test('US-GYM-23: With no cycle configured the progress chart has no cycle overlay', async ({ page }) => {
        await page.addInitScript(() => {
            const day = 24 * 60 * 60 * 1000;
            const mkSession = (offsetDays: number, volume: number, id: string) => {
                const startedAt = Date.now() - offsetDays * day;
                return {
                    id, startedAt, endedAt: startedAt + 3600000, dayId: 'gd1', dayName: 'Push Day', status: 'completed',
                    exercisesCompleted: [{ exerciseId: 'gx1', exerciseName: 'Bench Press', completedSets: 3, targetReps: 8, totalReps: 24, totalVolume: volume, unit: 'kg', metric: 'weight', setTargets: ['60kg', '60kg', '60kg'] }]
                };
            };
            localStorage.setItem('MOCK_DB_GYM_SESSIONS', JSON.stringify([
                mkSession(5, 1400, 's1'),
                mkSession(2, 1500, 's2'),
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'History' }).click();
        await page.locator('button').filter({ hasText: '✓' }).first().click();
        await page.getByRole('button').filter({ hasText: 'Bench Press' }).click();

        await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();
        await expect(page.getByText('New cycle')).not.toBeVisible();
        await expect(page.locator('.recharts-reference-line')).toHaveCount(0);
    });

    test('US-GYM-23: A retroactively started cycle draws its start boundary against older pre-cycle history', async ({ page }) => {
        await page.addInitScript(() => {
            const day = 24 * 60 * 60 * 1000;
            const start = new Date(Date.now() - 3 * day); // cycle started 3 days ago, retroactively
            const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
            localStorage.setItem('MOCK_DB_GYM_CYCLE', JSON.stringify({ accumulationWeeks: 4, hasDeloadWeek: true, startDate: iso, repRangeMin: 8, repRangeMax: 12 }));
            const mkSession = (offsetDaysAgo: number, volume: number, id: string) => {
                const startedAt = Date.now() - offsetDaysAgo * day;
                return {
                    id, startedAt, endedAt: startedAt + 3600000, dayId: 'gd1', dayName: 'Push Day', status: 'completed',
                    exercisesCompleted: [{ exerciseId: 'gx1', exerciseName: 'Bench Press', completedSets: 3, targetReps: 8, totalReps: 24, totalVolume: volume, unit: 'kg', metric: 'weight', setTargets: ['60kg', '60kg', '60kg'] }]
                };
            };
            localStorage.setItem('MOCK_DB_GYM_SESSIONS', JSON.stringify([
                mkSession(20, 2750, 's1'), // before the cycle
                mkSession(10, 2750, 's2'), // before the cycle
                mkSession(1, 1300, 's3'),  // inside the new cycle
            ]));
        });
        await page.goto('/');
        await page.getByRole('button', { name: 'Gym' }).click();
        await page.getByRole('button', { name: 'History' }).click();
        await page.locator('button').filter({ hasText: '✓' }).first().click();
        await page.getByRole('button').filter({ hasText: 'Bench Press' }).click();

        await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();
        // The first cycle's start is a visible boundary, and older sessions are labelled pre-cycle.
        await expect(page.getByText('Before cycle')).toBeVisible();
        await expect(page.locator('.recharts-reference-line')).toHaveCount(1);
        await expect(page.getByText('Cycle 1')).toBeVisible();
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
