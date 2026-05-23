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

        await expect(page.getByText('Rest Interval')).toBeVisible();
        await expect(page.getByText('Next Exercise')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Go To Next Unfinished' })).toBeVisible();

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

});
