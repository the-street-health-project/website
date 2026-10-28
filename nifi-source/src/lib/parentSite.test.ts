import { describe, expect, it } from 'vitest';
import { parentSiteFor } from './parentSite';

const SHP = 'thestreethealthproject.org';

describe('finding The Street Health Project site around NiFi', () => {
  it('links back to the folder that holds nifi/', () => {
    expect(parentSiteFor('/nifi/', SHP)).toBe('/');
    expect(parentSiteFor('/nifi/index.html', 'www.' + SHP)).toBe('/');
    expect(parentSiteFor('/nifi/', 'localhost')).toBe('/');
    expect(parentSiteFor('/preview/nifi/', 'abc123.website.pages.dev')).toBe('/preview/');
  });

  it("doesn't link anywhere when NiFi isn't in a nifi/ folder on that site", () => {
    expect(parentSiteFor('/', SHP)).toBeNull();
    expect(parentSiteFor('/water.html', SHP)).toBeNull();
    expect(parentSiteFor('/nifinder/', SHP)).toBeNull();
    // A standalone copy somewhere else, like GitHub Pages, has no Street Health site around it.
    expect(parentSiteFor('/nifi/', 'username.github.io')).toBeNull();
  });
});
