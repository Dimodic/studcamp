import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Avatar, SurfaceCard } from "./common";
import { useState, useEffect } from "react";
import { useAppData } from "../lib/app-data";

export function BadgePage() {
  const navigate = useNavigate();
  const { data } = useAppData();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return null;
  }

  const { currentUser, camp } = data;
  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft size={22} />
        </button>
        <span className="text-[16px]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          Бейдж участника
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-6">
        <SurfaceCard className="relative w-full max-w-md overflow-hidden">
          {/* Фоновая картинка — лежит под всем содержимым карточки.
              Если файла нет, peach-заливка ниже (--accent-peach) не даст
              карточке стать пустой. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "var(--accent-peach)",
              backgroundImage: "url('/badge-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Мягкий overlay сверху: делает центр светлее чтобы аватар + ФИО читались
              поверх лого Алисы, и одновременно сохраняет рисунок снизу/по краям. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.7) 100%)",
            }}
          />

          <div className="relative">
            <div className="px-8 pt-8 pb-6">
              <p
                className="text-[12px] uppercase tracking-wider mb-1"
                style={{ color: "var(--text-primary)", opacity: 0.6, fontWeight: 600 }}
              >
                Яндекс Образование
              </p>
              <p
                className="text-[22px] leading-tight"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {camp.name}
              </p>
            </div>

            <div className="px-8 pb-8 text-center">
              <div className="flex justify-center mb-5">
                <Avatar name={currentUser.name} size={104} />
              </div>

              <h2 className="mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {currentUser.name}
              </h2>
              <p className="text-[15px]" style={{ color: "var(--text-secondary)" }}>
                Участник
              </p>
              {(currentUser.university || currentUser.city) && (
                <p className="text-[14px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {[currentUser.university, currentUser.city].filter(Boolean).join(" · ")}
                </p>
              )}

              <div
                className="rounded-[var(--radius-md)] p-4 mt-5 text-left backdrop-blur-sm"
                style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid var(--line-subtle)" }}
              >
                <p
                  className="text-[12px] uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-tertiary)", fontWeight: 600 }}
                >
                  Площадка
                </p>
                <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                  {camp.city} · {camp.university}
                </p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {new Date(camp.dates.start).toLocaleDateString("ru-RU")} – {new Date(camp.dates.end).toLocaleDateString("ru-RU")}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 mt-5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--success)" }}
                />
                <span
                  className="text-[22px] tabular-nums"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: 500 }}
                >
                  {timeStr}
                </span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                {dateStr}
              </p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="px-6 pb-8 pt-2 text-center">
        <p className="text-[14px]" style={{ color: "var(--text-tertiary)" }}>
          Покажите бейдж на входе в корпус
        </p>
      </div>
    </div>
  );
}
