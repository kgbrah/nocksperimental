#!/usr/bin/env node

import process from "node:process";

const jsonOnly = process.argv.includes("--json");
const driveFolderUrl =
  "https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [zorpRepos, nockchainRepo, nockchainCommit, nockchainRelease] = await Promise.all([
    fetchJson("https://api.github.com/orgs/zorp-corp/repos?per_page=100&sort=updated&type=public"),
    fetchJson("https://api.github.com/repos/nockchain/nockchain"),
    fetchJson("https://api.github.com/repos/nockchain/nockchain/commits/master"),
    fetchJson("https://api.github.com/repos/nockchain/nockchain/releases/latest")
  ]);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sourcePolicy: "zorp-nockchain-source-authority",
    zorp: {
      organization: "zorp-corp",
      publicRepoCount: zorpRepos.length,
      repositories: zorpRepos.map((repo) => ({
        fullName: repo.full_name,
        archived: repo.archived,
        fork: repo.fork,
        language: repo.language,
        description: repo.description,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        stars: repo.stargazers_count,
        openIssues: repo.open_issues_count
      }))
    },
    nockchain: {
      repository: nockchainRepo.full_name,
      defaultBranch: nockchainRepo.default_branch,
      stars: nockchainRepo.stargazers_count,
      forks: nockchainRepo.forks_count,
      openIssues: nockchainRepo.open_issues_count,
      updatedAt: nockchainRepo.updated_at,
      pushedAt: nockchainRepo.pushed_at,
      latestCommit: {
        sha: nockchainCommit.sha,
        shortSha: nockchainCommit.sha.slice(0, 12),
        committedAt: nockchainCommit.commit?.committer?.date,
        message: nockchainCommit.commit?.message?.split("\n")[0] ?? ""
      },
      latestRelease: {
        tag: nockchainRelease.tag_name,
        publishedAt: nockchainRelease.published_at,
        assetCount: nockchainRelease.assets?.length ?? 0
      }
    },
    legacyRedirect: {
      url: "https://github.com/zorp-corp/nockchain",
      expectedCanonicalUrl: "https://github.com/nockchain/nockchain",
      interpretation: "legacy URL only; canonical protocol authority is nockchain/nockchain"
    },
    stateJamDrive: {
      url: driveFolderUrl,
      classification: "Zorp/Nockchain state-jam folder, not a VESL folder.",
      rawArtifactPolicy: "metadata-only-manual-review",
      forbiddenAction: "Do not download, commit, redistribute, or expose raw state-jam/PMA/checkpoint artifacts."
    }
  };

  if (jsonOnly) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  console.log(`Zorp repos: ${snapshot.zorp.publicRepoCount}`);
  console.log(
    `Nockchain: ${snapshot.nockchain.latestCommit.shortSha} ${snapshot.nockchain.latestRelease.tag}`
  );
  console.log(`State-jam Drive: ${snapshot.stateJamDrive.classification}`);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "nocksperimental-zorp-monitor"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }

  return response.json();
}
