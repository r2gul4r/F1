import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <section className="panel" style={{ width: "min(560px, 92vw)" }}>
        <h1>F1 Pulse</h1>
        <p className="muted">시청 세션 대시보드로 이동</p>
        <Link href="/watch/current">현재 세션 열기</Link>
      </section>
    </main>
  );
}
