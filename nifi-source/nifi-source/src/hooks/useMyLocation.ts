/**
 * "Use my location": asks the browser for the device's position (the user must allow it).
 * The result is named after the nearest Iowa town, e.g. "Near Ames".
 * Nothing is sent anywhere; the position stays on the device.
 */
import { useCallback, useState } from 'react';
import type { Place } from '../data/types';
import { isNearIowa } from '../lib/geo';
import { nearestTown } from '../lib/places';

export function useMyLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(
    () =>
      new Promise<Place | null>((resolve) => {
        if (!('geolocation' in navigator)) {
          setError("This device can't share its location. Search for your town instead.");
          resolve(null);
          return;
        }
        setLoading(true);
        setError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLoading(false);
            const { latitude: lat, longitude: lon } = pos.coords;
            if (!isNearIowa(lat, lon)) {
              setError("You seem to be outside Iowa. NiFi covers Iowa's streams, so the nearest sites may be far away.");
            }
            const town = nearestTown(lat, lon);
            resolve({ name: town.miles < 3 ? town.name : `Near ${town.name}`, lat, lon });
          },
          (err) => {
            setLoading(false);
            setError(
              err.code === err.PERMISSION_DENIED
                ? 'Location access is turned off. Search for your town instead.'
                : "Couldn't find your location. Search for your town instead.",
            );
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
        );
      }),
    [],
  );

  return { locate, loading, error };
}
