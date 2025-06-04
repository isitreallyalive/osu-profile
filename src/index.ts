// todo: error handling

import * as core from "@actions/core";
import * as github from "@actions/github";
import { getFiles, writeFiles, type Repo } from "./files/index";
import Handlebars from "handlebars";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// create github client
const octokit = github.getOctokit(core.getInput("github-token"));
const [owner, name] = process.env.GITHUB_REPOSITORY.split("/");
const repo: Repo = { owner, name };
const files = await getFiles(octokit, repo);

// provide the updated time
const tz = core.getInput("timezone");
Handlebars.registerHelper("updated", (template) => {
  const formatString =
    typeof template === "string" ? template : "DD-MM-YYYY HH:mm:ss";
  return dayjs().tz(tz).format(formatString);
});

const commentRegex = /<!--\s*({{.*?}})\s*-->/gs;
const newFiles = files.map(({ content, ...file }) => {
  let result = content;
  let match: RegExpExecArray;

  while ((match = commentRegex.exec(content)) !== null) {
    const [full, code] = match;
    try {
      const template = Handlebars.compile(code);
      const output = template({});
      const multiline = code.includes("\n");
      result = result.replace(
        full,
        `${full}${multiline ? "\n" : ""} ${output}`,
      );
    } catch (error) {}
  }

  return { content: result, ...file };
});

// write changed files to the repository
const changedFiles = newFiles.filter((new_) => {
  const old = files.find((f) => f.path === new_.path);
  return old && old.content !== new_.content;
});

await writeFiles(octokit, changedFiles, repo);
