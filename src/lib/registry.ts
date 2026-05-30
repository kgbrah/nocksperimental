export type CapitalIntensity = "Low" | "Low-medium" | "Medium-high";
export type Upside = "Medium" | "Medium-high" | "High" | "Very high";

export type ProductOpportunity = {
  rank: number;
  name: string;
  category: string;
  thesis: string;
  revenue: string[];
  capitalIntensity: CapitalIntensity;
  upside: Upside;
  firstMilestone: string;
};

export type RegistryTemplate = {
  slug: string;
  name: string;
  category: string;
  status: "Ready for spec" | "Prototype target" | "Research target";
  description: string;
  installCommand: string;
  integrationTargets: string[];
  revenueModel: string;
};

export const productOpportunities: ProductOpportunity[] = [
  {
    rank: 1,
    name: "NockApp Launchpad + Registry",
    category: "Developer distribution",
    thesis:
      "Nockchain needs the app discovery and publishing layer before it can compound developer activity.",
    revenue: ["Verified listings", "Template sales", "Deploy fees", "Audit referrals"],
    capitalIntensity: "Low",
    upside: "High",
    firstMilestone: "Publish a registry API and template gallery with installation metadata."
  },
  {
    rank: 2,
    name: "Indexer, API, and Webhooks",
    category: "Infrastructure",
    thesis:
      "Wallets, explorers, apps, and solvers need reliable event streams for notes, locks, intents, blocks, and app state.",
    revenue: ["API subscriptions", "Webhook usage", "Enterprise data feeds"],
    capitalIntensity: "Low-medium",
    upside: "High",
    firstMilestone: "Expose a normalized registry API, then add chain event adapters."
  },
  {
    rank: 3,
    name: "NOCK Payment Links + Invoices",
    category: "Payments",
    thesis:
      "If NOCK is money, builders need dead-simple checkout links, invoices, settlement records, and Base-wrapped NOCK support.",
    revenue: ["Processing fees", "Merchant plans", "Settlement services"],
    capitalIntensity: "Low",
    upside: "Medium-high",
    firstMilestone: "Ship hosted payment pages with manual wallet confirmation before adding automation."
  },
  {
    rank: 4,
    name: "Prover and Miner Ops Dashboard",
    category: "Mining operations",
    thesis:
      "Mining and proving operators need profitability, uptime, configuration drift, and pool comparison tooling.",
    revenue: ["Operator SaaS", "Pool referrals", "Managed alerts"],
    capitalIntensity: "Low-medium",
    upside: "Medium",
    firstMilestone: "Build a local telemetry dashboard that can ingest pool and node status."
  },
  {
    rank: 5,
    name: "Useful Compute Broker",
    category: "Compute market",
    thesis:
      "The roadmap points toward AI and ZK compute markets; a broker can connect demand to proof power without owning hardware.",
    revenue: ["Compute job take rate", "Priority routing", "Provider verification"],
    capitalIntensity: "Medium-high",
    upside: "Very high",
    firstMilestone: "Define job specs and provider reputation before touching settlement."
  }
];

export const registryTemplates: RegistryTemplate[] = [
  {
    slug: "hello-nockapp",
    name: "Hello NockApp",
    category: "Starter",
    status: "Ready for spec",
    description:
      "Minimal counter-style NockApp reference with runtime, kernel, peek, and poke boundaries called out.",
    installCommand: "npx nocksperimental init hello-nockapp",
    integrationTargets: ["NockApp runtime", "HTTP driver", "Local persistence"],
    revenueModel: "Free template; paid support and verified publishing later."
  },
  {
    slug: "payment-link",
    name: "NOCK Payment Link",
    category: "Payments",
    status: "Prototype target",
    description:
      "Hosted invoice and payment-link flow for merchants that want to quote and collect in NOCK.",
    installCommand: "npx nocksperimental init payment-link",
    integrationTargets: ["Wallet", "Base bridge", "Registry API"],
    revenueModel: "Flat fee or basis-point fee on completed invoices."
  },
  {
    slug: "intent-orderbook",
    name: "Intent Orderbook",
    category: "DeFi",
    status: "Research target",
    description:
      "Skeleton for matching declarative intents before routing proofs for settlement.",
    installCommand: "npx nocksperimental init intent-orderbook",
    integrationTargets: ["Locks", "Intents", "Solver network"],
    revenueModel: "Solver fees and verified-market listing fees."
  },
  {
    slug: "miner-telemetry",
    name: "Miner Telemetry",
    category: "Operations",
    status: "Prototype target",
    description:
      "Agent and dashboard contract for uptime, pool status, reward estimates, and hardware health.",
    installCommand: "npx nocksperimental init miner-telemetry",
    integrationTargets: ["Nockchain node", "Mining pools", "Alert webhooks"],
    revenueModel: "Monthly operator subscription paid in NOCK."
  }
];
