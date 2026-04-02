import { type Page, expect } from '@playwright/test';

export class InspectionDetailPage {
  constructor(private page: Page) {}

  async evaluateItem(itemName: string, status: 'approved' | 'rejected' | 'na') {
    const itemRow = this.page.locator('[data-testid="inspection-item"]', {
      hasText: itemName,
    });

    const statusMap = {
      approved: /aprovado|aprovar|conforme/i,
      rejected: /reprovado|reprovar|não conforme/i,
      na: /n\/a|não aplicável/i,
    };

    await itemRow.getByRole('button', { name: statusMap[status] }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async setRejectionReason(itemName: string, reason: string) {
    const itemRow = this.page.locator('[data-testid="inspection-item"]', {
      hasText: itemName,
    });

    const reasonInput = itemRow.getByPlaceholder(/motivo|razão|observação/i);
    await reasonInput.fill(reason);
  }

  async getProgress(): Promise<string> {
    const progressEl = this.page.locator('[data-testid="inspection-progress"]');
    await expect(progressEl).toBeVisible();
    return (await progressEl.textContent()) ?? '';
  }

  async expectItemStatus(itemName: string, status: string) {
    const itemRow = this.page.locator('[data-testid="inspection-item"]', {
      hasText: itemName,
    });
    await expect(itemRow.getByText(status)).toBeVisible();
  }

  async setObservations(text: string) {
    const textarea = this.page.getByLabel(/observações|observação/i);
    await textarea.fill(text);
  }

  async completeEvaluation() {
    await this.page.getByRole('button', { name: /concluir/i }).click();

    // Confirm modal
    const confirmButton = this.page.getByRole('button', { name: /confirmar|sim/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectReadOnly() {
    // Verify that no edit/action buttons are present
    await expect(
      this.page.getByRole('button', { name: /aprovar|reprovar|concluir/i })
    ).toHaveCount(0);
  }

  async getSummary(): Promise<{ approved: string; rejected: string; na: string }> {
    const summarySection = this.page.locator('[data-testid="inspection-summary"]');
    await expect(summarySection).toBeVisible();

    const approved =
      (await summarySection
        .locator('[data-testid="summary-approved"]')
        .textContent()) ?? '0';
    const rejected =
      (await summarySection
        .locator('[data-testid="summary-rejected"]')
        .textContent()) ?? '0';
    const na =
      (await summarySection
        .locator('[data-testid="summary-na"]')
        .textContent()) ?? '0';

    return { approved, rejected, na };
  }

  async exportCsv() {
    await this.page.getByRole('button', { name: /exportar csv|csv/i }).click();

    // Wait for the download to start
    const downloadPromise = this.page.waitForEvent('download');
    await downloadPromise;
  }

  async markAsTransferred() {
    await this.page.getByRole('button', { name: /transferido|marcar como transferido/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectAuditLog() {
    const auditSection = this.page.locator('[data-testid="audit-log"]');
    await expect(auditSection).toBeVisible();
    // Verify at least one log entry exists
    await expect(auditSection.locator('[data-testid="audit-entry"]').first()).toBeVisible();
  }
}
