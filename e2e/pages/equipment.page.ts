import { type Page, expect } from '@playwright/test';

interface EquipmentData {
  copelRa: string;
  copelControl: string;
  mechanismSerial: string;
  controlBoxSerial: string;
  relaySerial: string;
  manufacturer: string;
}

export class EquipmentPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/equipamentos');
    await this.page.waitForURL('**/equipamentos');
  }

  async createEquipment(data: EquipmentData) {
    await this.page.getByRole('button', { name: /novo equipamento/i }).click();
    await this.page.waitForLoadState('networkidle');

    await this.page.getByLabel('Copel RA').fill(data.copelRa);
    await this.page.getByLabel('Controle Copel').fill(data.copelControl);
    await this.page.getByLabel('Serial do Mecanismo').fill(data.mechanismSerial);
    await this.page.getByLabel('Serial da Caixa de Controle').fill(data.controlBoxSerial);
    await this.page.getByLabel('Serial do Relé').fill(data.relaySerial);
    await this.page.getByLabel('Fabricante').fill(data.manufacturer);

    await this.page.getByRole('button', { name: /salvar|cadastrar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchByCode(code: string) {
    const searchInput = this.page.getByPlaceholder(/buscar|pesquisar|filtrar/i);
    await searchInput.fill(code);
    await this.page.waitForLoadState('networkidle');
  }

  async expectEquipmentInList(copelRa: string) {
    await expect(this.page.getByRole('cell', { name: copelRa })).toBeVisible();
  }

  async openEquipment(copelRa: string) {
    await this.page.getByRole('row', { name: new RegExp(copelRa) }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectEquipmentCount(count: number) {
    const rows = this.page.locator('tbody tr');
    await expect(rows).toHaveCount(count);
  }
}
