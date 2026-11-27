import { faGithub, faLinkedin, faCanadianMapleLeaf } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/free-brands-svg-icons";

export const site = {
  name: "Howard Chen",
  title: "Member of Technical Staff", // drop "Incoming" after Nov 2026
  employer: "Perplexity",
  description: "Howard Chen, software engineer. Work history, projects, and small browser games.",
  url: "https://edtoast.me",
};

/* Both are built from src/data/resume.tex; see scripts/resume/build.mjs. */
export const resume = {
  page: "/resume",
  pdf: "/resume.pdf",
  filename: "howard_chen_resume.pdf", // name the browser saves the PDF under
};

export type HeroLink = { label: string; href?: string; icon: IconDefinition };

export const heroLinks: HeroLink[] = [
  { label: "edtoaster", href: "https://github.com/edtoaster", icon: faGithub },
  { label: "howchen", href: "https://www.linkedin.com/in/howchen", icon: faLinkedin },
  { label: "vancouver", icon: faCanadianMapleLeaf },
];
