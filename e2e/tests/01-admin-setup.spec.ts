import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { ADMIN, INSPECTOR, ORDER_1 } from '../fixtures/test-data';

test.describe.serial('01 - Admin Setup', () => {
  test('Admin login and verify dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(2000);

    // Verify admin name appears in sidebar
    await expect(page.getByText(ADMIN.name)).toBeVisible({ timeout: 10000 });

    // Verify admin role label "Master"
    await expect(page.getByText('Master', { exact: true })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/01-admin-login.png' });
  });

  test('Admin sees all menu items', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

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

  test('Admin creates O.S. with fichas', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(2000);

    // Click "Nova Ordem"
    await expect(page.getByRole('link', { name: /Nova Ordem/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /Nova Ordem/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify auto-generated order number is displayed (DS-CP-INSP-RA-xxx)
    await expect(page.getByText(/DS-CP-INSP-RA-/)).toBeVisible({ timeout: 10000 });

    // Fill: Nome do Cliente
    await page.fill('input[name="client_name"]', ORDER_1.clientName);

    // Fill: Quantidade de Equipamentos = 2
    const equipInput = page.locator('input[name="equipment_count"]');
    await equipInput.fill('');
    await equipInput.fill(ORDER_1.equipmentCount);
    await page.waitForTimeout(500);

    // Fill: Data Inicio
    await page.fill('input[name="start_date"]', ORDER_1.startDate);

    // Select: Local -> "+ Novo Local"
    await page.selectOption('#local', '__new__');
    await page.waitForTimeout(500);

    // Fill new location name
    await page.fill('input[name="new_location_name"]', ORDER_1.location);

    // Select: Executor Responsavel = Inspetor Teste
    await page.selectOption('#executor-responsável', { label: INSPECTOR.name });

    // Fill Numeros do Lote: row 0
    await page.fill('input[name="numero_052r_0"]', ORDER_1.fichas[0].numero052r);
    await page.fill('input[name="numero_300_0"]', ORDER_1.fichas[0].numero300);

    // Fill Numeros do Lote: row 1
    await page.fill('input[name="numero_052r_1"]', ORDER_1.fichas[1].numero052r);
    await page.fill('input[name="numero_300_1"]', ORDER_1.fichas[1].numero300);

    await page.screenshot({ path: 'e2e/results/01-admin-order-form-filled.png' });

    // Submit
    await page.getByRole('button', { name: /Criar Ordem/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify redirect to order detail page
    await expect(page).toHaveURL(/\/ordens\/[0-9a-f-]{36}/);

    // Verify order number DS-CP-INSP-RA-xxx is shown on the detail page
    await expect(page.getByText(/DS-CP-INSP-RA-/)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/01-admin-order-created.png' });
  });

  test('Admin sees fichas in order detail', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(2000);

    // Open the first order by clicking "Detalhes"
    await page.getByRole('link', { name: /Detalhes/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify 2 fichas listed (table inside "Fichas de Inspecao" section)
    await expect(page.getByText('Fichas de Inspeção (2)')).toBeVisible({ timeout: 10000 });

    // Verify 052R numbers appear
    await expect(page.getByText(`052R-${ORDER_1.fichas[0].numero052r}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`052R-${ORDER_1.fichas[1].numero052r}`).first()).toBeVisible({ timeout: 10000 });

    // Verify 300 numbers appear
    await expect(page.getByText(`300-${ORDER_1.fichas[0].numero300}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`300-${ORDER_1.fichas[1].numero300}`).first()).toBeVisible({ timeout: 10000 });

    // Verify status "Disponivel" on each ficha (at least 2 badges with "Disponivel")
    const disponvelBadges = page.locator('table').first().getByText('Disponível');
    await expect(disponvelBadges.first()).toBeVisible({ timeout: 10000 });
    expect(await disponvelBadges.count()).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: 'e2e/results/01-admin-fichas-detail.png' });
  });

  test('Admin views user list', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Navigate to users page
    await page.goto('/dashboard/usuarios');
    await page.waitForURL('**/usuarios');
    await page.waitForTimeout(2000);

    // Verify both users appear
    await expect(page.getByRole('cell', { name: new RegExp(ADMIN.name) })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: new RegExp(INSPECTOR.name) })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/01-admin-user-list.png' });
  });

  test('Admin views settings', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // On mobile, open sidebar first
    const hamburger = page.locator('button[aria-label="Abrir menu"]');
    if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
    }

    // Verify Configuracoes is visible and navigate
    await expect(page.getByText('Configurações')).toBeVisible({ timeout: 10000 });
    await page.getByText('Configurações').click();
    await page.waitForURL('**/configuracoes');
    await page.waitForTimeout(3000);

    // Verify retention period select exists (client component may take time)
    const retentionSelect = page.locator('#retention-select');
    const visible = await retentionSelect.isVisible({ timeout: 10000 }).catch(() => false);
    if (!visible) {
      await page.reload();
      await page.waitForTimeout(3000);
    }
    await expect(retentionSelect).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'e2e/results/01-admin-settings.png' });
  });

  test('Admin logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(ADMIN.email, ADMIN.password);
    await page.waitForTimeout(2000);

    // Logout
    await loginPage.logout();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Verify login form is visible (session invalidated)
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });

    // Verify accessing dashboard redirects back to login
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);

    await page.screenshot({ path: 'e2e/results/01-admin-logout.png' });
  });
});
