# The Street Health Project

A student-led nonprofit in Cedar Rapids and Marion, Iowa, with two programs:
**Care Kits** (hand-packed hygiene and first-aid kits for people in need) and
**NiFi** (plain-English nitrate data for Iowa's rivers). This repository holds
the website and NiFi's code.

| Folder | What it is |
|---|---|
| [`street-health-website/`](street-health-website/) | The website at thestreethealthproject.org: plain HTML, CSS and JavaScript, no build step. Cloudflare publishes this folder. It includes the finished NiFi app, in `street-health-website/nifi/`. See its README. |
| [`nifi-source/`](nifi-source/) | NiFi's source code (React, TypeScript, Vite). It isn't published directly: build it to update the app on the website. See its README. |

## Cloudflare Pages settings

Project "website" (website-arl.pages.dev), connected to this repo:

- Framework preset: **None**
- Build command: **(empty)**
- Build output directory: **`street-health-website`**
- Root directory: **(empty)**

The domain `thestreethealthproject.org` is added under the project's **Custom
domains**.

## Updating the website

Edit the files in `street-health-website/` and commit. Cloudflare redeploys in a
minute or two.

## Updating NiFi

With [Node.js](https://nodejs.org) 20.19+ installed:

```
cd nifi-source
npm install
npm run build:site
```

`build:site` type-checks and builds NiFi, then copies it into
`street-health-website/nifi/`. Commit both folders. `npm test` runs NiFi's tests.
