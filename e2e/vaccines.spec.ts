import { test, expect } from '@playwright/test';

test.describe('Vaccine Requirements', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
        });
        await page.goto('/');
    });

    test('US-VACCINE-02: View Upcoming Vaccinations', async ({ page }) => {
        // Based on mock data in StorageService:
        // { id: 'v2', name: 'Tetanus', nextDueDate: '2024-05-01', ... }

        const upcomingSection = page.locator('div.mb-8').filter({ has: page.getByText('Upcoming') }).first();

        await expect(upcomingSection.getByText('Tetanus')).toBeVisible();
        await expect(upcomingSection.getByText('Due: 2026-05-01')).toBeVisible();
    });

    test('US-VACCINE-01: Add Vaccine Record', async ({ page }) => {
        // Open modal
        await page.locator('button').filter({ hasText: 'Health Tracker' }).locator('..').locator('..').locator('button.bg-blue-600').click();
        // Wait, the FAB button is fixed bottom right. 
        // Let's find simpler selector. The FAB has a PlusIcon.
        await page.locator('.fixed.bottom-6.right-6 > button').click();

        await expect(page.getByText('Add Vaccination')).toBeVisible();

        // Fill form
        await page.getByPlaceholder('e.g. Influenza').fill('COVID-19 Booster');
        await page.getByLabel('Date Taken').fill('2024-01-01');

        // Save (mocked, so won't persist to DB but UI might react or close modal)
        // Since StorageService is mocked to return static array on subscribe, 
        // the UI list won't update with the new item unless we update the mock logic or the UI does optimistic updates.
        // The current StorageService mock just calls onUpdate with static list. 
        // So the list won't update.
        // However, we can verify the interaction works.

        await page.getByText('Save Record').click();

        // Modal should close
        await expect(page.getByText('Add Vaccination')).not.toBeVisible();
    });

    test('US-VACCINE-03: AI Vaccine Suggestions', async ({ page }) => {
        // Mock returns 'Shingles' as suggestion
        // Need to expand the suggestions if collapsed
        // Text: "Might Be Missing"

        await expect(page.getByText('Might Be Missing')).toBeVisible();
        await expect(page.getByText('Shingles')).toBeVisible();
        await expect(page.getByText('Recommended for age group')).toBeVisible();
    });

});
