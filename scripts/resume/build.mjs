#!/usr/bin/env node
/*
  Builds the résumé from its one source, src/data/resume.tex:

    public/resume.pdf           served at /resume.pdf
    src/generated/resume.html   HTML fragment that /resume wraps in the site layout

  Neither output is committed. The PDF comes from pdfLaTeX, the engine Overleaf
  runs this file with, or from Tectonic where pdfLaTeX is not installed. The
  HTML comes from Pandoc and filter.lua.

  --optional  skip a step whose tool is missing instead of failing. `npm run dev`
              and `npm run build` pass it, so the rest of the site still starts
              and builds on a machine without TeX (the daily tracker tasks run
              the build as their check). It has no effect when CI is set: a
              build that gets deployed must contain the résumé.
*/
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const source = join(root, "src/data/resume.tex");
const pdf = join(root, "public/resume.pdf");
const html = join(root, "src/generated/resume.html");
const optional = process.argv.includes("--optional") && !process.env.CI;

const installed = (tool) => spawnSync(tool, ["--version"], { stdio: "ignore" }).status === 0;

function run(tool, args) {
  const result = spawnSync(tool, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    // TeX reports the actual error near the end of a long log.
    const log = `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd().split("\n");
    throw new Error(`${tool} failed:\n${log.slice(-40).join("\n")}`);
  }
}

const engines = {
  // Two passes, so anything that reads the .aux file (references, page totals) settles.
  pdflatex(out) {
    const args = ["-interaction=nonstopmode", "-halt-on-error", "-file-line-error", `-output-directory=${out}`, source];
    run("pdflatex", args);
    run("pdflatex", args);
  },
  tectonic(out) {
    run("tectonic", ["-X", "compile", source, "--outdir", out]);
  },
};

const steps = [
  {
    output: pdf,
    tool: Object.keys(engines).find(installed),
    missing: "pdflatex or tectonic",
    build(engine) {
      const out = mkdtempSync(join(tmpdir(), "resume-"));
      try {
        engines[engine](out);
        copyFileSync(join(out, "resume.pdf"), pdf);
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
  },
  {
    output: html,
    tool: installed("pandoc") ? "pandoc" : undefined,
    missing: "pandoc",
    build() {
      const filter = join(here, "filter.lua");
      run("pandoc", [source, "--from=latex+raw_tex", "--to=html", "--wrap=none", `--lua-filter=${filter}`, `--output=${html}`]);
    },
  },
];

let failed = false;
for (const step of steps) {
  const name = relative(root, step.output);
  if (!step.tool) {
    console.warn(`resume: ${optional ? "skipped" : "cannot build"} ${name}: ${step.missing} is not installed (see README, "Resume")`);
    failed ||= !optional;
    continue;
  }
  mkdirSync(dirname(step.output), { recursive: true });
  try {
    step.build(step.tool);
    console.log(`resume: built ${name} with ${step.tool}`);
  } catch (error) {
    console.error(`resume: ${error.message}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
