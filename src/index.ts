import * as core from "@actions/core";
import * as github from "@actions/github";
import { getFiles } from "./files";
import Handlebars from "handlebars";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// create github client
const octokit = github.getOctokit(core.getInput("github-token"));
const files = await getFiles(octokit);

// provide the updated time
const tz = core.getInput("timezone");
Handlebars.registerHelper("updated", (template) => {
  const formatString =
    typeof template === "string" ? template : "DD-MM-YYYY HH:mm:ss";
  return dayjs().tz(tz).format(formatString);
});

files.map(({ content }) => {
  const template = Handlebars.compile(content);
  const newContent = template({
    yes: "hi",
  });
  console.log(newContent);
});
