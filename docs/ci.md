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
- `scripts/run-lab.mjs` (the CLI itself)

This package is marked `private` and is not published to npm, so
`npm install nocksperimental` and a bare `nocklab` on `PATH`/`npx` will not
resolve. Copy `scripts/run-lab.mjs` alongside the config and fixtures and invoke
it directly with Node:

```bash
node scripts/run-lab.mjs run --config nocklab.config.json --ci --strict
```

This matches every internal invocation (the bundled `npm run lab:ci` runs the
same command). If you prefer a dependency over a copy, install from a git URL or
submodule and run `npx nocklab run --config nocklab.config.json --ci --strict`.

Note: the bundled `.github/workflows/nocklab.yml` runs `npm ci` and
`npm run lab:ci`, so an external repo must either copy that `lab:ci` package.json
script too or change the workflow step to call `node scripts/run-lab.mjs run ...`
directly.
