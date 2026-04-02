import { type Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForURL('**/dashboard');
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  async getMetricValue(label: string): Promise<string> {
    const card = this.page.locator('[data-testid="metric-card"]', { hasText: label });
    const value = card.locator('[data-testid="metric-value"]');
    await expect(value).toBeVisible();
    return (await value.textContent()) ?? '';
  }

  async navigateTo(menuItem: string) {
    await this.page.getByRole('link', { name: menuItem }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectMenuItemVisible(item: string) {
    await expect(this.page.getByRole('link', { name: item })).toBeVisible();
  }

  async expectMenuItemHidden(item: string) {
    await expect(this.page.getByRole('link', { name: item })).toBeHidden();
  }

  async getUserName(): Promise<string> {
    const nameEl = this.page.locator('[data-testid="user-name"]');
    await expect(nameEl).toBeVisible();
    return (await nameEl.textContent()) ?? '';
  }

  async getUserRole(): Promise<string> {
    const roleEl = this.page.locator('[data-testid="user-role"]');
    await expect(roleEl).toBeVisible();
    return (await roleEl.textContent()) ?? '';
  }
}
