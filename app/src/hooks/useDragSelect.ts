"use client";

import { useCallback, useRef, useState } from "react";

export function useDragSelect() {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<string | null>(null);
  const allDatesRef = useRef<string[]>([]);

  const setAllDates = useCallback((dates: string[]) => {
    allDatesRef.current = dates;
  }, []);

  const handlePointerDown = useCallback(
    (dateKey: string, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = dateKey;

      // If shift is held, extend selection
      if (e.shiftKey && selectedDates.size > 0) {
        const lastSelected = Array.from(selectedDates).sort().pop()!;
        const allDates = allDatesRef.current;
        const startIdx = allDates.indexOf(lastSelected);
        const endIdx = allDates.indexOf(dateKey);
        if (startIdx >= 0 && endIdx >= 0) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const newSelection = new Set(selectedDates);
          for (let i = from; i <= to; i++) {
            newSelection.add(allDates[i]);
          }
          setSelectedDates(newSelection);
        }
      } else {
        setSelectedDates(new Set([dateKey]));
      }
    },
    [selectedDates]
  );

  const handlePointerEnter = useCallback(
    (dateKey: string) => {
      if (!isDragging || !dragStartRef.current) return;

      const allDates = allDatesRef.current;
      const startIdx = allDates.indexOf(dragStartRef.current);
      const endIdx = allDates.indexOf(dateKey);

      if (startIdx >= 0 && endIdx >= 0) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const newSelection = new Set<string>();
        for (let i = from; i <= to; i++) {
          newSelection.add(allDates[i]);
        }
        setSelectedDates(newSelection);
      }
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDates(new Set());
  }, []);

  return {
    selectedDates,
    setSelectedDates,
    isDragging,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    clearSelection,
    setAllDates,
  };
}
