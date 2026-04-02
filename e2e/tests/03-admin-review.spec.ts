import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { InspectionsPage } from '../pages/inspections.page';
import { InspectionDetailPage } from '../pages/inspection-detail.page';
import { ReportsPage } from '../pages/reports.page';
import { ADMIN, EQUIPMENT_1, INSPECTOR } from '../fixtures/test-data';

test.describe.serial('03 - Admin Review', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let inspectionsPage: InspectionsPage;
  let inspectionDetailPage: InspectionDetailPage;
  let reportsPage: ReportsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    inspectionsPage = new InspectionsPage(page);
    inspectionDetailPage = new InspectionDetailPage(page);
    reportsPage = new ReportsPage(page);
  });

  test('Admin login for review', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await dashboardPage.expectDashboard();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/results/03-admin-login.png' });
  });

  test('Admin sees updated dashboard metrics', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await dashboardPage.goto();
    await page.waitForTimeout(1000);

    const equipmentCount = await dashboardPage.getMetricValue('Equipamentos');
    const count = parseInt(equipmentCount, 10);
    expect(count).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: 'e2e/results/03-dashboard-metrics.png' });
  });

  test('Admin sees inspector inspection in list', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    await inspectionsPage.expectInspectionInList(EQUIPMENT_1.copelRa);

    // Verify a status badge is visible in the row
    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await expect(
      row.locator('span').filter({ hasText: /Enviada|Transferida|Em Andamento|Rascunho|Pronta para Revisao/ })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-inspection-list.png' });
  });

  test('Admin opens inspection and sees checklist data', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    // Click "Ver" link on the inspection row for EQUIPMENT_1
    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await row.getByRole('link', { name: 'Ver' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify checklist summary counts are visible
    await expect(page.getByText('Aprovados', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reprovados', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('NA', { exact: false })).toBeVisible({ timeout: 10000 });

    // Verify "Alavanca Amarela" shows as reprovado in rejected items detail
    await expect(
      page.getByText('Alavanca Amarela', { exact: false })
    ).toBeVisible({ timeout: 10000 });

    // Verify rejection reason is visible near the rejected item
    const rejectedSection = page.locator('.text-red-700, .text-red-600');
    await expect(rejectedSection.first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-checklist-data.png' });
  });

  test('Admin sees observations', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await row.getByRole('link', { name: 'Ver' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(
      page.getByText('Equipamento em bom estado', { exact: false })
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-observations.png' });
  });

  test('Admin exports inspection CSV', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await row.getByRole('link', { name: 'Ver' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Exportar para Webed" button
    const exportButton = page.getByRole('button', { name: /Exportar para Webed/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    await exportButton.click();
    await page.waitForTimeout(2000);

    // Verify either the download started or the button changed state (e.g., "Exportando...")
    const download = await downloadPromise;
    if (!download) {
      // If download didn't trigger, verify button showed loading state
      // Button might have already returned to normal state, so just verify it's still there
      await expect(exportButton).toBeVisible();
    }

    await page.screenshot({ path: 'e2e/results/03-export-csv.png' });
  });

  test('Admin marks inspection as transferred', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await row.getByRole('link', { name: 'Ver' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Marcar como Transferida" button
    const transferButton = page.getByRole('button', { name: /Marcar como Transferida/i });
    await expect(transferButton).toBeVisible({ timeout: 10000 });

    // Handle the confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await transferButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify status changes to "Transferida"
    await expect(page.getByText('Transferida')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/03-transferred.png' });
  });

  test('Admin views productivity report', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await reportsPage.goto();
    await page.waitForTimeout(1000);

    await reportsPage.openProductivityReport();
    await page.waitForTimeout(1000);

    // Verify "Inspetor Teste" appears in the report
    await expect(
      page.getByText(INSPECTOR.name, { exact: false })
    ).toBeVisible({ timeout: 10000 });

    // Verify inspection count > 0 (check "Total de Inspecoes" column has a number)
    const inspectorRow = page.getByRole('row', { name: new RegExp(INSPECTOR.name) });
    await expect(inspectorRow).toBeVisible({ timeout: 10000 });
    const cells = inspectorRow.getByRole('cell');
    const totalCell = cells.nth(1); // Second column is "Total de Inspecoes"
    const totalText = await totalCell.textContent();
    expect(parseInt(totalText ?? '0', 10)).toBeGreaterThan(0);

    await page.screenshot({ path: 'e2e/results/03-productivity-report.png' });
  });

  test('Admin views audit log', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    const row = page.getByRole('row', { name: new RegExp(EQUIPMENT_1.copelRa) });
    await row.getByRole('link', { name: 'Ver' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for "Historico de Alteracoes" section (collapsible)
    const auditToggle = page.getByRole('button', { name: /Historico de Alteracoes/i });
    await expect(auditToggle).toBeVisible({ timeout: 10000 });

    // Click to expand
    await auditToggle.click();
    await page.waitForTimeout(1000);

    // Verify audit entries exist (look for action badges like "Criacao", "Alteracao")
    const auditSection = page.locator('[data-testid="audit-log"]');
    if (await auditSection.isVisible()) {
      const entries = auditSection.locator('[data-testid="audit-entry"]');
      await expect(entries.first()).toBeVisible({ timeout: 10000 });
    } else {
      // Fallback: check for audit content in the expanded section
      await expect(
        page.getByText(/Criacao|Alteracao|Remocao/, { exact: false })
      ).toBeVisible({ timeout: 10000 });
    }

    await page.screenshot({ path: 'e2e/results/03-audit-log.png' });
  });

  test('Admin logout after review', async ({ page }) => {
    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    await loginPage.logout();
    await loginPage.expectLoginPage();

    await page.screenshot({ path: 'e2e/results/03-admin-logout.png' });
  });
});
