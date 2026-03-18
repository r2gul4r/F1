import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DownloadPage from "../app/download/page";
import HistoryPage from "../app/history/page";
import ReplayDemoPage from "../app/history/replay/page";
import HomePage from "../app/page";

vi.mock("@/src/components/watch-replay-client", () => ({
  WatchReplayClient: () => <div data-testid="watch-replay-client">replay client</div>
}));

const expectLink = (name: string, href: string) => {
  const link = screen.getByRole("link", { name });
  expect(link.getAttribute("href")).toBe(href);
};

const expectApprovedLinksOnly = (approvedHrefs: string[]) => {
  const hrefs = screen
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter((href): href is string => typeof href === "string");
  const uniqueHrefs = [...new Set(hrefs)].sort();

  expect(uniqueHrefs).toEqual([...approvedHrefs].sort());
  expect(uniqueHrefs.some((href) => href.startsWith("/watch/") && href !== "/watch/preview")).toBe(false);
  expect(uniqueHrefs).not.toContain("/api/auth/watch-session");
};

describe("public entry pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("landing page가 desktop-first boundary와 public demo entry를 노출함", () => {
    render(<HomePage />);

    expect(screen.getByText("실시간 본체는 데스크톱 앱으로 전환 중")).toBeTruthy();
    expect(screen.getByText(/공개 웹은 랜딩, 다운로드, 히스토리컬 데모만 맡는다\./)).toBeTruthy();

    expectLink("다운로드 및 실행 안내", "/download");
    expectLink("프로토타입 미리보기", "/watch/preview");
    expectLink("히스토리컬 데모 진입점", "/history");
    expectLink("리플레이 데모 열기", "/history/replay");
    expectApprovedLinksOnly(["/download", "/watch/preview", "/history", "/history/replay"]);
  });

  it("download page가 release track, first-run checklist, public web boundary를 고정함", () => {
    render(<DownloadPage />);

    expect(screen.getByText("F1 Pulse Desktop 준비 중")).toBeTruthy();
    expect(screen.getByText(/Windows: `F1-Pulse-Desktop-win-x64\.zip`/)).toBeTruthy();
    expect(screen.getByText(/1\. mock session으로 desktop 창이 뜨는지 확인/)).toBeTruthy();
    expect(screen.getByText(/public web은 preview-only 경로/)).toBeTruthy();

    expectLink("랜딩으로 돌아가기", "/");
    expectLink("히스토리컬 데모 진입점", "/history");
    expectLink("리플레이 데모 열기", "/history/replay");
    expectLink("프로토타입 미리보기", "/watch/preview");
    expectApprovedLinksOnly(["/", "/history", "/history/replay", "/watch/preview"]);
  });

  it("history page가 preview demo와 replay demo 진입점을 함께 노출함", () => {
    render(<HistoryPage />);

    expect(screen.getByText("히스토리컬 데모 진입점")).toBeTruthy();
    expect(screen.getByText(/데스크톱 제품이 다루는 레이스 읽기 흐름을 복원할 수 있는/)).toBeTruthy();

    expectLink("/watch/preview 열기", "/watch/preview");
    expectLink("/history/replay 열기", "/history/replay");
    expectLink("다운로드 안내", "/download");
    expectApprovedLinksOnly(["/", "/download", "/watch/preview", "/history/replay"]);
  });

  it("replay page가 historical disclaimer와 replay client entry를 유지함", () => {
    render(<ReplayDemoPage />);

    expect(screen.getByText("고정 리플레이 데모")).toBeTruthy();
    expect(screen.getByText(/공개 웹에서는 실시간 본체를 중계하지 않는다\./)).toBeTruthy();
    expect(screen.getByTestId("watch-replay-client")).toBeTruthy();

    expectLink("히스토리컬 데모 목록", "/history");
    expectLink("다운로드 안내", "/download");
    expectApprovedLinksOnly(["/history", "/download"]);
  });
});
