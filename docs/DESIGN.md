# Design rules

The goal is a site that looks like a person made it on purpose. Most
"AI-generated" sites share the same defaults: Inter or Geist everywhere, a
purple-to-blue gradient hero, a centred headline with two CTA buttons, a row
of three rounded cards with icons, soft shadows on everything, all-caps
section labels, and copy that could describe anyone. These rules exist to
keep all of that out.

## The look: warm paper

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#f4efe6` | `#1a1714` | Page background |
| `--paper-sunk` | `#ebe4d7` | `#24201b` | Game boards, code |
| `--ink` | `#1f1b16` | `#ece4d6` | Body text (14.9:1 / 14.1:1) |
| `--ink-soft` | `#5c5348` | `#a89d8c` | Secondary text (6.6:1 / 6.7:1) |
| `--rule` | `#d6ccbb` | `#3a342c` | Hairlines |
| `--accent` | `#a8481a` | `#e58a52` | Links, one highlight (5.1:1 / 6.9:1) |

Type: **Source Serif 4** for everything you read, **IBM Plex Mono** for
small metadata (dates, counters, the theme toggle). Self-hosted via
Fontsource, so no Google Fonts request.

## Do

- Left-align. One reading column (`--measure`, ~36rem). Games may go wider.
- Use the token scale for every size and space. No one-off pixel values.
- Separate things with 1px rules or whitespace, not boxes.
- One accent colour, used for links and at most one highlight per screen.
- Write specific copy: names, dates, numbers. Say what the thing does.
- Respect `prefers-color-scheme` and `prefers-reduced-motion`.

## Don't

- Gradients of any kind, especially on text or hero backgrounds.
- Inter, Geist, Roboto, Space Grotesk, Instrument Serif.
- Purple/indigo/violet anywhere.
- Cards with shadows, glassmorphism, glows, large border radii (we use 2px).
- Three-up feature grids, bento grids, emoji or generic line icons as decoration.
- All-caps eyebrow labels, "Get started" / "Learn more" button pairs.
- Hover animations that bounce, scale, or slide. Underline changes are enough.
- Filler copy, sentence triads ("Fast. Simple. Secure."), fake testimonials.

## Sources

- https://dezzayn.com/guides/make-your-website-not-look-ai-generated
- https://www.925studios.co/blog/ai-slop-design-tells
- https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it
- https://thanor.ai/blog/how-to-make-ai-websites-not-look-like-ai
- https://www.joshuasnoddy.com/blog/make-ai-built-site-not-look-ai/
