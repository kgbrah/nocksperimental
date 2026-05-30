# Hosted Report History

Nocksperimental now models hosted report history as a versioned data contract.

The MVP data source is `src/data/report-history.json`, with a public JSON route at `/api/history` and a hosted page at `/reports/history`.

Each history entry records:

- workspace identity
- NockApp and fixture identity
- status
- lifecycle stage: pre-launch, audit, upgrade, or integration
- invariant packs used
- snapshot count
- report summary

This gives the lab a durable surface for the 3-6 month goal: teams can retain report evidence before launch, during audits, through upgrades, and while integrating with solvers or other apps.

The current page is static. The next production step is replacing `src/data/report-history.json` with persisted workspace storage and signed report artifacts.
