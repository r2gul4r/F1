import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type WorkspaceRequirement = {
  readonly packageJsonPath: string;
  readonly expectedName: string;
  readonly requiredScripts?: readonly string[];
};

type WorkspaceNameMismatch = {
  readonly packageJsonPath: string;
  readonly expectedName: string;
  readonly actualName: string | null;
};

type WorkspaceScriptMismatch = {
  readonly packageJsonPath: string;
  readonly missingScripts: readonly string[];
};

export type ProjectStructureResult = {
  readonly missingPaths: readonly string[];
  readonly workspaceNameMismatches: readonly WorkspaceNameMismatch[];
  readonly missingWorkspaceScripts: readonly WorkspaceScriptMismatch[];
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
  {
    packageJsonPath: "apps/realtime/package.json",
    expectedName: "@f1/realtime",
    requiredScripts: ["db:migrate"]
  },
  { packageJsonPath: "apps/worker/package.json", expectedName: "@f1/worker" },
  { packageJsonPath: "packages/shared/package.json", expectedName: "@f1/shared" }
];

const requiredToolingPaths = ["apps/realtime/src/migrate.ts"] as const;

const resolveFromRoot = (repoRoot: string, relativePath: string): string =>
  resolve(repoRoot, relativePath);

const readPackageJson = (packageJsonFilePath: string): { name: string | null; scripts: readonly string[] } => {
  try {
    const raw = readFileSync(packageJsonFilePath, "utf8");
    const parsed = JSON.parse(raw) as { name?: unknown; scripts?: Record<string, unknown> };
    return {
      name: typeof parsed.name === "string" ? parsed.name : null,
      scripts: parsed.scripts ? Object.keys(parsed.scripts) : []
    };
  } catch {
    return {
      name: null,
      scripts: []
    };
  }
};

export const inspectProjectStructure = (repoRoot: string): ProjectStructureResult => {
  const missingRootPaths = requiredRootPaths.filter(
    (relativePath) => !existsSync(resolveFromRoot(repoRoot, relativePath))
  );
  const missingToolingPaths = requiredToolingPaths.filter(
    (relativePath) => !existsSync(resolveFromRoot(repoRoot, relativePath))
  );

  const workspaceChecks = requiredWorkspaces.map((workspace) => {
    const packageJsonFilePath = resolveFromRoot(repoRoot, workspace.packageJsonPath);
    const packageJson = readPackageJson(packageJsonFilePath);
    const missingScripts = (workspace.requiredScripts ?? []).filter(
      (scriptName) => !packageJson.scripts.includes(scriptName)
    );

    return {
      packageJsonPath: workspace.packageJsonPath,
      expectedName: workspace.expectedName,
      actualName: packageJson.name,
      missingScripts
    };
  });

  const missingWorkspacePaths = workspaceChecks
    .filter((workspace) => workspace.actualName === null)
    .map((workspace) => workspace.packageJsonPath);

  const workspaceNameMismatches = workspaceChecks.filter(
    (workspace) => workspace.actualName !== null && workspace.actualName !== workspace.expectedName
  );

  const missingWorkspaceScripts = workspaceChecks
    .filter((workspace) => workspace.actualName !== null && workspace.missingScripts.length > 0)
    .map((workspace) => ({
      packageJsonPath: workspace.packageJsonPath,
      missingScripts: workspace.missingScripts
    }));

  return {
    missingPaths: [...missingRootPaths, ...missingToolingPaths, ...missingWorkspacePaths],
    workspaceNameMismatches,
    missingWorkspaceScripts
  };
};

export const assertProjectStructure = (repoRoot: string): void => {
  const result = inspectProjectStructure(repoRoot);
  if (
    result.missingPaths.length > 0 ||
    result.workspaceNameMismatches.length > 0 ||
    result.missingWorkspaceScripts.length > 0
  ) {
    throw new ProjectStructureError(result);
  }
};
