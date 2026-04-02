import { describe, it, expect } from "vitest";
import { formatAuditEntry } from "@/lib/audit";
import type { AuditLog } from "@/lib/types";

function makeLog(overrides: Partial<AuditLog>): AuditLog {
  return {
    id: "log-1",
    table_name: "inspections",
    record_id: "rec-1",
    action: "update",
    old_data: null,
    new_data: null,
    user_id: "user-1",
    created_at: "2026-04-01T10:00:00Z",
    user: { id: "user-1", full_name: "Joao Silva", role: "inspector" },
    ...overrides,
  };
}

describe("formatAuditEntry", () => {
  it("formats an insert action", () => {
    const entry = formatAuditEntry(
      makeLog({ action: "insert", table_name: "inspections" })
    );
    expect(entry.action).toBe("insert");
    expect(entry.description).toContain("criou");
    expect(entry.description).toContain("inspecao");
    expect(entry.userName).toBe("Joao Silva");
  });

  it("formats a delete action", () => {
    const entry = formatAuditEntry(
      makeLog({ action: "delete", table_name: "equipment" })
    );
    expect(entry.action).toBe("delete");
    expect(entry.description).toContain("removeu");
    expect(entry.description).toContain("equipamento");
  });

  it("formats an inspection status update", () => {
    const entry = formatAuditEntry(
      makeLog({
        action: "update",
        table_name: "inspections",
        old_data: { status: "draft" },
        new_data: { status: "submitted" },
      })
    );
    expect(entry.description).toContain("Rascunho");
    expect(entry.description).toContain("Enviada");
  });

  it("formats a checklist item status update", () => {
    const entry = formatAuditEntry(
      makeLog({
        action: "update",
        table_name: "checklist_items",
        old_data: { status: "pending", label: "Alimentacao VCA e Tomada" },
        new_data: { status: "approved", label: "Alimentacao VCA e Tomada" },
      })
    );
    expect(entry.description).toContain("Pendente");
    expect(entry.description).toContain("Aprovado");
    expect(entry.description).toContain("Alimentacao VCA e Tomada");
  });

  it("formats an inspection notes update", () => {
    const entry = formatAuditEntry(
      makeLog({
        action: "update",
        table_name: "inspections",
        old_data: { notes: "old note", status: "in_progress" },
        new_data: { notes: "new note", status: "in_progress" },
      })
    );
    expect(entry.description).toContain("observacoes");
  });

  it("uses 'Sistema' when no user is present", () => {
    const entry = formatAuditEntry(
      makeLog({ user_id: null, user: null, action: "insert" })
    );
    expect(entry.userName).toBe("Sistema");
    expect(entry.description).toContain("Sistema");
  });

  it("handles generic update with no recognizable field changes", () => {
    const entry = formatAuditEntry(
      makeLog({
        action: "update",
        table_name: "inspections",
        old_data: { status: "draft", notes: "a" },
        new_data: { status: "draft", notes: "a" },
      })
    );
    expect(entry.description).toContain("alterou");
    expect(entry.description).toContain("inspecao");
  });

  it("returns correct id and date fields", () => {
    const entry = formatAuditEntry(
      makeLog({ id: "abc-123", created_at: "2026-01-15T08:30:00Z" })
    );
    expect(entry.id).toBe("abc-123");
    expect(entry.date).toBe("2026-01-15T08:30:00Z");
  });
});
