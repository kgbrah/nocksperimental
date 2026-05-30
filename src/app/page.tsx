import {
  ArrowUpRight,
  Boxes,
  Code2,
  Coins,
  DatabaseZap,
  Gauge,
  Search,
  ServerCog,
  WalletCards
} from "lucide-react";
import { ProductExplorer } from "@/components/product-explorer";
import { productOpportunities, registryTemplates } from "@/lib/registry";

const iconByCategory = {
  "Developer distribution": Boxes,
  Infrastructure: DatabaseZap,
  Payments: WalletCards,
  "Mining operations": Gauge,
  "Compute market": ServerCog
};

export default function Home() {
  const lowCapital = productOpportunities.filter((product) =>
    product.capitalIntensity.startsWith("Low")
  );

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-[#171717]">
      <section className="border-b border-[#242424] bg-[#e8ead7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 border border-[#242424] bg-[#f7f3ea] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]">
                <Coins size={14} aria-hidden="true" />
                NOCK revenue lab
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Nocksperimental
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#3d3d35] sm:text-lg">
                A launchpad and registry for Nockchain products that can earn
                NOCK without buying hardware first.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Least capital path" value="Launchpad" />
              <Metric label="First API" value="/api/registry" />
              <Metric label="MVP templates" value={registryTemplates.length.toString()} />
            </div>
          </div>

          <div className="grid content-start gap-3">
            {lowCapital.map((product) => {
              const Icon = iconByCategory[product.category as keyof typeof iconByCategory];

              return (
                <article
                  className="border border-[#242424] bg-[#fdfbf4] p-4 shadow-[5px_5px_0_#242424]"
                  key={product.name}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center bg-[#171717] text-[#fdfbf4]">
                      <Icon size={19} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#6c3324]">
                        Rank {product.rank} · {product.capitalIntensity} capital
                      </div>
                      <h2 className="mt-1 text-xl font-semibold">{product.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#4a4a42]">
                        {product.firstMilestone}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[#242424] bg-[#fdfbf4]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#6c3324]">
                Product stack
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Build order by upside and cost</h2>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 border border-[#242424] bg-[#171717] px-4 py-2 text-sm font-medium text-white"
              href="/api/registry"
            >
              <Code2 size={16} aria-hidden="true" />
              Registry JSON
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <ProductExplorer products={productOpportunities} />
        </div>
      </section>

      <section className="bg-[#dce8ee]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center bg-[#171717] text-white">
              <Search size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#25465d]">
                Template registry
              </p>
              <h2 className="text-2xl font-semibold">First experiments to publish</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {registryTemplates.map((template) => (
              <article
                className="border border-[#242424] bg-[#fdfbf4] p-5 shadow-[4px_4px_0_#242424]"
                key={template.slug}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#25465d]">
                      {template.category}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">{template.name}</h3>
                  </div>
                  <span className="border border-[#242424] bg-[#e8ead7] px-2 py-1 font-mono text-xs">
                    {template.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#44443d]">{template.description}</p>
                <div className="mt-4 border border-[#242424] bg-[#171717] px-3 py-2 font-mono text-xs text-[#fdfbf4]">
                  {template.installCommand}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.integrationTargets.map((target) => (
                    <span
                      className="border border-[#8b8b7a] bg-white px-2 py-1 text-xs text-[#333]"
                      key={target}
                    >
                      {target}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium text-[#6c3324]">
                  {template.revenueModel}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#242424] bg-[#fdfbf4] p-4">
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#6c3324]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
