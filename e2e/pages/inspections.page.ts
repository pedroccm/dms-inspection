import { type Page, expect } from '@playwright/test';

export class InspectionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/inspecoes');
    await this.page.waitForURL('**/inspecoes');
  }

  async startInspection(equipmentCode: string, orderTitle: string) {
    await this.page.getByRole('button', { name: /nova inspeção|novo/i }).click();
    await this.page.waitForLoadState('networkidle');

    // Select equipment
    const equipmentSelect = this.page.getByLabel(/equipamento/i);
    await equipmentSelect.click();
    await this.page.getByRole('option', { name: new RegExp(equipmentCode) }).click();

    // Select order
    const orderSelect = this.page.getByLabel(/ordem de serviço|ordem/i);
    await orderSelect.click();
    await this.page.getByRole('option', { name: new RegExp(orderTitle) }).click();

    await this.page.getByRole('button', { name: /iniciar|criar|salvar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async openInspection(index: number) {
    const rows = this.page.locator('tbody tr');
    await rows.nth(index).click();
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
