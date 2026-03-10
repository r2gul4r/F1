import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type WorkspaceRequirement = {
  readonly packageJsonPath: string;
  readonly expectedName: string;
};

type WorkspaceNameMismatch = {
  readonly packageJsonPath: string;
  readonly expectedName: string;
  readonly actualName: string | null;
};

export type ProjectStructureResult = {
  readonly missingPaths: readonly string[];
  readonly workspaceNameMismatches: readonly WorkspaceNameMismatch[];
};

export class ProjectStructureError extends Error {
  readonly code = "PROJECT_STRUCTURE_INVALID";

  constructor(public readonly result: ProjectStructureResult) {
    super("PROJECT_STRUCTURE_INVALID");
    this.name = "ProjectStructureError";
  }
}

const requiredRootPaths = [
  "package.json",
  "pnpm-workspace.yaml",
  "ARCHITECTURE.md",
  "PLAN.md",
  "TASKS.md",
  "CHANGELOG.md"
] as const;

const requiredWorkspaces: readonly WorkspaceRequirement[] = [
  { packageJsonPath: "apps/web/package.json", expectedName: "@f1/web" },
  { packageJsonPath: "apps/realtime/package.json", expectedName: "@f1/realtime" },
  { packageJsonPath: "apps/worker/package.json", expectedName: "@f1/worker" },
  { packageJsonPath: "packages/shared/package.json", expectedName: "@f1/shared" }
];

const resolveFromRoot = (repoRoot: string, relativePath: string): string =>
  resolve(repoRoot, relativePath);

const readPackageName = (packageJsonFilePath: string): string | null => {
  try {
    const raw = readFileSync(packageJsonFilePath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
};

export const inspectProjectStructure = (repoRoot: string): ProjectStructureResult => {
  const missingRootPaths = requiredRootPaths.filter(
    (relativePath) => !existsSync(resolveFromRoot(repoRoot, relativePath))
  );

  const workspaceChecks = requiredWorkspaces.map((workspace) => {
    const packageJsonFilePath = resolveFromRoot(repoRoot, workspace.packageJsonPath);
    const packageName = readPackageName(packageJsonFilePath);
    return {
      packageJsonPath: workspace.packageJsonPath,
      expectedName: workspace.expectedName,
      actualName: packageName
    };
  });

  const missingWorkspacePaths = workspaceChecks
    .filter((workspace) => workspace.actualName === null)
    .map((workspace) => workspace.packageJsonPath);

  const workspaceNameMismatches = workspaceChecks.filter(
    (workspace) => workspace.actualName !== null && workspace.actualName !== workspace.expectedName
  );

  return {
    missingPaths: [...missingRootPaths, ...missingWorkspacePaths],
    workspaceNameMismatches
  };
};

export const assertProjectStructure = (repoRoot: string): void => {
  const result = inspectProjectStructure(repoRoot);
  if (result.missingPaths.length > 0 || result.workspaceNameMismatches.length > 0) {
    throw new ProjectStructureError(result);
  }
};
