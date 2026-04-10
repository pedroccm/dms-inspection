import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { EXECUTOR } from '../fixtures/test-data';

/**
 * Helper: navigate to the inspection detail page for the "Pronta para Revisão" inspection.
 * Handles form lock loading by reloading the page if the client component stays stuck.
 */
async function navigateToReviewInspection(page: Page) {
  await page.goto('/dashboard/inspecoes');
  await page.waitForURL('**/inspecoes');
  await page.waitForTimeout(2000);

  // Find the row with "Pronta para Revisão" status
  const targetRow = page.locator('tr', { hasText: 'Pronta para Revisão' }).first();
  await expect(targetRow).toBeVisible({ timeout: 10000 });
  await targetRow.getByRole('link', { name: 'Ver' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Wait for the client component (InspectionDetailClient) to finish loading.
  const summaryVisible = await page.getByText('Resumo da Avaliação').isVisible({ timeout: 10000 }).catch(() => false);
  if (!summaryVisible) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
  }
}

test.describe.serial('04 - Executor Feedback', () => {
  // Increase timeout for tests that hit the inspection detail page
  test.setTimeout(60000);

  test('Executor login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(3000);

    // Verify executor name appears
    await expect(page.getByText(EXECUTOR.name, { exact: true })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-executor-login.png' });
  });

  test('Executor sees inspection in list', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

    // Navigate to inspections page
    await page.goto('/dashboard/inspecoes');
    await page.waitForURL('**/inspecoes');
    await page.waitForTimeout(2000);

    // Verify inspection with "Pronta para Revisão" status exists in the table
    const table = page.locator('table');
    await expect(
      table.getByText('Pronta para Revisão').first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/04-executor-inspection-list.png' });
  });

  test('Executor opens inspection in read-only mode', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

    await navigateToReviewInspection(page);

    // Wait for the page to load
    const hasContent = await Promise.race([
      page.getByText('Alavanca Amarela').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false),
      page.getByText('Pronta para Revisão').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false),
    ]);

    expect(hasContent).toBeTruthy();

    // Verify status is "Pronta para Revisão"
    await expect(page.getByText('Pronta para Revisão').first()).toBeVisible({ timeout: 10000 });

    // Verify read-only: no "Concluir Avaliação" button visible
    await expect(
      page.getByRole('button', { name: /Concluir Avaliação/i })
    ).toBeHidden();

    // Verify read-only: no Aprovado/Reprovado/NA action buttons in checklist
    // (status buttons only have aria-label pattern "Status - ItemName" when editable)
    await expect(
      page.locator('button[aria-label^="Aprovado - "]').first()
    ).toBeHidden();

    await page.screenshot({ path: 'e2e/results/04-executor-read-only.png' });
  });

  test('Executor logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

    await loginPage.logout();
    await loginPage.expectLoginPage();

    await page.screenshot({ path: 'e2e/results/04-executor-logout.png' });
  });
});
