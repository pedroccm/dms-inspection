import { type Page, expect } from '@playwright/test';

export class InspectionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/inspecoes');
    await this.page.waitForURL('**/inspecoes');
  }

  async startInspection(equipmentLabel: string, orderTitle: string) {
    await this.page.getByRole('link', { name: /Nova Inspeção/i }).click();
    await this.page.waitForLoadState('networkidle');

    // Select equipment (native <select> with id="equipamento")
    // equipmentLabel should be the full option label, e.g. "RA-TEST-001 — ABB"
    await this.page.selectOption('#equipamento', { label: equipmentLabel });
    await this.page.waitForTimeout(500);

    // Select order (native <select> with id="ordem-de-servico")
    await this.page.selectOption('#ordem-de-serviço', { label: orderTitle });
    await this.page.waitForTimeout(500);

    await this.page.getByRole('button', { name: /Iniciar Inspeção/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async openInspection(index: number) {
    await this.page.waitForTimeout(1000);
    const links = this.page.getByRole('link', { name: 'Ver' });
    await links.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectInspectionInList(equipmentCode: string) {
    await expect(
      this.page.getByRole('cell', { name: new RegExp(equipmentCode) })
    ).toBeVisible();
  }

  async expectInspectionStatus(status: string) {
    await expect(this.page.getByText(status)).toBeVisible();
  }
}
