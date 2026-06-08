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

For another NockApp repo, install the lab runner from npm and copy your fixtures
and config:

- `npm install --save-dev nocklab` (or `npx nocklab ...` without installing)
- `nocklab.config.json`
- the relevant `fixtures/*.lab.json`
- `.github/workflows/nocklab.yml`

This repo's own package stays `private` and is not published, so
`npm install nocksperimental` will not resolve — but the lab runner itself ships
as the standalone `nocklab` package on npm, so external repos no longer need to
copy `scripts/run-lab.mjs`. Install it and invoke the CLI directly:

```bash
npx nocklab run --config nocklab.config.json --ci --strict
```

This matches every internal invocation (the bundled `npm run lab:ci` runs the
equivalent command).

Note: the bundled `.github/workflows/nocklab.yml` runs `npm ci` and
`npm run lab:ci`, so an external repo must either copy that `lab:ci` package.json
script too or change the workflow step to call `npx nocklab run ...` directly.
