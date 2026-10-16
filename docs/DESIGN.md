# Design rules

The look follows Howard's original site (edtoaster.github.io, shown at
howardchen.ca): white page, light grey secondary text, one blue accent,
thin borders. Light mode only. All values live in `src/styles/tokens.css`.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#ffffff` | Page background |
| `--text` | `#111111` | Primary text |
| `--muted` | `#6b7280` | Secondary text, dates, labels, nav |
| `--accent` | `#0055cc` | Inline links, current-role marker, game highlights |
| `--border` | `#e5e7eb` | Timeline rules, project/entry outlines |
| `--border-strong` | `#c4c9d4` | Border on hover |
| `--surface` | `#f3f4f6` | Tags, game boards, inline code |

Type: **Roboto Light (300)** for the name and page titles only;
**Red Hat Text** (400/500/600) for everything else. Root size is 15px. Both
fonts are self-hosted through Fontsource. Icons are Font Awesome, rendered
to inline SVG at build time (`src/components/Icon.astro`).

## Patterns

- **Sections:** the home page is a stack of full-height sections (intro,
  work, education, projects, games & demos) with a dot nav on the right.
  Content sits in a 600px column.
- **Section labels:** tiny uppercase, wide letter-spacing, muted.
- **Timeline:** date column on the left, 2px left border on the body; the
  current role's border is the accent colour.
- **Lists of things:** 1px bordered boxes with a 6px radius, no shadow;
  border darkens on hover. Tags are small grey pills.
- **Links:** blue for inline links, muted-to-black for nav and icon links.
  Hover is a colour or opacity change, nothing that moves.

## Avoid

- Dark mode, gradients, drop shadows, glows.
- Extra accent colours. Blue is the only one.
- Animated or bouncing hover effects.
- Filler copy. Say what the thing is and what it does.
