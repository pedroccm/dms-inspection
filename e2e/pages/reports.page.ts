import { type Page, expect } from '@playwright/test';

export class ReportsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/relatorios');
    await this.page.waitForURL('**/relatorios');
  }

  async openProductivityReport() {
    await this.page.getByRole('link', { name: /produtividade/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async setDateRange(start: string, end: string) {
    await this.page.getByLabel(/data início|de/i).fill(start);
    await this.page.getByLabel(/data fim|até/i).fill(end);
    await this.page.getByRole('button', { name: /filtrar|aplicar|buscar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectInspectorInReport(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async exportCsv() {
    await this.page.getByRole('button', { name: /exportar csv|csv/i }).click();

    const downloadPromise = this.page.waitForEvent('download');
    await downloadPromise;
  }
}
