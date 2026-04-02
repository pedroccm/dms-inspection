import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormLock } from "../use-form-lock";

// Build a persistent chain mock
function createChain() {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  chain.then = vi.fn().mockImplementation((resolve?: (v: unknown) => void) => {
    if (resolve) resolve({ error: null });
    return Promise.resolve({ error: null });
  });

  return chain;
}

// Single persistent chain for the entire test suite
const persistentChain = createChain();

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => persistentChain,
  }),
}));

const mockUser = { id: "user-1" };
const otherUser = { id: "user-2" };

describe("useFormLock", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });

    // Reset chain mock call history but keep implementations
    (persistentChain.select as ReturnType<typeof vi.fn>).mockClear();
    (persistentChain.eq as ReturnType<typeof vi.fn>).mockClear();
    (persistentChain.update as ReturnType<typeof vi.fn>).mockClear();
    (persistentChain.delete as ReturnType<typeof vi.fn>).mockClear();
    (persistentChain.upsert as ReturnType<typeof vi.fn>).mockClear();
    (persistentChain.then as ReturnType<typeof vi.fn>).mockClear();

    // Default: no existing lock
    (persistentChain.maybeSingle as ReturnType<typeof vi.fn>)
      .mockClear()
      .mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("acquires lock when no existing lock is found", async () => {
    let hookResult: ReturnType<typeof renderHook>;

    await act(async () => {
      hookResult = renderHook(() => useFormLock("insp-1"));
    });

    const { result } = hookResult!;

    expect(persistentChain.upsert).toHaveBeenCalled();
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("sets isLocked when another user holds the lock", async () => {
    const recentHeartbeat = new Date().toISOString();
    (persistentChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: "lock-1",
        inspection_id: "insp-1",
        locked_by: otherUser.id,
        locked_at: recentHeartbeat,
        last_heartbeat: recentHeartbeat,
        locked_by_profile: { full_name: "Outro Inspetor" },
      },
      error: null,
    });

    let hookResult: ReturnType<typeof renderHook>;

    await act(async () => {
      hookResult = renderHook(() => useFormLock("insp-1"));
    });

    const { result } = hookResult!;

    expect(result.current.isLocked).toBe(true);
    expect(result.current.lockedBy).toBe("Outro Inspetor");
    expect(result.current.isOwner).toBe(false);
  });

  it("detects stale locks and allows takeover", async () => {
    const staleTime = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    (persistentChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: "lock-1",
        inspection_id: "insp-1",
        locked_by: otherUser.id,
        locked_at: staleTime,
        last_heartbeat: staleTime,
        locked_by_profile: { full_name: "Outro Inspetor" },
      },
      error: null,
    });

    let hookResult: ReturnType<typeof renderHook>;

    await act(async () => {
      hookResult = renderHook(() => useFormLock("insp-1"));
    });

    const { result } = hookResult!;

    expect(persistentChain.delete).toHaveBeenCalled();
    expect(persistentChain.upsert).toHaveBeenCalled();
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isLocked).toBe(false);
  });

  it("refreshes heartbeat when current user owns the lock", async () => {
    const recentHeartbeat = new Date().toISOString();
    (persistentChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: "lock-1",
        inspection_id: "insp-1",
        locked_by: mockUser.id,
        locked_at: recentHeartbeat,
        last_heartbeat: recentHeartbeat,
        locked_by_profile: { full_name: "Inspetor Atual" },
      },
      error: null,
    });

    let hookResult: ReturnType<typeof renderHook>;

    await act(async () => {
      hookResult = renderHook(() => useFormLock("insp-1"));
    });

    const { result } = hookResult!;

    expect(result.current.isOwner).toBe(true);
    expect(result.current.isLocked).toBe(false);
    expect(persistentChain.update).toHaveBeenCalled();
  });

  it("releases lock via releaseLock", async () => {
    let hookResult: ReturnType<typeof renderHook>;

    await act(async () => {
      hookResult = renderHook(() => useFormLock("insp-1"));
    });

    const { result } = hookResult!;

    (persistentChain.delete as ReturnType<typeof vi.fn>).mockClear();

    await act(async () => {
      await result.current.releaseLock();
    });

    expect(persistentChain.delete).toHaveBeenCalled();
    expect(result.current.isOwner).toBe(false);
  });
});
