import { type Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForURL('**/login');
  }

  async loginAs(email: string, password: string) {
    await this.page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
    await this.page.waitForURL('**/dashboard**', { timeout: 30000 });
  }

  async expectLoginPage() {
    await expect(this.page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(this.page).toHaveURL(/\/login/);
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Sair' }).click();
    await this.page.waitForURL('**/login', { timeout: 15000 });
  }
}
