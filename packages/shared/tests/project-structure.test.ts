import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertProjectStructure } from "../src/project-structure.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../..");

describe("project structure", () => {
  it("핵심 워크스페이스 구조가 준비되어 있으면 통과함", () => {
    expect(() => assertProjectStructure(repoRoot)).not.toThrow();
  });

  it("필수 앱 워크스페이스가 누락되면 실패함", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "f1-structure-"));
    mkdirSync(join(tempRoot, "apps", "web"), { recursive: true });
    mkdirSync(join(tempRoot, "packages", "shared"), { recursive: true });
    writeFileSync(
      join(tempRoot, "apps", "web", "package.json"),
      JSON.stringify({ name: "@f1/web" }),
      "utf8"
    );
    writeFileSync(
      join(tempRoot, "packages", "shared", "package.json"),
      JSON.stringify({ name: "@f1/shared" }),
      "utf8"
    );

    expect(() => assertProjectStructure(tempRoot)).toThrow("PROJECT_STRUCTURE_INVALID");
  });
});
