# The Street Health Project — Website

Live source for streethealthproject's website. Single self-contained
HTML file, no build step, no dependencies.

## What's in here

- `index.html` — the entire site. All images (logo, sponsor logos, donation
  photos, Kanchipuram photos) are embedded directly in the file as base64
  data, so there are no separate image files to keep track of or lose.
- Sections are tabs, not separate pages: Home, Programs, Gallery, Sponsors,
  Team, Upcoming, Get Involved. Switching tabs is handled by a small vanilla
  JS block near the bottom of the file — no framework, no npm packages.

## Deploying on Cloudflare Pages

This is a static file, so the Cloudflare Pages setup is about as simple as
it gets:

1. Push this repo to GitHub (see below if you haven't already).
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**, and pick this repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. Deploy. Cloudflare will serve `index.html` at your `*.pages.dev` domain,
   and you can attach a custom domain from the same project settings page
   once it's live.

There's nothing to build, so every push to the connected branch will
redeploy automatically within a minute or two.

## Pushing this to GitHub for the first time

From inside this folder:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## Editing the site

Everything lives in `index.html`:

- **Colors, fonts:** CSS custom properties near the top of the `<style>`
  block (`--navy`, `--red`, `--sky-tint`, etc.)
- **Copy:** search for the section you want to change — each tab's content
  sits inside a `<div class="tab-panel" id="panel-...">` block.
- **Kit cost, impact stats, hero numbers:** currently hardcoded inline in
  the HTML (not pulled from a shared config object yet). If you want these
  centralized so they're easy to update in one place, that's a reasonable
  next improvement — ask Claude Code to refactor them into a single JS
  `SITE_CONFIG` object.
- **Images:** since everything's embedded as base64, replacing a photo
  means re-encoding a new file and swapping the `data:image/...;base64,...`
  string. It's easiest to hand a new photo and this file to Claude or
  Claude Code and ask it to do the swap rather than doing it by hand.

## Source material

If you're handing this project to a fresh Claude Code session later, two
files are useful context (not included in this repo, ask for them
separately if you don't still have them):

- `CONTENT.md` — the full fact base: mission copy, program details, kit
  contents and cost, sponsor info, and the complete Kanchipuram donation
  story with exact quantities and names.
- `MASTER_BUILD_PROMPT.md` — a broader rebrand direction (different color
  system and tagline) that hasn't been fully applied to this version.
  Worth a look if you ever want to do a bigger redesign, but note it
  conflicts with the real brand colors/tagline used in this file today.

## Known gaps

- Team tab currently shows placeholder initials instead of real photos.
- No contact form — the "Get Involved" tab links out to GoFundMe, the
  Amazon Wishlist, and Instagram instead.
- No analytics wired up.
