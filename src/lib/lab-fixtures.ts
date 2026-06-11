// The fixture catalog the lab CI runs, surfaced for the interactive lab browser. Sourced from
// nocklab.config.json (the single source of truth) so the GUI list never drifts from what CI executes.

import nocklabConfig from "../../nocklab.config.json";

export type LabFixtureEntry = {
  slug: string;
  path: string;
  name: string;
};

function titleize(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const rawFixtures: Array<{ slug: string; path: string }> =
  (nocklabConfig as { fixtures?: Array<{ slug: string; path: string }> }).fixtures ?? [];

export const labFixtures: LabFixtureEntry[] = rawFixtures
  .map((f) => ({ slug: f.slug, path: f.path, name: titleize(f.slug) }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

// xchain-* fixtures are the cross-chain tester; attack-* are negative controls (exploit-prevention).
export function fixtureKind(slug: string): "cross-chain" | "attack" | "app" {
  if (slug.startsWith("attack-")) return "attack";
  if (slug.startsWith("xchain-")) return "cross-chain";
  return "app";
}
