/*
  Work history and education. Content carried over from the original site
  (edtoaster.github.io). The home page renders this as a timeline.
*/
export type Ref = { label: string; href: string };
export type Feature = { text: string; refs?: Ref[] };
import type { CompanyKey } from "~/components/CompanyLogo.astro";

export type Role = {
  period: string; // display string, e.g. "2021 – 2024"
  company: string;
  logo?: CompanyKey;
  title: string;
  location?: string;
  current?: boolean;
  upcoming?: boolean;
  summary?: string; // one line, always visible
  highlights?: string[]; // shown when expanded; **x** bolds a metric
  stack?: string[]; // tags shown when expanded
  features?: Feature[]; // launches with links, shown when expanded
};

/* Headline numbers shown as tiles above the timeline. */
export type Stat = { value: string; label: string; where: string };
export const stats: Stat[] = [
  { value: "125B+", label: "catalog updates ingested daily", where: "Instacart" },
  { value: "10B+", label: "Postgres queries served daily", where: "Instacart" },
  { value: "$2.5M", label: "per year in infra cost removed", where: "Instacart + AWS" },
  { value: "80%", label: "fewer high-severity events in a year", where: "AWS" },
];

export const skills = ["Go", "Rust", "Java", "Kotlin", "SQL", "C / C++", "Python", "Ruby", "Verilog", "Postgres", "AWS", "EC2 Auto Scaling"];

export const roles: Role[] = [
  { period: "Nov 2026", company: "Perplexity AI", logo: "perplexity", title: "Senior Member of Technical Staff", upcoming: true },
  {
    period: "2025 – 2026",
    company: "Instacart",
    logo: "instacart",
    title: "Software Engineer",
    location: "Vancouver, BC",
    summary: "Catalog data ingestion and the datastores behind search and product recall.",
    highlights: [
      "Designed and built the ingestion pipeline for all product and retailer data, processing **125B+ catalog updates a day**",
      "Architected an S3-backed datastore with a dedicated reader/writer fleet, delivering **2x Postgres ingest throughput**",
      "Own 4 replicated, highly-available Postgres clusters serving **10B+ queries a day** for search, recall and NLP",
      "Led a legacy infra deprecation and cross-team RPC migrations with zero metric regression, saving **$2M/year**",
    ],
    stack: ["Go", "Postgres", "Snowflake", "Temporal", "AWS S3"],
  },
  {
    period: "2024",
    company: "Meta",
    logo: "meta",
    title: "Production Engineer II",
    location: "Bellevue, WA",
    summary: "Capacity efficiency for the Monetization org, including GPU compute and storage.",
    highlights: [
      "Validated CapEx and OpEx savings across Monetization, including Ads and the family of apps, covering constrained **GPU compute and storage**",
      "Funded new project proposals with capacity reclaimed from those reductions",
      "Automated quota validation and reduction, **removing the manual work entirely**",
    ],
    stack: ["Capacity planning", "Automation", "Python"],
  },
  {
    period: "2021 – 2024",
    company: "Amazon Web Services EC2 Auto Scaling",
    logo: "aws",
    title: "Software Engineer II",
    location: "Vancouver, BC",
    summary: "A multi-zonal control plane behind a third of global cloud capacity.",
    highlights: [
      "Supported a service behind **>$30B in annual revenue**; grew top-customer adoption 31% and launched in 8 new regions across 6 countries",
      "Led 4+ high-adoption features, including Instance Refresh",
      "Migrated off Citrix NetScaler to AWS-native load balancing, saving **$500K/year**",
      "Cut high-severity operational events by **80%** in a year on a 15-minute on-call SLA",
    ],
    stack: ["Java", "Kotlin", "EC2", "Lambda", "IAM"],
    features: [
      {
        text: "Released Custom Termination Policies",
        refs: [
          {
            label: "Announcement",
            href: "https://aws.amazon.com/about-aws/whats-new/2021/07/amazon-ec2-auto-scaling-now-lets-you-control-which-instances-to-terminate-on-scale-in/",
          },
          { label: "Docs", href: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/lambda-custom-termination-policy.html" },
        ],
      },
      {
        text: "Released Instance Maintenance Policies",
        refs: [
          {
            label: "AWS Blog",
            href: "https://aws.amazon.com/blogs/compute/introducing-instance-maintenance-policy-for-amazon-ec2-auto-scaling/",
          },
          {
            label: "Docs",
            href: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-maintenance-policy-overview-and-considerations.html",
          },
        ],
      },
    ],
  },
  {
    period: "Summer 2020",
    company: "Amazon Web Services EC2 Auto Scaling",
    logo: "aws",
    title: "Junior Software Engineer",
    location: "Vancouver, BC",
    summary: "Designed and shipped Lambda custom termination policies.",
    highlights: [
      "Designed, built and shipped **Custom Termination Policies**, letting customers choose which instances terminate first",
    ],
    stack: ["Java", "Lambda"],
  },
  {
    period: "Summer 2019",
    company: "Amazon Web Services Forecasting Platform",
    logo: "aws",
    title: "Junior Software Engineer",
    location: "Seattle, WA",
    summary: "Internal demand-forecasting service and customer debugging tools.",
    highlights: [
      "Built an internal **time-series / ML forecasting service** end to end, with self-serve debugging tools for its users",
    ],
    stack: ["Java", "ML", "AWS"],
  },
];

export type Education = { lines: string[]; school: string; year: string };
export const education: Education[] = [
  {
    lines: ["BSc in Computer Science with High Distinction", "Dean's List Scholar"],
    school: "University of Toronto",
    year: "Graduated 2021",
  },
];

/* Escape text and turn **x** into <strong>x</strong> for highlights. */
export const emphasize = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
