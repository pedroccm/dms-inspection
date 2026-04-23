import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { EXECUTOR, ORDER_1 } from '../fixtures/test-data';

test.describe.serial('02 - Executor Workflow', () => {
  test('Executor login and verify limited menu', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForTimeout(3000);

    // Verify executor name appears in sidebar
    await expect(page.getByText(EXECUTOR.name, { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify executor role label
    await expect(page.getByText('Executor', { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify visible menu items
    await dashboard.expectMenuItemVisible('Painel');
    await dashboard.expectMenuItemVisible('Ordens de Serviço');
    await dashboard.expectMenuItemVisible('Equipamentos');
    await dashboard.expectMenuItemVisible('Inspeções');
    await dashboard.expectMenuItemVisible('Relatórios');

    // Verify admin-only items are NOT visible
    await dashboard.expectMenuItemHidden('Usuários');
    await dashboard.expectMenuItemHidden('Configurações');

    await page.screenshot({ path: 'e2e/results/02-executor-login.png' });
  });

  test('Executor sees assigned order in order list', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

    // Navigate to orders page
    await page.goto('/dashboard/ordens');
    await page.waitForURL('**/ordens');
    await page.waitForTimeout(2000);

    // Verify the assigned order client name appears in the list
    await expect(page.getByText(ORDER_1.clientName).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/results/02-executor-sees-order.png' });
  });

  test('Complete inspection workflow', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

    await test.step('Navigate to inspections list and find ficha', async () => {
      // Navigate to inspections list
      await page.goto('/dashboard/inspecoes');
      await page.waitForURL('**/inspecoes');
      await page.waitForTimeout(2000);

      // Verify fichas with "Disponível" status appear in the table
      const table = page.locator('table');
      await expect(table.getByText('Disponível').first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'e2e/results/02-executor-inspections-list.png' });
    });

    await test.step('Open ficha and claim it', async () => {
      // Click "Ver" on the first ficha with Disponível status
      const disponvelRow = page.locator('tr', { hasText: 'Disponível' }).first();
      await expect(disponvelRow).toBeVisible({ timeout: 10000 });
      await disponvelRow.getByRole('link', { name: 'Ver' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we are on the inspection detail page
      await expect(page).toHaveURL(/\/inspecoes\/[0-9a-f-]{36}/);

      // Verify "Disponível" badge is shown
      await expect(page.getByText('Disponível').first()).toBeVisible({ timeout: 10000 });

      // Click "Reivindicar Ficha"
      await page.getByRole('button', { name: /Reivindicar Ficha/i }).click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'e2e/results/02-executor-ficha-claimed.png' });
    });

    await test.step('Verify claim changes status and checklist appears', async () => {
      // After claim, status should change to "Rascunho"
      await expect(page.getByText('Rascunho').first()).toBeVisible({ timeout: 10000 });

      // Checklist should appear with 18 items
      await expect(page.getByText(/de 18 itens avaliados/).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'e2e/results/02-executor-checklist-visible.png' });
    });

    await test.step('Fill checklist items', async () => {
      // The 18 checklist items from the DB
      const ITEMS = [
        'Alimentação VCA e Tomada', 'Alimentação VCC / Bateria', 'Arquivo de Ajustes',
        'Operação Bateria', 'Operação VCA', 'Alavanca Amarela',
        'Medição MT', 'Medição BT Fonte', 'Medição BT Carga', 'Medição PRI Corrente',
        'Op. Mecânica - 25 Op.', 'Resist. de Contato', 'Resist. de Isolamento',
        'Visual de Mont./Pint.', 'Proteção de Fase', 'Proteção de N/SEF',
        'Comunic. Frontal', 'Comunic. Traseira',
      ];

      // Approve all items first
      for (const itemName of ITEMS) {
        const btn = page.locator(`button[aria-label="Aprovado - ${itemName}"]`);
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(200);
        }
      }

      // Override "Alavanca Amarela" to Reprovado
      await page.locator('button[aria-label="Reprovado - Alavanca Amarela"]').click();
      await page.waitForTimeout(500);

      // Override last item to NA
      await page.locator('button[aria-label="NA - Comunic. Traseira"]').click();
      await page.waitForTimeout(300);

      // Verify progress: 18 of 18 items evaluated
      await expect(page.getByText(/18 de 18 itens avaliados/).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'e2e/results/02-executor-checklist-filled.png' });
    });

    await test.step('Set rejection reason for Alavanca Amarela', async () => {
      // For the rejected "Alavanca Amarela" item, fill the reason textarea
      const alavancaLi = page.locator('li').filter({ hasText: /Alavanca Amarela/i });
      const reasonInput = alavancaLi.locator('textarea[placeholder="Motivo da reprovação"]');
      await expect(reasonInput).toBeVisible({ timeout: 5000 });
      await reasonInput.fill('Alavanca com desgaste excessivo, necessita substituicao');
      await reasonInput.blur(); // Trigger save on blur
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'e2e/results/02-executor-rejection-reason.png' });
    });

    await test.step('Add observations', async () => {
      // Fill the observations textarea
      const textarea = page.locator('textarea[placeholder="Adicione observações sobre a inspeção..."]');
      await textarea.fill(
        'Equipamento em bom estado geral, exceto alavanca amarela com desgaste'
      );
      await page.waitForTimeout(4000); // Wait for auto-save (delay is 3000ms)

      await page.screenshot({ path: 'e2e/results/02-executor-observations.png' });
    });

    await test.step('Complete evaluation - Concluir Avaliação', async () => {
      // Click "Concluir Avaliação"
      await page.getByRole('button', { name: /Concluir Avaliação/i }).click();
      await page.waitForTimeout(1000);

      // Verify confirmation modal appears with summary
      const confirmButton = page.getByRole('button', { name: /Sim, concluir/i });
      await expect(confirmButton).toBeVisible({ timeout: 5000 });

      // Verify summary is shown in the modal
      const summarySection = page.locator('[data-testid="summary-counts"]');
      await expect(summarySection).toBeVisible();
      await expect(summarySection.getByText(/Aprovados:/)).toBeVisible();
      await expect(summarySection.getByText(/Reprovados:/)).toBeVisible();

      await page.screenshot({ path: 'e2e/results/02-executor-confirm-modal.png' });

      // Confirm
      await confirmButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'e2e/results/02-executor-evaluation-completed.png' });
    });

    await test.step('Verify status changes to Pronta para Revisão', async () => {
      // Reload to get the updated state
      await page.reload();
      await page.waitForTimeout(3000);

      // The status should show "Pronta para Revisão"
      await expect(page.getByText(/Pronta para Revisão/).first()).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'e2e/results/02-executor-ready-for-review.png' });
    });
  });

  test('Executor logout', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(EXECUTOR.email, EXECUTOR.password);
    await page.waitForTimeout(3000);

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

    await page.screenshot({ path: 'e2e/results/02-executor-logout.png' });
  });
});
