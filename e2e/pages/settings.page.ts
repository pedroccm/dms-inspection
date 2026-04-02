import { type Page, expect } from '@playwright/test';

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/configuracoes');
    await this.page.waitForURL('**/configuracoes');
  }

  async getRetentionPeriod(): Promise<string> {
    const input = this.page.getByLabel(/retenção|dias/i);
    await expect(input).toBeVisible();
    return (await input.inputValue()) ?? '';
  }

  async setRetentionPeriod(days: string) {
    const input = this.page.getByLabel(/retenção|dias/i);
    await input.clear();
    await input.fill(days);
  }

  async saveSettings() {
    await this.page.getByRole('button', { name: /salvar/i }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
