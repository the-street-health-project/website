/**
 * A safety net around every 3D scene. The 3D code loads separately (Suspense shows `placeholder`
 * meanwhile), and if anything in it fails, for example an old phone's graphics driver, only
 * this box shows a short note. The rest of NiFi keeps working.
 *
 * On phones that are saving data, on a 2G connection, or short on memory (see lib/lite.ts), the
 * scene waits for a tap instead of downloading on its own. `askOnSlow={false}` skips that for
 * scenes the visitor already chose to open (like the map's "3D Hologram" switch).
 */
import { Component, Suspense, useState, type ReactNode } from 'react';
import { preferLite } from '../lib/lite';

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Safe3D({
  children,
  placeholder,
  className = '',
  askOnSlow = true,
}: {
  children: ReactNode;
  placeholder?: ReactNode;
  className?: string;
  askOnSlow?: boolean;
}) {
  const [start, setStart] = useState(() => !askOnSlow || !preferLite());

  if (!start) {
    return (
      <div className={`grid place-items-center gap-2 p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setStart(true)}
            className="cc-key cc-key--secondary inline-flex min-h-12 items-center rounded-xl border-2 border-sky bg-card px-4 font-bold text-ink hover:bg-sky-soft"
          >
            Show the 3D view
          </button>
          <p className="text-sm text-ink-2">Waiting for a tap, to save your data.</p>
        </div>
      </div>
    );
  }

  const failed = (
    <div className={`grid place-items-center p-6 text-center text-ink-2 ${className}`}>
      <p>The 3D view couldn't start on this device. Everything else in NiFi still works.</p>
    </div>
  );
  return (
    <Boundary fallback={failed}>
      <Suspense fallback={placeholder ?? <div className={className} />}>{children}</Suspense>
    </Boundary>
  );
}
