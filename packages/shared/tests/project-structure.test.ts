import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertProjectStructure, inspectProjectStructure, ProjectStructureError } from "../src/project-structure.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../..");

describe("project structure", () => {
  it("핵심 워크스페이스 구조가 준비되어 있으면 통과함", () => {
    expect(() => assertProjectStructure(repoRoot)).not.toThrow();
  });

  it("필수 앱 워크스페이스가 누락되면 실패함", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "f1-structure-"));
    mkdirSync(join(tempRoot, "apps", "desktop"), { recursive: true });
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true });
    mkdirSync(join(tempRoot, "packages", "core"), { recursive: true });
    mkdirSync(join(tempRoot, "packages", "shared"), { recursive: true });
    writeFileSync(
      join(tempRoot, "apps", "desktop", "package.json"),
      JSON.stringify({ name: "@f1/desktop" }),
      "utf8"
    );
    writeFileSync(
      join(tempRoot, "apps", "web", "package.json"),
      JSON.stringify({ name: "@f1/web" }),
      "utf8"
    );
    writeFileSync(
      join(tempRoot, "packages", "core", "package.json"),
      JSON.stringify({ name: "@f1/core" }),
      "utf8"
    );
    writeFileSync(
      join(tempRoot, "packages", "shared", "package.json"),
      JSON.stringify({ name: "@f1/shared" }),
      "utf8"
    );

    expect(() => assertProjectStructure(tempRoot)).toThrow(ProjectStructureError);

    try {
      assertProjectStructure(tempRoot);
      expect.fail("실패가 필요함");
    } catch (error) {
      const typedError = error as ProjectStructureError;
      expect(typedError.code).toBe("PROJECT_STRUCTURE_INVALID");
      expect(typedError.result.missingPaths).toContain("apps/realtime/package.json");
    }
  });

  it("realtime migration 진입점이 없으면 실패함", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "f1-structure-"));
    mkdirSync(join(tempRoot, "apps", "desktop"), { recursive: true });
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true });
    mkdirSync(join(tempRoot, "apps", "realtime", "src"), { recursive: true });
    mkdirSync(join(tempRoot, "packages", "core"), { recursive: true });
    mkdirSync(join(tempRoot, "packages", "shared"), { recursive: true });

    writeFileSync(join(tempRoot, "package.json"), JSON.stringify({ scripts: { test: "pnpm -r test" } }), "utf8");
    writeFileSync(join(tempRoot, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n", "utf8");
    writeFileSync(join(tempRoot, "ARCHITECTURE.md"), "# Architecture\n", "utf8");
    writeFileSync(join(tempRoot, "PLAN.md"), "# Plan\n", "utf8");
    writeFileSync(join(tempRoot, "TASKS.md"), "# Tasks\n", "utf8");
    writeFileSync(join(tempRoot, "CHANGELOG.md"), "# Changelog\n", "utf8");
    writeFileSync(join(tempRoot, "apps", "desktop", "package.json"), JSON.stringify({ name: "@f1/desktop" }), "utf8");
    writeFileSync(join(tempRoot, "apps", "web", "package.json"), JSON.stringify({ name: "@f1/web" }), "utf8");
    writeFileSync(
      join(tempRoot, "apps", "realtime", "package.json"),
      JSON.stringify({ name: "@f1/realtime", scripts: { build: "pnpm exec tsc -p tsconfig.json" } }),
      "utf8"
    );
    writeFileSync(join(tempRoot, "packages", "core", "package.json"), JSON.stringify({ name: "@f1/core" }), "utf8");
    writeFileSync(join(tempRoot, "packages", "shared", "package.json"), JSON.stringify({ name: "@f1/shared" }), "utf8");

    const result = inspectProjectStructure(tempRoot);

    expect(result.missingPaths).toContain("apps/realtime/src/migrate.ts");
    expect(result.missingWorkspaceScripts).toContainEqual({
      packageJsonPath: "apps/realtime/package.json",
      missingScripts: ["db:migrate"]
    });
    expect(() => assertProjectStructure(tempRoot)).toThrow(ProjectStructureError);
  });
});
