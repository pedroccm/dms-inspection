import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ADMIN, EXECUTOR } from '../fixtures/test-data';

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
  // The form lock hook can sometimes hang; if so, reload to retry.
  const summaryVisible = await page.getByText('Resumo da Avaliação').isVisible({ timeout: 10000 }).catch(() => false);
  if (!summaryVisible) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
  }
}

test.describe.serial('03 - Master Review', () => {
  // Increase timeout for tests that hit the inspection detail page (form lock can be slow)
  test.setTimeout(60000);

  test('Master login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(3000);

    // Verify admin name appears
    await expect(page.getByText(ADMIN.name)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-master-login.png' });
  });

  test('Master sees inspection in list with Pronta para Revisão status', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(3000);

    // Navigate to inspections page
    await page.goto('/dashboard/inspecoes');
    await page.waitForURL('**/inspecoes');
    await page.waitForTimeout(2000);

    // Verify a status badge "Pronta para Revisão" is visible in the table
    const table = page.locator('table');
    await expect(
      table.getByText('Pronta para Revisão').first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-master-inspection-list.png' });
  });

  test('Master opens inspection and sees checklist data and observations', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(3000);

    await navigateToReviewInspection(page);

    // Wait for page to fully load
    const loaded = await Promise.race([
      page.getByText(/Aprovados/).first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false),
      page.getByText('Alavanca Amarela').first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false),
      page.getByText('Pronta para Revisão').first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false),
    ]);

    // If nothing loaded, try reloading
    if (!loaded) {
      await page.reload();
      await page.waitForTimeout(5000);
    }

    // Verify checklist summary counts are visible
    await expect(page.getByText(/Aprovados/).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Reprovados/).first()).toBeVisible({ timeout: 5000 });

    // Verify "Alavanca Amarela" shows as a rejected item
    await expect(
      page.getByText('Alavanca Amarela').first()
    ).toBeVisible({ timeout: 10000 });

    // Verify the observations text is visible (set in spec 02)
    await expect(
      page.getByText('Equipamento em bom estado', { exact: false })
    ).toBeVisible({ timeout: 10000 });

    // Verify status badge shows "Pronta para Revisão"
    await expect(page.getByText('Pronta para Revisão').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-master-inspection-detail.png' });
  });

  test('Master views productivity report', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(3000);

    // Navigate to reports page
    await page.goto('/dashboard/relatorios');
    await page.waitForTimeout(2000);

    // Verify "Produtividade" section exists
    await expect(page.getByText(/Produtividade/i)).toBeVisible({ timeout: 10000 });

    // Click "Ver Relatório" to open the productivity report
    await page.getByRole('link', { name: /Ver Relatório/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're on the productivity report page
    await expect(page.getByText('Relatório de Produtividade')).toBeVisible({ timeout: 10000 });

    // Verify executor name appears in the report table
    const table = page.locator('table');
    await expect(
      table.getByText(EXECUTOR.name).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-master-productivity-report.png' });
  });

  test('Master logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(3000);

    await loginPage.logout();
    await loginPage.expectLoginPage();

    await page.screenshot({ path: 'e2e/results/03-master-logout.png' });
  });
});
