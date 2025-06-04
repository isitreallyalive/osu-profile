import * as core from "@actions/core";

const files = core.getInput("allowed-files");
console.log(files);