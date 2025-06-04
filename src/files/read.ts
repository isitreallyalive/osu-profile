import * as core from "@actions/core";
import { minimatch } from "minimatch";
import * as fs from "fs/promises";
import type { Octokit, File, Repo } from ".";
import { join } from "path";

/**
 * Get files from the repository based on allowed patterns.
 */
export async function getFiles(octokit: Octokit, repo: Repo): Promise<File[]> {
  const allFiles = await getFilesRecursively(octokit, repo);
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
  { owner, name: repo }: Repo,
  path: string = "",
): Promise<File[]> {
  const files: File[] = [];

  if (process.env.ACT) {
    // in local testing with `act`, we read files directly from the filesystem
    const fullPath = path ? join(process.cwd(), path) : process.cwd();

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.isFile()) {
          files.push(await readFile(octokit, owner, repo, entryPath));
        } else if (entry.isDirectory()) {
          const subFiles = await getFilesRecursively(
            octokit,
            { owner, name: repo },
            entryPath,
          );
          files.push(...subFiles);
        }
      }
    } catch (error) {
      return [];
    }

    return files;
  } else {
    // in production, we use the GitHub API to read files
    const { data: responses } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(responses)) {
      for (const { type, path } of responses) {
        switch (type) {
          case "file":
            files.push(await readFile(octokit, owner, repo, path));
            break;

          case "dir":
            const subFiles = await getFilesRecursively(
              octokit,
              { owner, name: repo },
              path,
            );
            files.push(...subFiles);
            break;
        }
      }
    }

    return files;
  }
}

async function readFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
): Promise<File> {
  if (process.env.ACT) {
    // in local testing with `act`, we read the file directly from the filesystem
    const content = await fs.readFile(join(process.cwd(), filePath), "utf-8");
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
      const { path, content } = file;
      return {
        path,
        content: content
          ? Buffer.from(content, "base64").toString("utf-8")
          : undefined,
      };
    }
  }
}
