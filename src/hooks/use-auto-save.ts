"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<{ success: boolean; error?: string }>;
  delay?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  error: string | null;
  retry: () => void;
  hasUnsavedChanges: boolean;
}

export function useAutoSave<T>({
  value,
  onSave,
  delay = 3000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef<T>(value);
  const initialValueRef = useRef<T>(value);
  const isFirstRender = useRef(true);
  const onSaveRef = useRef(onSave);

  // Keep onSave ref current
  onSaveRef.current = onSave;

  const performSave = useCallback(async (val: T) => {
    setStatus("saving");
    setError(null);

    try {
      const result = await onSaveRef.current(val);

      if (result.success) {
        setStatus("saved");
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        initialValueRef.current = val;

        // Fade back to idle after 2s
        fadeTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, 2000);
      } else {
        setStatus("error");
        setError(result.error ?? "Erro ao salvar");
      }
    } catch {
      setStatus("error");
      setError("Erro ao salvar");
    }
  }, []);

  // Debounced save on value change
  useEffect(() => {
    // Skip the first render (initial value)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled) return;

    valueRef.current = value;
    setHasUnsavedChanges(true);

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    timerRef.current = setTimeout(() => {
      performSave(valueRef.current);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const retry = useCallback(() => {
    performSave(valueRef.current);
  }, [performSave]);

  return {
    status,
    lastSaved,
    error,
    retry,
    hasUnsavedChanges,
  };
}
