import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { minimatch } from "minimatch";

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Get files from the repository based on allowed patterns.
 */
export async function getFiles(octokit: Octokit): Promise<string[]> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const allFiles = await getFilesRecursively(octokit, owner, repo);
  const patterns = core
    .getInput("allowed-files")
    .split(",")
    .map((p) => p.trim());

  return allFiles.filter((file) =>
    patterns.some((pattern) => minimatch(file, pattern)),
  );
}

async function getFilesRecursively(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
): Promise<string[]> {
  const response = await octokit.rest.repos.getContent({ owner, repo, path });
  const files: string[] = [];

  if (Array.isArray(response.data)) {
    for (const item of response.data) {
      switch (item.type) {
        case "file":
          files.push(item.path);
          break;
        case "dir":
          const subFiles = await getFilesRecursively(
            octokit,
            owner,
            repo,
            item.path,
          );
          files.push(...subFiles);
          break;
      }
    }
  }

  return files;
}
