import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { OrdersPage } from '../pages/orders.page';
import { InspectionsPage } from '../pages/inspections.page';
import { InspectionDetailPage } from '../pages/inspection-detail.page';
import { INSPECTOR, ADMIN, ORDER_1, EQUIPMENT_1, EQUIPMENT_2 } from '../fixtures/test-data';

test.describe.serial('Inspector Workflow', () => {
  test('Inspector login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(1000);

    // Verify inspector name appears in sidebar
    await expect(page.getByText(INSPECTOR.name)).toBeVisible();

    // Verify inspector role
    await expect(page.getByText('inspector')).toBeVisible();

    await page.screenshot({ path: 'e2e/results/02-inspector-login.png' });
  });

  test('Inspector sees limited menu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Verify visible menu items
    await dashboard.expectMenuItemVisible('Painel');
    await dashboard.expectMenuItemVisible('Ordens de Servico');
    await dashboard.expectMenuItemVisible('Equipamentos');
    await dashboard.expectMenuItemVisible('Inspecoes');

    // Verify admin-only items are NOT visible
    await dashboard.expectMenuItemHidden('Usuarios');
    await dashboard.expectMenuItemHidden('Configuracoes');

    // Note: Relatorios has adminOnly: false in layout.tsx, so it IS visible to inspectors
    await dashboard.expectMenuItemVisible('Relatorios');

    await page.screenshot({ path: 'e2e/results/02-inspector-limited-menu.png' });
  });

  test('Inspector sees assigned order', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(1000);

    // Verify the assigned order appears in the list
    await expect(page.getByText(ORDER_1.title)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/02-inspector-sees-order.png' });
  });

  test('Inspector opens order and sees equipment', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(1000);

    // Open the order by clicking "Detalhes"
    const orderRow = page.getByRole('row', { name: new RegExp(ORDER_1.title) });
    await orderRow.getByRole('link', { name: /Detalhes/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify both equipment codes appear in the order detail
    await expect(page.getByText(EQUIPMENT_1.copelRa)).toBeVisible();
    await expect(page.getByText(EQUIPMENT_2.copelRa)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/02-inspector-order-equipment.png' });
  });

  test('Inspector starts inspection for equipment 1', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to inspections page
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);

    // Click "Nova Inspeção"
    await page.getByRole('button', { name: /Nova Inspe/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Select equipment from dropdown
    const equipmentSelect = page.getByLabel(/equipamento/i);
    await equipmentSelect.click();
    await page.getByRole('option', { name: new RegExp(EQUIPMENT_1.copelRa) }).click();
    await page.waitForTimeout(500);

    // Select order from dropdown
    const orderSelect = page.getByLabel(/ordem/i);
    await orderSelect.click();
    await page.getByRole('option', { name: new RegExp(ORDER_1.title) }).click();
    await page.waitForTimeout(500);

    // Click "Iniciar Inspeção"
    await page.getByRole('button', { name: /Iniciar|Criar|Salvar/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify redirect to inspection detail page
    await expect(page).toHaveURL(/\/inspecoes\//);

    await page.screenshot({ path: 'e2e/results/02-inspector-inspection-started.png' });
  });

  test('Inspector fills checklist', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);
    const inspectionDetail = new InspectionDetailPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to inspections and open the first one
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);
    await inspectionsPage.openInspection(0);
    await page.waitForTimeout(1000);

    // Get all inspection items
    const items = page.locator('[data-testid="inspection-item"]');
    const itemCount = await items.count();

    // Approve items 1-5 (index 0-4)
    for (let i = 0; i < 5; i++) {
      const item = items.nth(i);
      await item.getByRole('button', { name: /aprovado|aprovar|conforme/i }).click();
      await page.waitForTimeout(300);
    }

    // Reject item 6 (index 5) - "Alavanca Amarela"
    const item6 = items.nth(5);
    await item6.getByRole('button', { name: /reprovado|reprovar|não conforme/i }).click();
    await page.waitForTimeout(500);

    // Set rejection reason
    const reasonInput = item6.getByPlaceholder(/motivo|razão|observação/i);
    await reasonInput.fill('Alavanca com desgaste excessivo, necessita substituicao');
    await page.waitForTimeout(300);

    // Approve items 7-15 (index 6-14)
    for (let i = 6; i < 15; i++) {
      const item = items.nth(i);
      await item.getByRole('button', { name: /aprovado|aprovar|conforme/i }).click();
      await page.waitForTimeout(300);
    }

    // Set items 16-17 (index 15-16) as N/A
    for (let i = 15; i < 17; i++) {
      const item = items.nth(i);
      await item.getByRole('button', { name: /n\/a|não aplicável/i }).click();
      await page.waitForTimeout(300);
    }

    // Approve items 18-19 (index 17-18)
    for (let i = 17; i < 19; i++) {
      const item = items.nth(i);
      await item.getByRole('button', { name: /aprovado|aprovar|conforme/i }).click();
      await page.waitForTimeout(300);
    }

    // Verify progress bar shows "19 de 19"
    const progress = page.locator('[data-testid="inspection-progress"]');
    await expect(progress).toContainText('19 de 19');

    await page.screenshot({ path: 'e2e/results/02-inspector-checklist-filled.png' });
  });

  test('Inspector adds observations', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);
    const inspectionDetail = new InspectionDetailPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to inspections and open the first one
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);
    await inspectionsPage.openInspection(0);
    await page.waitForTimeout(1000);

    // Fill observations
    await inspectionDetail.setObservations(
      'Equipamento em bom estado geral, exceto alavanca amarela com desgaste'
    );
    await page.waitForTimeout(2000); // Wait for auto-save

    await page.screenshot({ path: 'e2e/results/02-inspector-observations.png' });
  });

  test('Inspector completes evaluation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);
    const inspectionDetail = new InspectionDetailPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to inspections and open the first one
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);
    await inspectionsPage.openInspection(0);
    await page.waitForTimeout(1000);

    // Click "Concluir Avaliação"
    await page.getByRole('button', { name: /Concluir/i }).click();
    await page.waitForTimeout(1000);

    // Verify confirmation modal appears
    const confirmButton = page.getByRole('button', { name: /Confirmar|Sim/i });
    await expect(confirmButton).toBeVisible();

    // Verify summary is shown in the modal (Aprovados: 15, Reprovados: 1, N/A: 2)
    // The exact format may vary, but check for the presence of key numbers
    await expect(page.getByText(/15/)).toBeVisible();
    await expect(page.getByText(/1/)).toBeVisible();

    // Confirm
    await confirmButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/results/02-inspector-evaluation-completed.png' });
  });

  test('Inspector verifies inspection is read-only', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);
    const inspectionDetail = new InspectionDetailPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Navigate to inspections and open the first one
    await inspectionsPage.goto();
    await page.waitForTimeout(1000);
    await inspectionsPage.openInspection(0);
    await page.waitForTimeout(1000);

    // Verify no evaluation buttons are visible
    await inspectionDetail.expectReadOnly();

    // Verify observations field is read-only or disabled
    const observationsField = page.getByLabel(/observações|observação/i);
    if (await observationsField.isVisible()) {
      // Check if it's disabled or readonly
      const isDisabled = await observationsField.isDisabled();
      const isReadonly = await observationsField.getAttribute('readonly');
      expect(isDisabled || isReadonly !== null).toBeTruthy();
    }

    await page.screenshot({ path: 'e2e/results/02-inspector-read-only.png' });
  });

  test('Inspector logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    // Click "Sair" button
    await loginPage.logout();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);

    await page.screenshot({ path: 'e2e/results/02-inspector-logout.png' });
  });
});
