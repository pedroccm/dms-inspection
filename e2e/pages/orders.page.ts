import { type Page, expect } from '@playwright/test';

interface OrderData {
  title: string;
  clientName: string;
  location: string;
  startDate: string;
  endDate: string;
  inspectorName?: string;
}

export class OrdersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/ordens');
    await this.page.waitForURL('**/ordens');
  }

  async createOrder(data: OrderData) {
    await this.page.getByRole('button', { name: /nova ordem|novo/i }).click();
    await this.page.waitForLoadState('networkidle');

    await this.page.getByLabel('Título').fill(data.title);
    await this.page.getByLabel('Cliente').fill(data.clientName);
    await this.page.getByLabel('Local').fill(data.location);
    await this.page.getByLabel('Data Início').fill(data.startDate);
    await this.page.getByLabel('Data Fim').fill(data.endDate);

    if (data.inspectorName) {
      await this.page.getByLabel('Inspetor').fill(data.inspectorName);
    }

    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async openOrder(title: string) {
    await this.page.getByRole('row', { name: new RegExp(title) }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async addEquipmentToOrder(copelRaCode: string) {
    await this.page.getByRole('button', { name: /adicionar equipamento/i }).click();
    await this.page.waitForLoadState('networkidle');

    const searchInput = this.page.getByPlaceholder(/buscar|pesquisar|código/i);
    await searchInput.fill(copelRaCode);
    await this.page.waitForLoadState('networkidle');

    await this.page.getByRole('row', { name: new RegExp(copelRaCode) }).click();
    await this.page.getByRole('button', { name: /confirmar|adicionar|salvar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectOrderInList(title: string) {
    await expect(this.page.getByRole('cell', { name: new RegExp(title) })).toBeVisible();
  }

  async expectOrderStatus(title: string, status: string) {
    const row = this.page.getByRole('row', { name: new RegExp(title) });
    await expect(row.getByText(status)).toBeVisible();
  }

  async exportOrder() {
    await this.page.getByRole('button', { name: /exportar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
