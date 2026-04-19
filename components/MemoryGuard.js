"use client";

import { useEffect } from "react";
import { reportMemoryPressure } from "../lib/api-monitor";

const MEMORY_CHECK_INTERVAL_MS = 20000;
const MEMORY_GUARD_THRESHOLD_MB = 220;
const MEMORY_GUARD_USAGE_RATIO = 0.72;
const MEMORY_GUARD_COOLDOWN_MS = 60000;

export function MemoryGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") {
      return;
    }

    let lastTriggeredAt = 0;

    const inspectMemory = () => {
      const memory = performance.memory;

      if (!memory) {
        return;
      }

      const usedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      const limitMB = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
      const ratio = memory.jsHeapSizeLimit > 0
        ? memory.usedJSHeapSize / memory.jsHeapSizeLimit
        : 0;
      const thresholdMB = Math.min(
        MEMORY_GUARD_THRESHOLD_MB,
        Math.round(limitMB * MEMORY_GUARD_USAGE_RATIO)
      );

      if (usedMB < thresholdMB && ratio < MEMORY_GUARD_USAGE_RATIO) {
        return;
      }

      if (Date.now() - lastTriggeredAt < MEMORY_GUARD_COOLDOWN_MS) {
        return;
      }

      lastTriggeredAt = Date.now();
      reportMemoryPressure({
        usedMB,
        limitMB,
        thresholdMB,
      });

      window.dispatchEvent(new CustomEvent("lumen:memory-pressure", {
        detail: {
          usedMB,
          limitMB,
          thresholdMB,
        },
      }));
    };

    inspectMemory();
    const intervalId = window.setInterval(inspectMemory, MEMORY_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

export default MemoryGuard;
