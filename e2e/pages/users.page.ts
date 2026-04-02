import { type Page, expect } from '@playwright/test';

export class UsersPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/usuarios');
    await this.page.waitForURL('**/usuarios');
  }

  async expectUserInList(name: string) {
    await expect(this.page.getByRole('cell', { name: new RegExp(name) })).toBeVisible();
  }

  async expectUserCount(count: number) {
    const rows = this.page.locator('tbody tr');
    await expect(rows).toHaveCount(count);
  }
}
