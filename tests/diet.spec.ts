import { test, expect } from '@playwright/test';

test.describe('Diet Requirements', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
            localStorage.setItem('activeTab', 'diet'); // Force diet tab
            localStorage.removeItem('MOCK_DB_DIET'); // Ensure clean state
        });
        // We mock the date to ensure consistent testing if needed, or rely on loose matching.
        await page.goto('/');
    });

    test('US-DIET-04, 07, 08: View Logs with Distinction and Timestamps', async ({ page }) => {
        // Should see "Diet Tracker" heading
        await expect(page.getByRole('heading', { name: 'Diet Tracker' })).toBeVisible();

        // Check for "Salad" (Food) - Pre-seeded by E2E_TEST_MODE
        const foodEntry = page.locator('div.group').filter({ hasText: 'Salad' }).first();
        await expect(foodEntry).toBeVisible();
        await expect(foodEntry).toContainText('Healthy lunch');
        await expect(foodEntry).toContainText(/🍽️/); // Icon check

        // Verify timestamps are present
        await expect(page.locator('body')).toHaveText(/[0-9]{1,2}:[0-9]{2}/);
    });

    test('US-DIET-10: Quick Add Actions', async ({ page }) => {
        // Verify buttons exist
        await expect(page.getByRole('button', { name: 'Log Food' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Log Medicine' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Log Symptom' })).toBeVisible();
    });

    test('US-DIET-01: Log Food Entry', async ({ page }) => {
        await page.getByRole('button', { name: 'Log Food' }).click();
        await expect(page.getByRole('heading', { name: 'Log Food' })).toBeVisible();

        await page.getByPlaceholder('e.g. Scrambled Eggs').fill('Apple');
        await page.getByPlaceholder('Any additional details...').fill('Snack');
        await page.getByRole('button', { name: 'Save' }).click();

        // Modal closes
        await expect(page.getByRole('heading', { name: 'Log Food' })).not.toBeVisible();

        // Verify it was added
        await expect(page.getByText('Apple')).toBeVisible();
    });

    test('US-DIET-06: Symptom Context', async ({ page }) => {
        await page.getByRole('button', { name: 'Log Symptom' }).click();

        // Check for context fields
        await expect(page.getByText('How long after eating?')).toBeVisible();

        // Select a delay (e.g., 1h)
        await page.getByRole('button', { name: '1h' }).click();

        // Verify intensity slider exists
        await expect(page.getByText('Intensity (1-5)')).toBeVisible();

        // Fill name
        await page.getByPlaceholder('e.g. Bloating').fill('Nausea');

        await page.getByRole('button', { name: 'Save' }).click();

        // Verify it was added
        await expect(page.getByText('Nausea')).toBeVisible();
    });

    test('US-DIET-05: Delete Log Entry', async ({ page }) => {
        // Create an entry to delete
        await page.getByRole('button', { name: 'Log Food' }).click();
        await page.getByPlaceholder('e.g. Scrambled Eggs').fill('To Delete');
        await page.getByRole('button', { name: 'Save' }).click();

        // Hover over entry to see delete button
        const entry = page.locator('div.group').filter({ hasText: 'To Delete' }).first();
        await entry.hover();

        // Click delete (trash icon). We use force: true because of the group-hover opacity logic.
        await entry.locator('button').click({ force: true });

        // Confirm modal
        await expect(page.getByText('Delete Log Entry?')).toBeVisible();
        await expect(page.getByText('Are you sure you want to remove "To Delete"?')).toBeVisible();

        await page.getByRole('button', { name: 'Delete' }).click();

        // Modal closes
        await expect(page.getByText('Delete Log Entry?')).not.toBeVisible();
        await expect(entry).not.toBeVisible();
    });

    // NEW TEST
    test('US-DIET-11, 12, 13: Multi-Tab Drafting', async ({ page }) => {
        await page.getByRole('button', { name: 'Log Food' }).click();

        // 1. Fill Food
        await page.getByPlaceholder('e.g. Scrambled Eggs').fill('Pizza');

        // 2. Switch to Medicine
        await page.getByRole('button', { name: 'Medicine', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Log Medicine' })).toBeVisible();

        // 3. Verify Food tab has indicator (we check for the dot span)
        // The dot is inside the button. The button text is "Food".
        // We can check if the "Food" button contains a span with dot class or just simpler check.
        // We'll check if the "Food" button has a descendant span (the dot).
        const foodTab = page.getByRole('button', { name: 'Food', exact: true });
        // The dot is a span with absolute positioning.
        await expect(foodTab.locator('span')).toHaveClass(/bg-blue-500/);

        // 4. Fill Medicine
        await page.getByPlaceholder('e.g. Multivitamin').fill('Ibuprofen');

        // 5. Button should say "Save 2 Entries"
        await expect(page.getByRole('button', { name: 'Save 2 Entries' })).toBeVisible();

        // 6. Save
        await page.getByRole('button', { name: 'Save 2 Entries' }).click();

        // 7. Verify both
        await expect(page.locator('div').filter({ hasText: 'Pizza' }).first()).toBeVisible();
        await expect(page.locator('div').filter({ hasText: 'Ibuprofen' }).first()).toBeVisible();
    });

});
