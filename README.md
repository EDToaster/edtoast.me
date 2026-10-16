# edtoast.me

Personal site: resume, small browser games, demos. Static, built with
[Astro 7](https://astro.build), hosted on GitHub Pages at
[edtoast.me](https://edtoast.me).

## Develop

Needs Node 22.22+ (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check + static build into dist/
```

## Layout

```
src/
  pages/            routes: / (intro, work, education, projects), /games, /games/[slug], /demos, /demos/[slug], 404
  layouts/Base.astro
  components/       Header, Footer, Icon, EntryList
  styles/           tokens.css (all colours/sizes, light only), global.css
  data/             site.ts (name, hero links), resume.ts (work, education), projects.ts
  content/games/    one .md per game: frontmatter = listing metadata, body = about text
  content/demos/    same shape as games; set `href` for demos hosted elsewhere
  games/<slug>/     Game.astro + logic.ts for each game
  demos/<slug>/     Demo.astro for each local demo
public/             favicon, CNAME, static files
docs/DESIGN.md      visual rules; read before changing styles
```

## Add a game

1. `src/content/games/<slug>.md` with `title`, `summary`, `date`.
2. `src/games/<slug>/Game.astro` (keep game logic in a DOM-free `logic.ts`).
3. It shows up at `/games/<slug>` and in the listings. The build fails if
   either half is missing.

## Deploy

Push to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. PRs run `ci.yml` (typecheck + build).

DNS for the apex domain (homelab subdomains are unaffected):

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| AAAA | `@` | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 |
| CNAME | `www` | `edtoaster.github.io` |
