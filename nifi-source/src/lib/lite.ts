/**
 * Should NiFi go easy on this phone? True when the visitor turned on Data Saver, is on a very slow
 * (2G) connection, or the device has 2 GB of memory or less. Then the 3D scenes (about 600 KB of
 * code, plus a lot of graphics work) wait for a tap instead of starting on their own.
 * Browsers that don't share this information (Safari, Firefox) get the full experience.
 */
type NetworkInfo = { saveData?: boolean; effectiveType?: string };
type NavigatorHints = { connection?: NetworkInfo; deviceMemory?: number };

export function preferLite(nav: NavigatorHints | undefined = typeof navigator === 'undefined' ? undefined : (navigator as NavigatorHints)): boolean {
  if (!nav) return false;
  const c = nav.connection;
  if (c?.saveData) return true;
  if (c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g') return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return true;
  return false;
}
