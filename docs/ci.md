# CI Usage

The 30-90 day workflow is designed so a NockApp repository can run a repeatable local check and publish report artifacts.

## Local Command

```bash
npm run lab:ci
```

This reads `nocklab.config.json`, runs every configured fixture, and writes:

- `.nocklab/*.report.json`
- `.nocklab/*.report.md`
- `.nocklab/manifest.json`
- `.nocklab/summary.md`

## GitHub Actions

The bundled workflow at `.github/workflows/nocklab.yml` runs the lab on pushes and pull requests, then uploads `.nocklab/` as an artifact.

## External Repos

For another NockApp repo, copy:

- `nocklab.config.json`
- the relevant `fixtures/*.lab.json`
- `.github/workflows/nocklab.yml`

Then install or reference the `nocklab` CLI and run:

```bash
nocklab run --config nocklab.config.json --ci --strict
```
