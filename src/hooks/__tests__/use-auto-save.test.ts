import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "../use-auto-save";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with idle status", () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() =>
      useAutoSave({ value: "initial", onSave, delay: 1000 })
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("does not save immediately on value change (debounce)", () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 1000 }),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "changed" });

    // onSave should NOT have been called yet
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves after the debounce delay", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 1000 }),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "changed" });

    // Advance past the debounce delay
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledWith("changed");
  });

  it("transitions through idle -> saving -> saved -> idle", async () => {
    let resolvePromise: (val: { success: boolean }) => void;
    const onSave = vi.fn().mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 500 }),
      { initialProps: { value: "initial" } }
    );

    expect(result.current.status).toBe("idle");

    // Trigger a change
    rerender({ value: "new value" });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.status).toBe("saving");

    // Resolve the save
    await act(async () => {
      resolvePromise!({ success: true });
    });

    expect(result.current.status).toBe("saved");
    expect(result.current.lastSaved).toBeInstanceOf(Date);

    // After 2s, should fade back to idle
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe("idle");
  });

  it("handles save errors", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValue({ success: false, error: "Network error" });

    const { result, rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 500 }),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "changed" });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
  });

  it("retry triggers a new save attempt", async () => {
    const onSave = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: "Failed" })
      .mockResolvedValueOnce({ success: true });

    const { result, rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 500 }),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "changed" });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.status).toBe("error");

    // Retry
    await act(async () => {
      result.current.retry();
    });

    expect(result.current.status).toBe("saved");
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("does not save when enabled is false", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });

    const { rerender } = renderHook(
      ({ value, enabled }) => useAutoSave({ value, onSave, delay: 500, enabled }),
      { initialProps: { value: "initial", enabled: false } }
    );

    rerender({ value: "changed", enabled: false });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("resets debounce timer on rapid changes", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });

    const { rerender } = renderHook(
      ({ value }) => useAutoSave({ value, onSave, delay: 1000 }),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "change 1" });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    rerender({ value: "change 2" });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Should NOT have saved yet (timer was reset)
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Now it should have saved with the latest value
    expect(onSave).toHaveBeenCalledWith("change 2");
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
