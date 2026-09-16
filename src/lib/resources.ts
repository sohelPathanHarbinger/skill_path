// Where recommended courses and materials live, and how to link to them.
// AI models often invent course URLs, so each resource is linked by searching
// its exact title on its platform: that always leads to the real, current
// version. A direct link is only shown when it's https and on that platform.
import type { LearningResource, PlatformId } from "./schemas";

interface Platform {
  name: string;
  /** Host used to check direct links. */
  domain?: string;
  /** Narrower site for web searches, when the platform is part of a bigger site. */
  site?: string;
  /** The platform's own search page, when it has a stable one. */
  search?: (query: string) => string;
}

const encode = encodeURIComponent;
const webSearch = (query: string) => `https://www.google.com/search?q=${encode(query)}`;

export const PLATFORMS: Record<PlatformId, Platform> = {
  youtube: { name: "YouTube", domain: "youtube.com", search: (s) => `https://www.youtube.com/results?search_query=${encode(s)}` },
  udemy: { name: "Udemy", domain: "udemy.com", search: (s) => `https://www.udemy.com/courses/search/?q=${encode(s)}` },
  coursera: { name: "Coursera", domain: "coursera.org", search: (s) => `https://www.coursera.org/search?query=${encode(s)}` },
  edx: { name: "edX", domain: "edx.org" },
  freecodecamp: { name: "freeCodeCamp", domain: "freecodecamp.org" },
  codecademy: { name: "Codecademy", domain: "codecademy.com" },
  pluralsight: { name: "Pluralsight", domain: "pluralsight.com" },
  linkedin_learning: { name: "LinkedIn Learning", domain: "linkedin.com", site: "linkedin.com/learning" },
  khan_academy: { name: "Khan Academy", domain: "khanacademy.org" },
  datacamp: { name: "DataCamp", domain: "datacamp.com" },
  frontend_masters: { name: "Frontend Masters", domain: "frontendmasters.com" },
  real_python: { name: "Real Python", domain: "realpython.com" },
  geeksforgeeks: { name: "GeeksforGeeks", domain: "geeksforgeeks.org" },
  w3schools: { name: "W3Schools", domain: "w3schools.com" },
  mdn: { name: "MDN Web Docs", domain: "developer.mozilla.org" },
  exercism: { name: "Exercism", domain: "exercism.org" },
  hackerrank: { name: "HackerRank", domain: "hackerrank.com" },
  github: { name: "GitHub", domain: "github.com" },
  official_docs: { name: "Official docs" },
  book: { name: "Book" },
  other: { name: "Website" },
};

export const FORMAT_LABEL: Record<LearningResource["format"], string> = {
  video_course: "Video course",
  video_series: "Video series",
  written_course: "Written course",
  book: "Book",
  interactive: "Interactive",
  documentation: "Documentation",
  practice: "Practice",
};

export const COST_LABEL: Record<LearningResource["cost"], string> = {
  free: "Free",
  free_to_audit: "Free to audit",
  paid: "Paid",
  subscription: "Subscription",
};

export const RESOURCE_LEVEL_LABEL: Record<LearningResource["level"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export const RESOURCE_GROUPS: { id: string; label: string; formats: LearningResource["format"][] }[] = [
  { id: "video", label: "Video courses", formats: ["video_course", "video_series"] },
  { id: "read", label: "Websites & books", formats: ["written_course", "book"] },
  { id: "practice", label: "Docs & practice", formats: ["documentation", "interactive", "practice"] },
];

export const isFree = (resource: LearningResource) => resource.cost === "free" || resource.cost === "free_to_audit";

export interface ResourceLink {
  label: string;
  href: string;
}

function directLink(resource: LearningResource, platform: Platform): ResourceLink | null {
  let url: URL;
  try {
    url = new URL(resource.url.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");
  if (platform.domain && host !== platform.domain && !host.endsWith(`.${platform.domain}`)) return null;
  return { label: platform.domain ? "Direct link" : `Open ${host}`, href: url.href };
}

/** "Find on <platform>" (always works) plus a direct link when one can be trusted. */
export function resourceLinks(resource: LearningResource): { find: ResourceLink; direct: ResourceLink | null } {
  const platform = PLATFORMS[resource.platform];
  let find: ResourceLink;
  if (platform.search) {
    const query = resource.platform === "youtube" && resource.author ? `${resource.title} ${resource.author}` : resource.title;
    find = { label: `Find on ${platform.name}`, href: platform.search(query) };
  } else if (platform.domain) {
    find = { label: `Find on ${platform.name}`, href: webSearch(`site:${platform.site ?? platform.domain} ${resource.title}`) };
  } else {
    const words = [resource.title, resource.author, resource.platform === "book" ? "book" : ""].filter(Boolean);
    find = { label: "Search the web", href: webSearch(words.join(" ")) };
  }
  return { find, direct: directLink(resource, platform) };
}
