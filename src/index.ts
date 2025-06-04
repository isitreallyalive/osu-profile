import * as core from "@actions/core";
import * as github from "@actions/github";
import { getFiles } from "./files";

// create github client
const octokit = github.getOctokit(core.getInput("github-token"));
const files = await getFiles(octokit);
console.log(files);
