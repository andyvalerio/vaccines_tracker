import { test, expect } from '@playwright/test';

test.describe('Gym Tracker Requirements', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
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

        // Should be on Routines (Days) tab
        await expect(page.getByRole('heading', { name: 'My Routines' })).toBeVisible();

        // Go to exercises library
        await page.getByRole('button', { name: 'Global Exercises' }).click();
        await expect(page.getByRole('heading', { name: 'Exercise Library' })).toBeVisible();
    });

});
