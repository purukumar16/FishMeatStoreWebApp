import { useState, useEffect, useMemo } from 'react';

/**
 * Generates a deterministic batch preparation time for a product at a specific retail store.
 * Simulates real-time butcher shop packing schedules (between 12 and 85 minutes ago).
 */
export function getStoreBatchPrepTimestamp(productId: string, storeId: string): Date {
  let hash = 0;
  const key = `${productId}_${storeId}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const minutesAgo = (positiveHash % 73) + 12; // 12 to 85 minutes ago
  const secondsOffset = positiveHash % 60;
  return new Date(Date.now() - (minutesAgo * 60 + secondsOffset) * 1000);
}

/**
 * Formats elapsed seconds into human-readable compact notation (e.g., '18m 42s ago' or '1h 14m ago')
 */
export function formatElapsedDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.max(1, seconds)}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSecs}s ago`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m ago`;
}

/**
 * Hook providing a live ticking 'Freshly Packed' timer for a product at a local store
 */
export function useFreshlyPackedTimer(productId: string, storeId: string) {
  // Recompute prepTime when productId or storeId changes
  const prepTime = useMemo(
    () => getStoreBatchPrepTimestamp(productId, storeId),
    [productId, storeId]
  );

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Tick every 1 second for active live freshness feedback
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(1, Math.floor((now - prepTime.getTime()) / 1000));
  const formattedTime = formatElapsedDuration(elapsedSeconds);
  const prepTimeFormatted = prepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    elapsedSeconds,
    formattedTime,
    prepTimeFormatted,
  };
}
