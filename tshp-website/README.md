# The Street Health Project: website

Source for **thestreethealthproject.org**. It's a plain static site: HTML, one
stylesheet and a few small scripts. No framework, no npm and no build step.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: 3D first-aid kit hero (drag to spin, click to open, click any item for what it is and why it's in the kit), the need, both programs, the "pack a kit" game, the kit calculator, Kanchipuram teaser, partners + sponsor levels, ways to help |
| `about.html` | Mission, co-founders, values, current numbers |
| `programs.html` | "What we do": kit explorer (tabs + flip cards explaining every item), an animated how-it-works stepper, partner donations abroad, and a pointer to Upcoming |
| `upcoming.html` | "What's next" (dark page): statewide outreach, kit drives and partnership goals, then the completed Kanchipuram donation with a draggable 3D globe of the route (facts, exact quantities, packing and handoff photos, the Lions Club's thank-you in Tamil + English, bulletin scan) |
| `partners.html` | Blair Ridge Dental, His Hands Free Clinic, Lions Club of Kanchipuram Host (with flip-over thank-you cards), a 3D photo carousel, and the sponsor levels |
| `sponsor.html` | Sponsorship & donation guide: six levels (Neighbor $100+ to Cornerstone $5,000+), a slider that shows your level, kits and perks, how to give, the Cornerstone sponsors wall, FAQ |
| `get-involved.html` | Three ways to help, the kit calculator and the contact form |
| `story.html` | "Within Reach", the interactive story: scroll-to-fill dots for Iowa's 17,000+, flip cards, drag items into a 3D box, a photo stack, and the globe |
| `404.html` | Shown by Cloudflare for any missing page |

```
assets/css/styles.css     all styling (colors are CSS variables at the top)
assets/js/site-data.js    numbers + links: EDIT HERE
assets/js/site.js         menu, calculator, contact form, photo zoom
assets/js/motion.js       animations on every page (see below)
assets/js/home.js         homepage only: the 3D kit and the "pack a kit" game
assets/js/globe.js        Upcoming + story: the 3D globe
assets/js/sponsor.js      Sponsor page: the level slider
assets/js/programs.js     What we do: stepper + kit explorer tabs
assets/js/partners.js     Partners: the 3D photo carousel
assets/js/story.js        the interactive story
assets/js/globe-dots.js   the globe's land dots (generated from public-domain
                          Natural Earth data, so no outside service is needed)
assets/img/               optimized photos and logos
```

## Animations and interactive parts

All of this is extra polish. Every page still reads and works if JavaScript is
off. For visitors whose device asks for **reduced motion**, animations switch
off automatically and everything shows immediately.

- **Home hero:** a first-aid kit built in 3D with CSS. Drag to spin it; click it
  (or the button) to open it and the 18 kit items fly out and orbit. It opens by
  itself once, shortly after the page loads. The item names come from the kit
  list on the same page, so there's only one list to keep up to date.
- **Pack a kit** (home): tap each item to pack it; a progress bar fills, and at
  18/18 a burst of little crosses and a "Fund a real one" button appear.
- **Globe** (Upcoming): drag to spin; a package travels the route from Cedar
  Rapids to Kanchipuram, and the globe eases back to show the whole route.
- **Every page:** headings rise in word by word, the red brush underlines paint
  themselves in, numbers count up, cards tilt toward the mouse, crosses drift
  behind the page headers, a light follows the mouse on dark sections, a thin
  red bar under the menu shows scroll progress, and pages fade into each other
  in browsers that support it.

Animation loops pause when they're off screen or the tab is hidden, so they
don't drain batteries. The heavy parts (`home.js`, `globe.js`) only load on the
one page that uses them.

## Preview it on your computer

From this folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening the HTML files by double-clicking also
works, but the contact form and a few details behave best through a server.

## Updating numbers and links

Open `assets/js/site-data.js`. Every stat (`$8` kit cost, `4+` drives, `8+`
volunteers, …) and every outside link (GoFundMe, Amazon Wishlist, Instagram,
Lions Club) lives there once, and the whole site picks it up.

The HTML also contains the same numbers as plain text, so pages read correctly
before the script runs and for search engines. When you change a number, it's
good practice to also search the HTML for `data-site="thatKey"` and update the
text there too.

The Kanchipuram quantities (72 / 73 / 45 / 50 / 16 / 4 / 4 = 264) are a fixed
historical record, so they are written directly in the pages.

## Sponsorship levels

The six levels and their dollar minimums live in `assets/js/site-data.js`
(`tiers`), and the perks for each level are written on the tier cards in
`sponsor.html`. The slider reads the perks straight from those cards, so edit
them in one place.

**The perks and FAQ answers are a first draft. Please check they're things you
can actually deliver before going live** (for example "your logo on our Partners
page" at Guardian, or "an invitation to a packing day" at Champion).

"Sponsor at this level" buttons open the contact form with the level already
filled in (`get-involved.html?topic=sponsor&tier=guardian#contact`).

## Kit item descriptions

The "what it is and why it's in the kit" text that pops up when you click an
item in the homepage's 3D kit comes from the `data-what` attribute on each item
in the homepage's "Pack a kit" list (`index.html`, search for `data-what`). The
short lines on the What we do flip cards are in `programs.html`.

## Turning on the contact form (one-time, ~2 minutes)

1. Go to https://web3forms.com, enter the email that should receive messages,
   and you'll be emailed a free **access key**.
2. In `assets/js/site-data.js`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.
3. Push. Done.

Until then, the form tells people to DM `@street.health.project` on Instagram
instead of silently failing.

## Deploying (Cloudflare Pages)

The live site is served by Cloudflare Pages from a GitHub repo. To ship this
version, replace the old files in that repo with **everything in this folder**
(keep the folder structure), commit and push. Cloudflare redeploys in a minute
or two.

Cloudflare build settings: **Framework preset** None · **Build command** (blank)
· **Build output directory** `/`.

`_headers` adds basic security headers and caching for photos. `sitemap.xml`,
`robots.txt` and each page's `<link rel="canonical">` already point at
`https://thestreethealthproject.org`.

## Adding or replacing a photo

Photos come in two widths so phones download less: `name-800.jpg` and
`name-1400.jpg` (≈ 80% JPEG quality). Keep the same file names to swap a photo
in place. For a brand-new photo, save both widths, then copy an existing
`<img ... srcset=...>` tag and change the names, `width`/`height` and `alt`
text. The `alt` text should describe what's actually in the photo.

## Accuracy rules (please keep these)

These come from the org's content brief and matter for trust:

- **Kanchipuram is completed**, and it's one donation: a first step, not proof
  that TSHP is an "international organization".
- Supplies were **donated to Lions Club of Kanchipuram Host, which uses them
  through its hospital and community service activities**. Never write that TSHP
  "distributed supplies to patients".
- **Arya Ravikumar and Dakshesh "Dakshi" Kondiboyina** are the founders who
  organized it. Ravikumar and Rajasekar Devarajan were volunteers who helped
  with that one delivery.
- Use the **exact quantities**; don't round them.
- Credit every donation photo to the **specific organization** that gave it.
- Kit cost is **$8** ("$8 helps make 1 medical kit", from the printed flyer).
- Future partnerships are **goals**, not active projects, until confirmed.
- Don't claim 501(c)(3) or tax-deductible status unless that becomes true.

## Known gaps / to-do

- **Headshots**: the team section shows initials until real photos exist.
- **Contact form**: needs the Web3Forms key above.
- **"120+ items distributed"**: this stat is kept in `site-data.js` but not
  shown, because it's lower than the 264 supplies donated in Kanchipuram alone.
  Update it and it can go back on the About page.
- **Laptops / BiliScan**: the most recent version of the site dropped this
  program, so this version leaves it out too. If it's still active, it can come
  back as a section on `programs.html`.
