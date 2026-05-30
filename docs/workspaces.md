# Private Workspaces

Private workspaces are the commercial surface for team-scoped NockApp lab runs.

The MVP data source is `src/data/private-workspaces.json`, with a public JSON route at `/api/workspaces` and a hosted page at `/workspaces`.

Each workspace records:

- private visibility
- plan tier
- seat count
- report retention
- supported fakenet environments
- covered lifecycle stages
- member role counts

This keeps the 3-6 month build focused on paid workflow primitives without adding authentication, billing, or storage before the report contract is stable.

The next production step is to add authenticated membership, storage-backed reports, and per-workspace report upload tokens.
