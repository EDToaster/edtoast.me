/*
  Work history and education. Content carried over from the original site
  (edtoaster.github.io). The home page renders this as a timeline.
*/
export type Ref = { label: string; href: string };
export type Feature = { text: string; refs?: Ref[] };
export type Role = {
  period: string; // display string, e.g. "2021 – 2024"
  company: string;
  title: string;
  current?: boolean;
  features?: Feature[];
};

export const roles: Role[] = [
  { period: "2025 – Present", company: "Instacart", title: "Software Engineer", current: true },
  { period: "2024", company: "Meta", title: "Production Engineer II" },
  {
    period: "2021 – 2024",
    company: "Amazon Web Services EC2 Auto Scaling",
    title: "Software Engineer II",
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
    title: "Junior Software Engineer",
    features: [{ text: "Developed Custom Termination Policies" }],
  },
  {
    period: "Summer 2019",
    company: "Amazon Web Services Forecasting Platform",
    title: "Junior Software Engineer",
    features: [{ text: "Designed customer debugging tools" }],
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
