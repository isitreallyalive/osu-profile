import { dirname } from "path";
import type { File, Octokit, Repo } from ".";
import * as core from "@actions/core";
import { mkdir, writeFile } from "fs/promises";

/**
 * Write files to the repository.
 */
export async function writeFiles(
  octokit: Octokit,
  files: File[],
  { owner, name: repo }: Repo,
) {
  const branch = core.getInput("branch");

  // get the current commit sha
  const {
    data: {
      object: { sha },
    },
  } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  // create a tree with all of the file changes
  const { data: tree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: sha,
    tree: files.map(({ path, content }) => ({
      path,
      mode: "100644",
      type: "blob",
      content,
    })),
  });

  // create a commit with the tree
  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: "chore: update profile data",
    tree: tree.sha,
    parents: [sha],
  });

  // update the reference to point to the new commit
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });
}
