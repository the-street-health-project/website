/**
 * NiFi is a program of The Street Health Project. On that nonprofit's website, NiFi lives in a
 * nifi/ folder (thestreethealthproject.org/nifi/), so NiFi can link back to the site around it.
 */
import type { MouseEvent } from 'react';

/** The Street Health Project's website. */
export const SHP_SITE = 'https://thestreethealthproject.org/';

/** Where the nonprofit's site is served: its own domain, Cloudflare's previews of it, and a computer testing it. */
const SHP_HOSTS = /^(?:www\.)?thestreethealthproject\.org$|\.pages\.dev$|^localhost$|^127\.0\.0\.1$/i;

/**
 * The address of the site around NiFi, worked out from NiFi's own address. Null when NiFi isn't in a
 * nifi/ folder on that site (for example a standalone copy at username.github.io/nifi/).
 */
export function parentSiteFor(pathname: string, hostname: string): string | null {
  if (!SHP_HOSTS.test(hostname)) return null;
  const match = /^(.*\/)nifi\/[^/]*$/i.exec(pathname);
  return match ? match[1] : null;
}

/** Where "back to The Street Health Project" goes. Null in a preview or a standalone copy of NiFi. */
export const PARENT_SITE = typeof window === 'undefined' ? null : parentSiteFor(window.location.pathname, window.location.hostname);

type WithReturn = Window & { SHPReturn?: { play: (url: string) => void } };

/**
 * Click handler for links back to The Street Health Project. It plays the site's "heartbeat" transition,
 * which lives in the site's own assets/js/return.js so the site and NiFi share one version of it.
 * With motion turned down, or if that file can't load quickly, the link simply goes.
 */
export function returnToParent(e: MouseEvent<HTMLAnchorElement>) {
  if (!PARENT_SITE || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!document.documentElement.classList.contains('cc-fx')) return; // motion is turned down
  e.preventDefault();
  const href = e.currentTarget.href;
  const w = window as WithReturn;
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    if (w.SHPReturn) w.SHPReturn.play(href);
    else window.location.assign(href);
  };
  if (w.SHPReturn) return go();
  const script = document.createElement('script');
  script.src = `${PARENT_SITE}assets/js/return.js`;
  script.onload = go;
  script.onerror = go;
  window.setTimeout(go, 1500);
  document.head.appendChild(script);
}
