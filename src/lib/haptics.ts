/**
 * Safe mobile/tablet haptic feedback helper using the Vibration API.
 * Gracefully no-ops on unsupported browsers (e.g. desktop or iOS Safari).
 */
function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors in restricted contexts
    }
  }
}

export const hapticTap = (): void => vibrate(12);
export const hapticSuccess = (): void => vibrate([18, 30, 24]);
export const hapticWarning = (): void => vibrate([30, 40, 30]);
