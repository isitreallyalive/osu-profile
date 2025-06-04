import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { minimatch } from "minimatch";
import * as fs from "fs/promises";
import * as path from "path";

type Octokit = ReturnType<typeof getOctokit>;

interface File {
  path: string;
  content?: string;
}

/**
 * Get files from the repository based on allowed patterns.
 */
export async function getFiles(octokit: Octokit): Promise<File[]> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
  const allFiles = await getFilesRecursively(octokit, owner, repo);
  const patterns = core
    .getInput("allowed-files")
    .split(",")
    .map((p) => p.trim());

  return allFiles.filter((file) =>
    patterns.some((pattern) => minimatch(file.path, pattern)),
  );
}

async function getFilesRecursively(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = "",
): Promise<File[]> {
  const { data: responses } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });
  const files: File[] = [];

  if (Array.isArray(responses)) {
    for (const { type, path } of responses) {
      switch (type) {
        case "file":
          files.push(await readFile(octokit, owner, repo, path));
          break;

        case "dir":
          const subFiles = await getFilesRecursively(
            octokit,
            owner,
            repo,
            path,
          );
          files.push(...subFiles);
          break;
      }
    }
  }

  return files;
}

async function readFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
): Promise<File> {
  if (process.env.ACT) {
    // in local testing with `act`, we read the file directly from the filesystem
    const content = await fs.readFile(
      path.join(process.cwd(), filePath),
      "utf-8",
    );
    return {
      path: filePath,
      content,
    };
  } else {
    const { data: file } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    if (!Array.isArray(file) && file.type === "file") {
      return {
        path: file.path,
        content: file.content
          ? Buffer.from(file.content, "base64").toString("utf-8")
          : undefined,
      };
    }
  }
}
