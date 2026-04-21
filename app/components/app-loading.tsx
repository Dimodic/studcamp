export function AppLoading({ text = "Синхронизация данных…" }: { text?: string }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: "var(--bg-app)" }}>
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
        />
        <p style={{ color: "var(--text-secondary)" }}>{text}</p>
      </div>
    </div>
  );
}
