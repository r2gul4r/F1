import { assertProjectStructure, ProjectStructureError } from "../packages/shared/dist/index.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");

try {
  assertProjectStructure(repoRoot);
  console.log("Project structure validation passed");
} catch (error) {
  if (error instanceof ProjectStructureError) {
    if (error.result.missingPaths.length > 0) {
      console.error(`Missing paths: ${error.result.missingPaths.join(", ")}`);
    }

    if (error.result.workspaceNameMismatches.length > 0) {
      console.error(`Workspace name mismatches: ${JSON.stringify(error.result.workspaceNameMismatches)}`);
    }

    if (error.result.missingWorkspaceScripts.length > 0) {
      console.error(`Missing workspace scripts: ${JSON.stringify(error.result.missingWorkspaceScripts)}`);
    }
  } else {
    console.error("Project structure validation failed");
  }

  process.exit(1);
}
