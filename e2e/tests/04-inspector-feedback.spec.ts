import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { INSPECTOR, EQUIPMENT_1 } from '../fixtures/test-data';

/**
 * Helper: navigate to the inspection detail page for the "Pronta para Revisao" inspection.
 * Handles form lock loading by reloading the page if the client component stays stuck.
 */
async function navigateToReviewInspection(page: Page) {
  await page.goto('/dashboard/inspecoes');
  await page.waitForURL('**/inspecoes');
  await page.waitForTimeout(2000);

  // Find the row with "Pronta para Revisao" status (there may be duplicate inspections)
  const targetRow = page.locator('tr', { hasText: 'Pronta para Revisao' }).first();
  await expect(targetRow).toBeVisible({ timeout: 10000 });
  await targetRow.getByRole('link', { name: 'Ver' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Wait for the client component (InspectionDetailClient) to finish loading.
  // The form lock hook can sometimes hang; if so, reload to retry.
  const summaryVisible = await page.getByText('Resumo da Avaliacao').isVisible({ timeout: 10000 }).catch(() => false);
  if (!summaryVisible) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
  }
}

test.describe.serial('04 - Inspector Feedback', () => {
  // Increase timeout for tests that hit the inspection detail page (form lock can be slow)
  test.setTimeout(60000);

  test('Inspector login to check feedback', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(2000);

    // Verify inspector name appears
    await expect(page.getByText(INSPECTOR.name, { exact: true })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-inspector-login.png' });
  });

  test('Inspector sees inspection with ready for review status', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(2000);

    // Navigate to inspections page
    await page.goto('/dashboard/inspecoes');
    await page.waitForURL('**/inspecoes');
    await page.waitForTimeout(2000);

    // Verify inspection for EQUIPMENT_1 exists in list (use .first() for duplicate data)
    await expect(
      page.getByRole('cell', { name: new RegExp(EQUIPMENT_1.copelRa) }).first()
    ).toBeVisible({ timeout: 10000 });

    // Verify status shows "Pronta para Revisao" in the table (set by spec 02 completion)
    // Scope to <table> to avoid matching the hidden <option> in the status filter dropdown
    const table = page.locator('table');
    await expect(
      table.getByText('Pronta para Revisao').first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-inspection-status.png' });
  });

  test('Inspector opens inspection and sees checklist data', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(2000);

    await navigateToReviewInspection(page);

    // Wait for form lock to resolve and checklist to render
    // Verify the inspection detail page loaded with checklist items visible
    await expect(
      page.getByText('Alavanca Amarela').first()
    ).toBeVisible({ timeout: 30000 });

    // Verify status badge "Pronta para Revisao" is visible on the detail page
    await expect(
      page.getByText('Pronta para Revisao').first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-inspection-detail.png' });
  });

  test('Inspector sees inspection list with completed inspection', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(2000);

    // Navigate to inspections page
    await page.goto('/dashboard/inspecoes');
    await page.waitForURL('**/inspecoes');
    await page.waitForTimeout(2000);

    // Verify the inspection for RA-TEST-001 appears in the list
    await expect(page.getByText(EQUIPMENT_1.copelRa).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-inspector-inspection-list.png' });
  });

  test('Inspector logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(2000);

    await loginPage.logout();
    await loginPage.expectLoginPage();

    await page.screenshot({ path: 'e2e/results/04-inspector-logout.png' });
  });
});
