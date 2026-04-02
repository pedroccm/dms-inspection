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
    await expect(page.getByText(INSPECTOR.name, { exact: true })).toBeVisible({ timeout: 10000 });

    // Verify inspector role
    await expect(page.getByText('inspector', { exact: true })).toBeVisible();

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
    await expect(page.getByText(ORDER_1.title).first()).toBeVisible();

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

    // Open the first order by clicking "Detalhes"
    await page.getByRole('link', { name: /Detalhes/i }).first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify both equipment codes appear in the order detail
    await expect(page.getByText(EQUIPMENT_1.copelRa).first()).toBeVisible();
    await expect(page.getByText(EQUIPMENT_2.copelRa).first()).toBeVisible();

    await page.screenshot({ path: 'e2e/results/02-inspector-order-equipment.png' });
  });

  test('Inspector complete inspection workflow', async ({ page }) => {
    // Login
    const loginPage = new LoginPage(page);
    const inspectionsPage = new InspectionsPage(page);

    await loginPage.goto();
    await loginPage.loginAs(INSPECTOR.email, INSPECTOR.password);
    await page.waitForTimeout(1000);

    await test.step('Start new inspection', async () => {
      // Navigate to inspections page
      await inspectionsPage.goto();
      await page.waitForTimeout(1000);

      // Click "Nova Inspecao" link
      await page.getByRole('link', { name: /Nova Inspecao/i }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Select equipment from native <select> with id="equipamento"
      // Options have format: "copel_ra_code — manufacturer"
      await page.selectOption('#equipamento', { label: `${EQUIPMENT_1.copelRa} — ${EQUIPMENT_1.manufacturer}` });
      await page.waitForTimeout(500);

      // Select order from native <select> with id="ordem-de-servico"
      await page.selectOption('#ordem-de-servico', { label: ORDER_1.title });
      await page.waitForTimeout(500);

      // Click "Iniciar Inspecao" and wait for redirect to detail page (UUID in URL)
      await page.getByRole('button', { name: /Iniciar Inspecao/i }).click();

      // Wait for redirect to inspection detail (URL with UUID, not /nova)
      await page.waitForURL(/\/inspecoes\/[0-9a-f-]{36}/, { timeout: 30000 });
      await page.waitForTimeout(2000);

      // Verify we're on the detail page (checklist should be visible)
      await expect(page.getByText('Alimentação VCA e Tomada')).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: 'e2e/results/02-inspector-inspection-started.png' });
    });

    await test.step('Fill checklist items', async () => {
      // We're already on the inspection detail page from the previous step.
      // Each checklist item has buttons with aria-label="Aprovado - ItemName",
      // "Reprovado - ItemName", "NA - ItemName".

      // First, click all "Aprovado" buttons to approve all items
      const approveButtons = page.getByRole('button', { name: /^Aprovado - / });
      const totalButtons = await approveButtons.count();
      expect(totalButtons).toBeGreaterThan(0);

      for (let i = 0; i < totalButtons; i++) {
        await approveButtons.nth(i).click();
        await page.waitForTimeout(300);
      }

      // Override "Alavanca Amarela" to Reprovado:
      // First toggle off its approved state, then click Reprovado
      const alavancaApproveBtn = page.getByRole('button', { name: /Aprovado - .*Alavanca Amarela/i });
      await alavancaApproveBtn.click(); // Toggle off (back to pending)
      await page.waitForTimeout(300);

      const alavancaRejectBtn = page.getByRole('button', { name: /Reprovado - .*Alavanca Amarela/i });
      await alavancaRejectBtn.click();
      await page.waitForTimeout(500);

      // Override last 2 items to NA:
      // Get all NA buttons and toggle the last 2 from approved to NA
      const naButtons = page.getByRole('button', { name: /^NA - / });
      const naCount = await naButtons.count();

      for (let i = naCount - 2; i < naCount; i++) {
        // Get the item name from the NA button's aria-label
        const naButtonText = await naButtons.nth(i).getAttribute('aria-label');
        if (naButtonText) {
          const itemName = naButtonText.replace('NA - ', '');
          // Click the approve button for this item to toggle it off
          await page.getByRole('button', { name: `Aprovado - ${itemName}` }).click();
          await page.waitForTimeout(300);
        }
        // Now click NA
        await naButtons.nth(i).click();
        await page.waitForTimeout(300);
      }

      // Verify progress shows all items evaluated
      await expect(page.getByText(/\d+ de \d+ itens avaliados/)).toContainText(`${totalButtons} de ${totalButtons}`);

      await page.screenshot({ path: 'e2e/results/02-inspector-checklist-filled.png' });
    });

    await test.step('Set rejection reason', async () => {
      // For the rejected "Alavanca Amarela" item, fill the reason textarea
      const alavancaLi = page.locator('li').filter({ hasText: /Alavanca Amarela/i });
      const reasonInput = alavancaLi.locator('textarea[placeholder="Motivo da reprovacao"]');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('Alavanca com desgaste excessivo, necessita substituicao');
      await reasonInput.blur(); // Trigger save on blur
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'e2e/results/02-inspector-rejection-reason.png' });
    });

    await test.step('Add observations', async () => {
      // Fill the observations textarea
      const textarea = page.locator('textarea[placeholder="Adicione observacoes sobre a inspecao..."]');
      await textarea.fill(
        'Equipamento em bom estado geral, exceto alavanca amarela com desgaste'
      );
      await page.waitForTimeout(4000); // Wait for auto-save (delay is 3000ms)

      await page.screenshot({ path: 'e2e/results/02-inspector-observations.png' });
    });

    await test.step('Complete evaluation', async () => {
      // Click "Concluir Avaliação"
      await page.getByRole('button', { name: /Concluir Avaliação/i }).click();
      await page.waitForTimeout(1000);

      // Verify confirmation modal appears with "Sim, concluir" button
      const confirmButton = page.getByRole('button', { name: /Sim, concluir/i });
      await expect(confirmButton).toBeVisible();

      // Verify summary is shown in the modal (data-testid="summary-counts")
      const summarySection = page.locator('[data-testid="summary-counts"]');
      await expect(summarySection).toBeVisible();
      await expect(summarySection.getByText(/Aprovados:/)).toBeVisible();
      await expect(summarySection.getByText(/Reprovados:/)).toBeVisible();

      // Confirm
      await confirmButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'e2e/results/02-inspector-evaluation-completed.png' });
    });

    await test.step('Verify read-only state', async () => {
      // Verify no evaluation buttons are visible (Aprovado/Reprovado/NA/Concluir)
      await expect(
        page.getByRole('button', { name: /Aprovado|Reprovado|Concluir/i })
      ).toHaveCount(0);

      // Verify observations section shows read-only text (a div, not a textarea)
      const observationsDiv = page.locator('div').filter({ hasText: /Equipamento em bom estado geral/ }).first();
      await expect(observationsDiv).toBeVisible();

      // Verify no textarea is present in the observations section
      const observationsSection = page.locator('text=Observacoes').locator('..');
      const textareas = observationsSection.locator('textarea');
      await expect(textareas).toHaveCount(0);

      await page.screenshot({ path: 'e2e/results/02-inspector-read-only.png' });
    });

    await page.screenshot({ path: 'e2e/results/02-full-workflow.png' });
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
