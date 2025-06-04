import { getOctokit } from "@actions/github";

export * from "./read";
export * from "./write";

export type Octokit = ReturnType<typeof getOctokit>;

export interface File {
  path: string;
  content?: string;
}

export interface Repo {
  owner: string;
  name: string;
}
