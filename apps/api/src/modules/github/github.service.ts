import type { ContributionDay, GithubContributions } from "@portfolio/shared";
import { unavailable } from "../../common/errors";
import type { Logger } from "../../lib/logger";

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const LEVELS: Record<string, ContributionDay["level"]> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

interface GraphqlCalendar {
  totalContributions: number;
  weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number; contributionLevel: string }> }>;
}

/** Pure: GitHub's calendar → the shape the website's heatmap renders. */
export function toContributions(username: string, calendar: GraphqlCalendar): GithubContributions {
  const weeks: ContributionDay[][] = calendar.weeks.map((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: LEVELS[d.contributionLevel] ?? 0,
    })),
  );
  const days = weeks.flat();
  let longest = 0;
  let streak = 0;
  let active = 0;
  for (const day of days) {
    if (day.count > 0) {
      active++;
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  }
  return {
    username,
    profileUrl: `https://github.com/${username}`,
    totalLastYear: calendar.totalContributions,
    longestStreak: longest,
    activeDaysPercent: days.length ? Math.round((active / days.length) * 100) : 0,
    weeks,
  };
}

const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Cached proxy for GitHub's contribution calendar (rancangan §18, question 2).
 * The token never leaves the server. On a GitHub outage the last good answer is served (stale) instead of an error.
 */
export class GithubService {
  private cached?: { at: number; value: GithubContributions };

  constructor(
    private readonly settings: { token?: string; username?: string },
    private readonly log: Logger,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async getContributions(): Promise<GithubContributions> {
    const { token, username } = this.settings;
    if (!token || !username) throw unavailable("GitHub contributions are not configured.", "GITHUB_NOT_CONFIGURED");

    if (this.cached && this.now() - this.cached.at < TTL_MS) return this.cached.value;

    try {
      const res = await this.fetchFn("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "portfolio-api" },
        body: JSON.stringify({ query: QUERY, variables: { login: username } }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
      const body = (await res.json()) as {
        data?: { user?: { contributionsCollection?: { contributionCalendar?: GraphqlCalendar } } };
        errors?: unknown;
      };
      const calendar = body.data?.user?.contributionsCollection?.contributionCalendar;
      if (!calendar) throw new Error("GitHub returned no contribution calendar");
      const value = toContributions(username, calendar);
      this.cached = { at: this.now(), value };
      return value;
    } catch (err) {
      this.log.warn({ err }, "GitHub contributions fetch failed");
      if (this.cached) return this.cached.value; // stale beats nothing
      throw unavailable("GitHub contributions are temporarily unavailable.", "GITHUB_UNAVAILABLE");
    }
  }
}
