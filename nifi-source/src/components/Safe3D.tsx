/**
 * A safety net around every 3D scene. The 3D code loads separately (Suspense shows `placeholder`
 * meanwhile), and if anything in it fails, for example an old phone's graphics driver, only
 * this box shows a short note. The rest of NiFi keeps working.
 */
import { Component, Suspense, type ReactNode } from 'react';

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Safe3D({ children, placeholder, className = '' }: { children: ReactNode; placeholder?: ReactNode; className?: string }) {
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
