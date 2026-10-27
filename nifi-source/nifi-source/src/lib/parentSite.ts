/**
 * NiFi is a program of The Street Health Project. On that nonprofit's website, NiFi lives in a
 * nifi/ folder (thestreethealthproject.org/nifi/), so NiFi can link back to the site around it.
 */

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
