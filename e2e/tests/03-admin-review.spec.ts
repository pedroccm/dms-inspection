import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ADMIN, EQUIPMENT_1, INSPECTOR } from '../fixtures/test-data';

/**
 * Helper: navigate to the inspection detail page for the "Pronta para Revisão" inspection.
 * Handles form lock loading by reloading the page if the client component stays stuck.
 */
async function navigateToReviewInspection(page: Page) {
  await page.goto('/dashboard/inspecoes');
  await page.waitForURL('**/inspecoes');
  await page.waitForTimeout(2000);

  // Find the row with "Pronta para Revisão" status (there may be duplicate inspections)
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

test.describe.serial('03 - Admin Review', () => {
  // Increase timeout for tests that hit the inspection detail page (form lock can be slow)
  test.setTimeout(60000);

  test('Admin login for review', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(2000);

    // Verify admin name appears
    await expect(page.getByText(ADMIN.name)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/03-admin-login.png' });
  });

  test('Admin sees updated dashboard metrics', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Verify metric cards in main area (avoid sidebar conflicts)
    const main = page.getByRole('main');
    await expect(main.getByText('Equipamentos')).toBeVisible();
    await expect(main.getByText('Ordens Abertas')).toBeVisible();

    await page.screenshot({ path: 'e2e/results/03-dashboard-metrics.png' });
  });

  test('Admin sees inspector inspection in list', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Navigate to inspections page
    await page.goto('/dashboard/inspecoes');
    await page.waitForURL('**/inspecoes');
    await page.waitForTimeout(2000);

    // Verify inspection for EQUIPMENT_1 appears in list (use .first() for duplicate data)
    await expect(
      page.getByRole('cell', { name: new RegExp(EQUIPMENT_1.copelRa) }).first()
    ).toBeVisible({ timeout: 10000 });

    // Verify a status badge is visible in the table (should be "Pronta para Revisão" from spec 02)
    // Scope to <table> to avoid matching the hidden <option> in the status filter dropdown
    const table = page.locator('table');
    await expect(
      table.getByText('Pronta para Revisão').first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-inspection-list.png' });
  });

  test('Admin opens inspection and sees checklist, observations, and status', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    await navigateToReviewInspection(page);

    // Wait for page to fully load (form lock may delay rendering)
    // Try multiple indicators - any one means the page loaded
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

    await page.screenshot({ path: 'e2e/results/03-checklist-data.png' });

    // Verify the observations text is visible (set in spec 02)
    await expect(
      page.getByText('Equipamento em bom estado', { exact: false })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-observations.png' });

    // Verify status badge shows "Pronta para Revisão"
    await expect(page.getByText('Pronta para Revisão').first()).toBeVisible({ timeout: 10000 });

    // Status is "ready_for_review" (Pronta para Revisão)
    // Export button only appears for "aprovado" or "transferred" status
    // Transfer button only appears for "aprovado" status
    // So both should NOT be visible in the current state
    await expect(
      page.getByRole('button', { name: /Exportar para Webed/i })
    ).toBeHidden();

    await expect(
      page.getByRole('button', { name: /Marcar como Transferida/i })
    ).toBeHidden();

    await page.screenshot({ path: 'e2e/results/03-buttons-visibility.png' });
  });

  test('Admin views productivity report', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Navigate to reports page
    await page.goto('/dashboard/relatorios');
    await page.waitForTimeout(2000);

    // Verify "Produtividade por Executor" section exists
    await expect(page.getByText(/Produtividade/i)).toBeVisible();

    // Click "Ver Relatório" to open the productivity report
    await page.getByRole('link', { name: /Ver Relatório/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're on the productivity report page
    await expect(page.getByText('Relatório de Produtividade')).toBeVisible({ timeout: 10000 });

    // Verify inspector name appears in the report table (scope to table to avoid filter dropdown)
    const table = page.locator('table');
    await expect(
      table.getByText(INSPECTOR.name).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-productivity-report.png' });
  });

  test('Admin views audit log', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    await navigateToReviewInspection(page);

    // Look for "Historico de Alteracoes" collapsible button
    const auditToggle = page.getByRole('button', { name: /Historico de Alteracoes/i });
    await expect(auditToggle).toBeVisible({ timeout: 10000 });

    // Click to expand
    await auditToggle.click();
    await page.waitForTimeout(1000);

    // Verify audit entries exist (action labels: "Criacao", "Alteracao", "Remocao")
    await expect(
      page.getByText(/Criacao|Alteracao|Remocao/).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-audit-log.png' });
  });

  test('Admin logout after review', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    await loginPage.logout();
    await loginPage.expectLoginPage();

    await page.screenshot({ path: 'e2e/results/03-admin-logout.png' });
  });
});
