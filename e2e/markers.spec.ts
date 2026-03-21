import { test, expect } from '@playwright/test';

test.describe('Blood Markers Requirements', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('E2E_TEST_USER', 'true');
            localStorage.setItem('E2E_TEST_MODE', 'true');
        });
        await page.goto('/');

        // Navigate to the Markers tab
        await page.getByRole('button', { name: 'Markers' }).click();
        await expect(page.getByText('Track and visualize your health metrics over time')).toBeVisible();
    });

    test('US-MARKER-01: Manage Markers (Add, Edit, Delete)', async ({ page }) => {
        // Open Manage Markers Modal
        await page.getByRole('button', { name: 'Manage Markers' }).click();
        await expect(page.getByText('Add or edit tracked markers')).toBeVisible();

        // 1. Add Marker
        await page.getByRole('button', { name: 'Add New Marker' }).click();
        await page.getByPlaceholder('e.g. LDL Cholesterol').fill('Test Marker A');
        await page.getByPlaceholder('e.g. mmol/L, mg/dL').fill('units');
        await page.getByPlaceholder('e.g. 3.0').fill('10');
        await page.getByPlaceholder('e.g. 5.0').fill('20');
        await page.getByRole('button', { name: 'Save Marker' }).click();

        // Should appear in the list
        await expect(page.getByText('Test Marker A (units)')).toBeVisible();
        await expect(page.getByText('Normal Range: 10 to 20')).toBeVisible();

        // 2. Edit Marker
        // The list item triggers Edit automatically on click
        await page.getByText('Test Marker A (units)').click();
        await page.getByPlaceholder('e.g. LDL Cholesterol').fill('Edited Marker A');
        await page.getByRole('button', { name: 'Save Marker' }).click();
        await expect(page.getByText('Edited Marker A (units)')).toBeVisible();

        // 3. Delete Marker
        // We need to click the trash icon for "Edited Marker A"
        // Setup an auto-accept for the confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        await page.locator('div').filter({ hasText: /^Edited Marker A \(units\)Normal Range: 10 to 20$/ }).getByRole('button').nth(1).click();

        // Should be gone
        await expect(page.getByText('Edited Marker A (units)')).not.toBeVisible();

        // Close Modal
        await page.getByRole('button').first().click(); // X button
    });

    test('US-MARKER-02: Log Marker Records', async ({ page }) => {
        // Initial mock data has 'LDL Cholesterol' record with value 6.2 and 4.8
        await expect(page.getByText('LDL Cholesterol').first()).toBeVisible();

        // Add a new record via FAB
        await page.locator('.fixed.bottom-6.right-6 > button').click();

        // Form should be visible
        await expect(page.getByText('Log a new blood test result')).toBeVisible();

        // Select 'LDL Cholesterol' (it should be selected by default if it's the only one)
        await page.getByRole('combobox').selectOption({ label: 'LDL Cholesterol' });

        // Let's set the date and value
        await page.locator('input[type="date"]').fill('2025-10-20');
        await page.getByPlaceholder('e.g. 4.8').fill('5.5');

        await page.getByRole('button', { name: 'Save' }).click();

        // Should appear in the list with recent date
        await expect(page.getByText('5.5')).toBeVisible();

        // Edit record
        await page.locator('div').filter({ hasText: /^LDL Cholesterol2025-10-205\.5$/ }).getByRole('button').first().click();
        await page.getByPlaceholder('e.g. 4.8').fill('5.7');
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByText('5.7')).toBeVisible();

        // Delete record
        page.on('dialog', dialog => dialog.accept());
        await page.locator('div').filter({ hasText: /^LDL Cholesterol2025-10-205\.7$/ }).getByRole('button').nth(1).click();

        await expect(page.getByText('5.7')).not.toBeVisible();
    });

    test('US-MARKER-03 & 04: Visualize Timeline Graph and Reference', async ({ page }) => {
        // Graph should be visible
        await expect(page.getByText('Timeline Analysis')).toBeVisible();
        // Since we have mock data, the line graph svg should be painted with paths
        await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });

    test('US-MARKER-05 & 06: Import Flow', async ({ page }) => {
        // Click Import
        await page.getByRole('button', { name: 'Import Document' }).click();
        await expect(page.getByText('Extract markers from document')).toBeVisible();

        // Attach a dummy file
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test_report.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('dummy pdf content')
        });

        // Click Parse
        await page.getByRole('button', { name: 'Extract Data' }).click();

        // The mock will return two items
        await expect(page.getByText('Extracted Results')).toBeVisible();
        await expect(page.getByText('Vitamin D (ng/mL)')).toBeVisible();
        await expect(page.getByText('25')).toBeVisible(); // Vitamin D value

        // Unselect the first row
        await page.getByRole('cell', { name: 'LDL Cholesterol (mmol/L)' }).click(); // clicks on the row

        // Confirm
        page.on('dialog', dialog => dialog.accept()); // The hacky alert 
        await page.getByRole('button', { name: 'Confirm Import' }).click();

        // Modal should close shortly (due to setTimeout)
        await page.waitForTimeout(2000);
        await expect(page.getByText('Extract markers from document')).not.toBeVisible();
    });
});
