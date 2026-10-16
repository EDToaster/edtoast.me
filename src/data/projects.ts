export type Project = {
  name: string;
  tags: string[];
  description: string;
  links: { label: string; href: string }[];
};

export const projects: Project[] = [
  {
    name: "hive",
    tags: ["Rust", "AI", "MCP"],
    description:
      "Stateless CLI and MCP server that orchestrates a swarm of Claude Code agents for autonomous software development. Features a coordinator → lead → worker hierarchy, per-agent git worktree isolation, automated code review via merge queue, and a live TUI dashboard.",
    links: [{ label: "Source", href: "https://github.com/EDToaster/hive" }],
  },
  {
    name: "ferret",
    tags: ["Rust", "Search"],
    description:
      "Trigram-indexed code search engine inspired by Google Code Search. Supports boolean and regex queries across 60+ languages with incremental indexing, memory-mapped reads, and a web UI with search-as-you-type.",
    links: [{ label: "Source", href: "https://github.com/EDToaster/ferret" }],
  },
  {
    name: "LittleLogistics & LittleContraptions",
    tags: ["Java", "Minecraft", "31 million+ downloads"],
    description:
      "A pair of Minecraft Forge mods adding water and rail logistics via tugs, barges, and automated routes, plus a Create mod expansion for contraption transport on barges. 18M downloads on LittleLogistics and 13M on LittleContraptions, with 11+ releases shipped.",
    links: [
      { label: "LittleLogistics", href: "https://github.com/MuradAkh/LittleLogistics" },
      { label: "LittleContraptions", href: "https://github.com/EDToaster/LittleContraptions" },
    ],
  },
  {
    name: "ToastCPU",
    tags: ["Rust", "Verilog", "Hardware"],
    description:
      "A complete 16-bit computing stack built from scratch: ISA and ABI specification, functional emulator, subscalar FPGA implementation in Verilog, and a custom assembler. Spans the full journey from architecture design to hardware synthesis.",
    links: [{ label: "Source", href: "https://github.com/EDToaster/ToastCPU" }],
  },
];
