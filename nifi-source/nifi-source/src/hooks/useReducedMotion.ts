import { useSettings } from '../state/settings';
import { useMediaQuery } from './useMediaQuery';

/**
 * True when animations should be turned down: either the device asks for reduced motion
 * (an accessibility setting) or the user chose "Reduced effects" in NiFi's settings.
 */
export function useReducedMotion(): boolean {
  const { settings } = useSettings();
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  return systemReduced || settings.effects === 'reduced';
}
