import type { ReactNode } from "react";

interface DevMobileFrameProps {
  src: string;
  toggle?: ReactNode;
  width?: number;
  height?: number;
}

export function DevMobileFrame({ src, toggle, width = 402, height = 874 }: DevMobileFrameProps) {
  return (
    <div
      className="fixed inset-0 overflow-auto"
      style={{ background: "linear-gradient(135deg, #1d2027 0%, #0c0d11 100%)" }}
    >
      <div className="min-h-full flex items-center justify-center p-6">
        <div
          className="relative shrink-0"
          style={{
            width: width + 18,
            height: height + 18,
            borderRadius: 52,
            padding: 9,
            background: "linear-gradient(145deg, #2a2d35, #111218)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          <iframe
            src={src}
            title="Мобильный предпросмотр"
            className="w-full h-full block"
            style={{
              borderRadius: 44,
              border: 0,
              background: "var(--bg-app)",
            }}
          />
        </div>
      </div>
      {toggle}
    </div>
  );
}
