import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { EquipmentPage } from '../pages/equipment.page';
import { OrdersPage } from '../pages/orders.page';
import { UsersPage } from '../pages/users.page';
import { SettingsPage } from '../pages/settings.page';
import { ReportsPage } from '../pages/reports.page';
import { ADMIN, EQUIPMENT_1, EQUIPMENT_2, ORDER_1, INSPECTOR } from '../fixtures/test-data';

test.describe.serial('Admin Setup', () => {
  test('Admin login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(1000);

    // Verify admin name appears in sidebar
    await expect(page.getByText(ADMIN.name)).toBeVisible();

    // Verify admin role badge
    await expect(page.getByText('Master', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-login.png' });
  });

  test('Admin sees all menu items', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Verify all sidebar menu items are visible for admin
    await dashboard.expectMenuItemVisible('Painel');
    await dashboard.expectMenuItemVisible('Ordens de Serviço');
    await dashboard.expectMenuItemVisible('Equipamentos');
    await dashboard.expectMenuItemVisible('Inspeções');
    await dashboard.expectMenuItemVisible('Relatórios');
    await dashboard.expectMenuItemVisible('Usuários');
    await dashboard.expectMenuItemVisible('Configurações');

    await page.screenshot({ path: 'e2e/results/01-admin-menu-items.png' });
  });

  test('Admin dashboard shows metrics', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Verify 4 metric cards exist with expected labels
    const main = page.getByRole('main');
    await expect(main.getByText('Ordens Abertas')).toBeVisible();
    await expect(main.getByText('Inspeções Hoje')).toBeVisible();
    await expect(main.getByText('Equipamentos')).toBeVisible();
    await expect(main.getByText('Pendentes de Revisão')).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-dashboard-metrics.png' });
  });

  test('Admin creates equipment 1', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const equipmentPage = new EquipmentPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Navigate to equipment page
    await equipmentPage.goto();
    await page.waitForTimeout(1000);

    // Click "Novo Equipamento"
    await page.getByRole('link', { name: /Novo Equipamento/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill all 6 fields using input name attributes
    await page.fill('input[name="copel_ra_code"]', EQUIPMENT_1.copelRa);
    await page.fill('input[name="copel_control_code"]', EQUIPMENT_1.copelControl);
    await page.fill('input[name="mechanism_serial"]', EQUIPMENT_1.mechanismSerial);
    await page.fill('input[name="control_box_serial"]', EQUIPMENT_1.controlBoxSerial);
    await page.fill('input[name="protection_relay_serial"]', EQUIPMENT_1.relaySerial);
    await page.fill('input[name="manufacturer"]', EQUIPMENT_1.manufacturer);

    // Submit
    await page.getByRole('button', { name: /Cadastrar/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify redirect back to equipment list
    await expect(page).toHaveURL(/\/equipamentos/);

    // Verify equipment appears in list
    await expect(page.getByText(EQUIPMENT_1.copelRa)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-equipment-1-created.png' });
  });

  test('Admin creates equipment 2', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const equipmentPage = new EquipmentPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Navigate to equipment page
    await equipmentPage.goto();
    await page.waitForTimeout(1000);

    // Click "Novo Equipamento"
    await page.getByRole('link', { name: /Novo Equipamento/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill all 6 fields using input name attributes
    await page.fill('input[name="copel_ra_code"]', EQUIPMENT_2.copelRa);
    await page.fill('input[name="copel_control_code"]', EQUIPMENT_2.copelControl);
    await page.fill('input[name="mechanism_serial"]', EQUIPMENT_2.mechanismSerial);
    await page.fill('input[name="control_box_serial"]', EQUIPMENT_2.controlBoxSerial);
    await page.fill('input[name="protection_relay_serial"]', EQUIPMENT_2.relaySerial);
    await page.fill('input[name="manufacturer"]', EQUIPMENT_2.manufacturer);

    // Submit
    await page.getByRole('button', { name: /Cadastrar/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify redirect back to equipment list
    await expect(page).toHaveURL(/\/equipamentos/);

    // Verify equipment appears in list
    await expect(page.getByText(EQUIPMENT_2.copelRa)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-equipment-2-created.png' });
  });

  test('Admin creates service order', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(2000);

    // Wait for AdminOnly to load, then click "Nova Ordem"
    await expect(page.getByRole('link', { name: /Nova Ordem/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /Nova Ordem/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill form fields using input name attributes
    await page.fill('input[name="title"]', ORDER_1.title);
    await page.fill('input[name="client_name"]', ORDER_1.clientName);
    await page.fill('input[name="location"]', ORDER_1.location);
    await page.fill('input[name="start_date"]', ORDER_1.startDate);
    await page.fill('input[name="end_date"]', ORDER_1.endDate);

    // Select inspector from the dropdown
    await page.selectOption('select[name="assigned_to"]', { label: INSPECTOR.name });

    // Submit
    await page.getByRole('button', { name: /Criar Ordem/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify redirect back to orders list or order detail
    await expect(page).toHaveURL(/\/ordens/);

    await page.screenshot({ path: 'e2e/results/01-admin-order-created.png' });
  });

  test('Admin adds equipment to order', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(1000);

    // Open the created order by clicking "Detalhes" (first match)
    await page.getByRole('link', { name: /Detalhes/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Add EQUIPMENT_1: search and add
    await page.fill('#buscar-por-codigo-copel-ra', EQUIPMENT_1.copelRa);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.waitForTimeout(2000);

    // Click "Adicionar" on the search result
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.waitForTimeout(2000);

    // Add EQUIPMENT_2: search and add
    await page.fill('#buscar-por-codigo-copel-ra', EQUIPMENT_2.copelRa);
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.waitForTimeout(2000);

    // Verify both equipment codes appear
    await expect(page.getByText(EQUIPMENT_1.copelRa)).toBeVisible();
    await expect(page.getByText(EQUIPMENT_2.copelRa)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-equipment-added-to-order.png' });
  });

  test('Admin views user list', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const usersPage = new UsersPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    await usersPage.goto();
    await page.waitForTimeout(1000);

    // Verify both users appear
    await usersPage.expectUserInList(ADMIN.name);
    await usersPage.expectUserInList(INSPECTOR.name);

    await page.screenshot({ path: 'e2e/results/01-admin-user-list.png' });
  });

  test('Admin views settings', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);

    // On mobile, open sidebar first
    const hamburger = page.locator('button[aria-label="Abrir menu"]');
    if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
    }

    // Wait for auth context to load profile (admin items appear in sidebar)
    await expect(page.getByText('Configurações')).toBeVisible({ timeout: 10000 });

    // Navigate via sidebar link
    await page.getByText('Configurações').click();
    await page.waitForURL('**/configuracoes');
    await page.waitForTimeout(3000);

    // Verify retention period select exists (client component, may take time to load)
    const retentionSelect = page.locator('#retention-select');
    const visible = await retentionSelect.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) {
      await page.reload();
      await page.waitForTimeout(3000);
    }
    await expect(retentionSelect).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'e2e/results/01-admin-settings.png' });
  });

  test('Admin views reports page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    await page.goto('/dashboard/relatorios');
    await page.waitForTimeout(2000);

    // Verify "Produtividade por Executor" card/section exists
    await expect(page.getByText(/Produtividade/i)).toBeVisible();

    await page.screenshot({ path: 'e2e/results/01-admin-reports.png' });
  });

  test('Admin logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(1000);

    // Click "Sair" button
    await loginPage.logout();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);

    await page.screenshot({ path: 'e2e/results/01-admin-logout.png' });
  });
});
