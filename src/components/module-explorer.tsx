"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import type { LabModule } from "@/lib/strategy";

const filters = ["All", "Now", "Low capital", "Very high upside"] as const;

export function ModuleExplorer({ modules }: { modules: LabModule[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");

  const visibleModules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return modules.filter((module) => {
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Now" && module.horizon === "Now") ||
        (activeFilter === "Low capital" && module.capitalIntensity.startsWith("Low")) ||
        (activeFilter === "Very high upside" && module.upside === "Very high");

      const searchable = [
        module.name,
        module.category,
        module.horizon,
        module.thesis,
        module.revenue.join(" "),
        module.deliverables.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeFilter, modules, query]);

  return (
    <div className="border border-[#242424] bg-[#f7f3ea]">
      <div className="grid gap-3 border-b border-[#242424] p-4 lg:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 items-center gap-3 border border-[#242424] bg-white px-3">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search lab modules</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#777]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, deliverables, revenue..."
            value={query}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={17} aria-hidden="true" />
          {filters.map((filter) => (
            <button
              className={
                activeFilter === filter
                  ? "border border-[#242424] bg-[#171717] px-3 py-2 text-sm font-medium text-white"
                  : "border border-[#242424] bg-white px-3 py-2 text-sm font-medium text-[#171717]"
              }
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-[#171717] text-white">
            <tr>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Rank</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Module</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Why</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">
                First milestone
              </th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Revenue</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Capital</th>
              <th className="px-4 py-3 font-mono text-xs uppercase tracking-[0.12em]">Upside</th>
            </tr>
          </thead>
          <tbody>
            {visibleModules.map((module) => (
              <tr className="border-t border-[#242424] bg-[#fdfbf4]" key={module.name}>
                <td className="px-4 py-4 align-top font-mono text-lg font-semibold">
                  {module.rank}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="font-semibold">{module.name}</div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-[0.1em] text-[#6c3324]">
                    {module.category} · {module.horizon}
                  </div>
                </td>
                <td className="max-w-[300px] px-4 py-4 align-top leading-6 text-[#3f3f38]">
                  {module.thesis}
                </td>
                <td className="max-w-[260px] px-4 py-4 align-top leading-6 text-[#3f3f38]">
                  {module.firstMilestone}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    {module.revenue.map((item) => (
                      <span className="border border-[#8b8b7a] bg-white px-2 py-1 text-xs" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 align-top font-medium">{module.capitalIntensity}</td>
                <td className="px-4 py-4 align-top font-medium">{module.upside}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
