import { test, expect } from '@playwright/test';

test.describe('Common Requirements', () => {

    test('US-COMMON-01: Secure Authentication - Redirects to login if not authenticated', async ({ page }) => {
        await page.goto('/');
        // Check for login screen elements
        await expect(page.getByText('Sign in to access your records')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
        // Ensure main app content is not visible
        await expect(page.getByText('Health Tracker', { exact: true })).not.toBeVisible();
    });

    test('US-COMMON-01: Secure Authentication - Access with authenticated user', async ({ page }) => {
        // Inject mock user credential before load
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
        });
        await page.goto('/');

        await expect(page.getByText('Health Tracker', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    });

    test('US-COMMON-02: Tab Navigation', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
        });
        await page.goto('/');

        // Verify default tab
        await expect(page.getByRole('heading', { name: 'Vaccine Tracker' })).toBeVisible();

        // Click Diet tab
        await page.getByRole('button', { name: 'Diet' }).click();
        await expect(page.getByRole('heading', { name: 'Diet Tracker' })).toBeVisible();

        // Click Vaccines tab
        await page.getByRole('button', { name: 'Vaccines' }).click();
        await expect(page.getByRole('heading', { name: 'Vaccine Tracker' })).toBeVisible();
    });

});
