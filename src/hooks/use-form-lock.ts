"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface FormLockState {
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  isOwner: boolean;
  loading: boolean;
}

interface UseFormLockReturn extends FormLockState {
  acquireLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
}

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

export function useFormLock(inspectionId: string): UseFormLockReturn {
  const [state, setState] = useState<FormLockState>({
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    isOwner: false,
    loading: false,
  });

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const supabase = createClient();

  const checkLock = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    currentUserIdRef.current = user.id;

    const { data: lock, error } = await supabase
      .from("form_locks")
      .select("*, locked_by_profile:profiles!locked_by(full_name)")
      .eq("inspection_id", inspectionId)
      .maybeSingle();

    if (error || !lock) {
      // No lock exists - try to acquire
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, loading: false }));
      }
      return null;
    }

    // Check if lock is stale
    const lastHeartbeat = new Date(lock.last_heartbeat).getTime();
    const isStale = Date.now() - lastHeartbeat > STALE_THRESHOLD;

    if (isStale) {
      // Stale lock - delete it and allow takeover
      await supabase.from("form_locks").delete().eq("id", lock.id);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, loading: false }));
      }
      return null;
    }

    const isOwner = lock.locked_by === user.id;
    const lockedByName =
      lock.locked_by_profile?.full_name ?? "Outro usuario";

    if (mountedRef.current) {
      setState({
        isLocked: !isOwner,
        lockedBy: isOwner ? null : lockedByName,
        lockedAt: lock.locked_at,
        isOwner,
        loading: false,
      });
    }

    return lock;
  }, [inspectionId, supabase]);

  const acquireLock = useCallback(async (): Promise<boolean> => {
    const userId = currentUserIdRef.current;
    if (!userId) return false;

    const { error } = await supabase.from("form_locks").upsert(
      {
        inspection_id: inspectionId,
        locked_by: userId,
        locked_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      },
      { onConflict: "inspection_id" }
    );

    if (error) {
      return false;
    }

    if (mountedRef.current) {
      setState({
        isLocked: false,
        lockedBy: null,
        lockedAt: new Date().toISOString(),
        isOwner: true,
        loading: false,
      });
    }

    return true;
  }, [inspectionId, supabase]);

  const releaseLock = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;

    await supabase
      .from("form_locks")
      .delete()
      .eq("inspection_id", inspectionId)
      .eq("locked_by", userId);

    if (mountedRef.current) {
      setState({
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        isOwner: false,
        loading: false,
      });
    }
  }, [inspectionId, supabase]);

  const sendHeartbeat = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) return;

    await supabase
      .from("form_locks")
      .update({ last_heartbeat: new Date().toISOString() })
      .eq("inspection_id", inspectionId)
      .eq("locked_by", userId);
  }, [inspectionId, supabase]);

  // On mount: check lock, acquire if possible, start heartbeat
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const existingLock = await checkLock();

      if (!existingLock) {
        const acquired = await acquireLock();
        if (acquired) {
          // Start heartbeat
          heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        }
      } else {
        const userId = currentUserIdRef.current;
        const isOwner = existingLock.locked_by === userId;
        if (isOwner) {
          // Refresh heartbeat and start interval
          await sendHeartbeat();
          heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        }
      }
    }

    init();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      // Release lock on unmount (fire and forget)
      const userId = currentUserIdRef.current;
      if (userId) {
        supabase
          .from("form_locks")
          .delete()
          .eq("inspection_id", inspectionId)
          .eq("locked_by", userId)
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionId]);

  return {
    ...state,
    acquireLock,
    releaseLock,
  };
}
