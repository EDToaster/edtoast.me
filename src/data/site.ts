export const site = {
  name: "Howard Chen",
  handle: "edtoast",
  // One plain sentence. Say what you actually do; no taglines.
  intro: "I'm a software engineer. This is where I keep my resume, small games, and whatever I'm building on weekends.",
  url: "https://edtoast.me",
};

export type Link = { label: string; href: string };

// TODO(howard): add LinkedIn URL and any contact address you want public.
export const links: Link[] = [
  { label: "GitHub", href: "https://github.com/EDToaster" },
  // { label: "LinkedIn", href: "https://www.linkedin.com/in/<you>" },
  { label: "Resume", href: "/resume" },
];
