/**
 * Pick a location: search for a town, or use the device's location.
 */
import type { Place } from '../data/types';
import { useMyLocation } from '../hooks/useMyLocation';
import { PlaceSearch } from './PlaceSearch';
import { Button } from './ui';

interface Props {
  label: string;
  value: Place | null;
  onChange: (place: Place) => void;
}

export function LocationPicker({ label, value, onChange }: Props) {
  const { locate, loading, error } = useMyLocation();
  return (
    <div className="flex flex-col gap-3">
      {value && (
        <p className="text-ink-2">
          Current: <strong className="text-ink">{value.name}</strong>
        </p>
      )}
      <PlaceSearch label={label} placeholder="Type a town name, like Ames" onPickPlace={onChange} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-ink-3">or</span>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={async () => {
            const place = await locate();
            if (place) onChange(place);
          }}
        >
          <span aria-hidden="true">◎</span> {loading ? 'Finding you…' : 'Use my location'}
        </Button>
      </div>
      {error && (
        <p role="status" className="text-ink-2">
          {error}
        </p>
      )}
    </div>
  );
}
