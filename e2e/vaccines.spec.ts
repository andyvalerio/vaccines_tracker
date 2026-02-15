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
        // Open modal via the FAB button fixed at the bottom right
        await page.locator('.fixed.bottom-6.right-6 > button').click();

        await expect(page.getByText('Add New Record')).toBeVisible();

        // Fill form
        await page.getByPlaceholder('e.g. Tetanus, Flu Shot').fill('COVID-19 Booster');

        // Fill Latest Dose Taken (3 selects)
        await page.locator('select').first().selectOption({ label: '2024' });
        await page.locator('select').nth(1).selectOption({ label: 'Jan' });
        await page.locator('select').nth(2).selectOption({ label: '1' });

        // Save
        await page.getByText('Save Record').click();

        // Modal should close
        await expect(page.getByText('Add New Record')).not.toBeVisible();
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
