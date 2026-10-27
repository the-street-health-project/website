/**
 * True when NiFi runs inside another page (an embedded preview). Embedded previews usually
 * block requests to other websites, so the app uses its saved data and offline map there.
 */
export const EMBEDDED = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();
