import { type Page, expect } from '@playwright/test';

export class InspectionDetailPage {
  constructor(private page: Page) {}

  async evaluateItem(itemName: string, status: 'approved' | 'rejected' | 'na') {
    const statusMap: Record<string, string> = {
      approved: 'Aprovado',
      rejected: 'Reprovado',
      na: 'NA',
    };

    // Find the button by its aria-label which contains "StatusLabel - ItemName"
    const buttonLabel = `${statusMap[status]} - ${itemName}`;
    await this.page.getByRole('button', { name: buttonLabel }).click();
    await this.page.waitForTimeout(500);
  }

  async setRejectionReason(itemName: string, reason: string) {
    // The rejection reason textarea appears after clicking "Reprovado"
    // It's inside the same <li> as the item. Find the li containing the item name,
    // then find the textarea with placeholder "Motivo da reprovação"
    const itemLi = this.page.locator('li').filter({ hasText: itemName });
    const reasonInput = itemLi.locator('textarea[placeholder="Motivo da reprovação"]');
    await reasonInput.fill(reason);
    // Trigger blur to save
    await reasonInput.blur();
    await this.page.waitForTimeout(1000);
  }

  async getProgress(): Promise<string> {
    // Progress text is like "X de 19 itens avaliados"
    const progressEl = this.page.locator('text=/\\d+ de \\d+ itens avaliados/');
    await expect(progressEl).toBeVisible();
    return (await progressEl.textContent()) ?? '';
  }

  async expectItemStatus(itemName: string, status: string) {
    const itemLi = this.page.locator('li').filter({ hasText: itemName });
    await expect(itemLi.getByText(status)).toBeVisible();
  }

  async setObservations(text: string) {
    const textarea = this.page.locator('textarea[placeholder="Adicione observações sobre a inspeção..."]');
    await textarea.fill(text);
  }

  async completeEvaluation() {
    await this.page.getByRole('button', { name: /Concluir Avaliação/i }).click();
    await this.page.waitForTimeout(500);

    // Confirm modal - button says "Sim, concluir"
    const confirmButton = this.page.getByRole('button', { name: /Sim, concluir/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectReadOnly() {
    // In read-only mode, there are no Aprovado/Reprovado/NA buttons
    // and no "Concluir Avaliação" button
    await expect(
      this.page.getByRole('button', { name: /Aprovado|Reprovado|Concluir/i })
    ).toHaveCount(0);
  }

  async getSummary(): Promise<{ approved: string; rejected: string; na: string }> {
    const summarySection = this.page.locator('[data-testid="summary-counts"]');
    await expect(summarySection).toBeVisible();

    const approved =
      (await summarySection.getByText(/Aprovados:/).textContent()) ?? '0';
    const rejected =
      (await summarySection.getByText(/Reprovados:/).textContent()) ?? '0';
    const na =
      (await summarySection.getByText(/N\/A:/).textContent()) ?? '0';

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
