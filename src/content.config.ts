import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/*
  Games and demos share one shape. Each entry is a Markdown file whose
  frontmatter drives the listing pages; the body is the "about" blurb shown
  under the game. The playable code lives in src/games/<slug>/.
*/
const entry = z.object({
  title: z.string(),
  summary: z.string().max(140),
  date: z.coerce.date(),
  status: z.enum(["playable", "wip", "archived"]).default("playable"),
  tags: z.array(z.string()).default([]),
  // External demos (hosted elsewhere) set this instead of shipping code here.
  href: z.string().url().optional(),
});

export const collections = {
  games: defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/games" }), schema: entry }),
  demos: defineCollection({ loader: glob({ pattern: "*.md", base: "./src/content/demos" }), schema: entry }),
};
