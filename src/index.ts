import * as core from "@actions/core";
import * as github from "@actions/github";
import { getFiles } from "./files";
import Handlebars from "handlebars";

// create github client
const octokit = github.getOctokit(core.getInput("github-token"));
const files = await getFiles(octokit);

// update files
files.map(({ content }) => {
  const template = Handlebars.compile(content);
  const newContent = template({
    updated: new Date(),
  });
  console.log(newContent);
});
