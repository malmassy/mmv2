// app/lib/engine/utils/screenCalibration.ts
/**
 * Screen calibration utilities for accurate length measurements.
 * 
 * Since JavaScript doesn't have direct access to physical screen dimensions,
 * we use a calibration approach: display a reference object of known size
 * and ask the user to measure it with a real ruler to establish pixels-per-cm.
 */

const CALIBRATION_STORAGE_KEY = 'mmv2_screen_calibration_pxPerCm';

/**
 * Get the current calibration (pixels per centimeter).
 * Returns null if not calibrated.
 */
export function getCalibration(): number | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (stored) {
      const pxPerCm = parseFloat(stored);
      if (pxPerCm > 0 && Number.isFinite(pxPerCm)) {
        return pxPerCm;
      }
    }
  } catch (e) {
    // localStorage not available or access denied
  }
  
  return null;
}

/**
 * Set the calibration (pixels per centimeter).
 */
export function setCalibration(pxPerCm: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (pxPerCm > 0 && Number.isFinite(pxPerCm)) {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, pxPerCm.toString());
    }
  } catch (e) {
    // localStorage not available or access denied
  }
}

/**
 * Clear the calibration.
 */
export function clearCalibration(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CALIBRATION_STORAGE_KEY);
  } catch (e) {
    // localStorage not available or access denied
  }
}

/**
 * Estimate pixels per cm based on screen dimensions and device type.
 * This is a rough estimate and should be replaced with user calibration.
 * 
 * Uses common DPI assumptions:
 * - Desktop: ~96 DPI (1 inch = 96 pixels, 1 inch = 2.54 cm, so ~37.8 px/cm)
 * - Mobile: ~160-400 DPI (varies, estimate ~63 px/cm for 160 DPI)
 * - Tablet: ~130-264 DPI (estimate ~52 px/cm)
 * 
 * More accurate: uses screen dimensions and devicePixelRatio to estimate.
 */
export function estimatePixelsPerCm(): number {
  if (typeof window === 'undefined') return 38; // Default desktop estimate
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  
  // Estimate based on viewport width and common device types
  // This is very rough - calibration is strongly recommended
  
  // Check if mobile/tablet (viewport width < 768px)
  const isMobile = viewportWidth < 768;
  
  if (isMobile) {
    // Mobile devices: estimate ~60-70 px/cm (higher DPI)
    // Rough estimate based on common phone screen sizes
    return 65;
  } else {
    // Desktop: estimate ~38 px/cm (96 DPI standard)
    return 38;
  }
}

/**
 * Get pixels per cm, using calibration if available, otherwise estimate.
 */
export function getPixelsPerCm(): number {
  const calibrated = getCalibration();
  if (calibrated !== null) {
    return calibrated;
  }
  return estimatePixelsPerCm();
}

/**
 * Convert centimeters to pixels using current calibration/estimate.
 */
export function cmToPixels(cm: number): number {
  return cm * getPixelsPerCm();
}

/**
 * Convert pixels to centimeters using current calibration/estimate.
 */
export function pixelsToCm(px: number): number {
  return px / getPixelsPerCm();
}
