import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "./common";
import { useState, useEffect } from "react";
import { useAppData } from "../lib/app-data";

export function BadgePage() {
  const navigate = useNavigate();
  const { data } = useAppData();
  const [time, setTime] = useState(new Date());

  if (!data) {
    return null;
  }

  const { currentUser, camp } = data;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="w-full max-w-lg mx-auto min-h-full flex flex-col" style={{ background: "var(--text-primary)" }}>
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: "var(--text-inverted)" }}>
          <ArrowLeft size={22} />
        </button>
        <span className="text-[16px]" style={{ color: "var(--text-inverted)", fontWeight: 500 }}>
          Бейдж участника
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full rounded-[var(--radius-xl)] overflow-hidden" style={{ background: "var(--bg-card)", boxShadow: "var(--shadow-floating)" }}>
          {/* Brand stripe */}
          <div className="px-6 py-4" style={{ background: "var(--brand)" }}>
            <p className="text-[13px] mb-0.5" style={{ color: "var(--brand-contrast)", opacity: 0.6 }}>
              Яндекс Образование
            </p>
            <p className="text-[18px]" style={{ color: "var(--brand-contrast)", fontWeight: 600 }}>
              {camp.name}
            </p>
          </div>

          <div className="p-6 text-center">
            <div className="mx-auto mb-4">
              <Avatar name={currentUser.name} size={96} />
            </div>

            <h2 className="text-[var(--text-primary)] mb-1">{currentUser.name}</h2>
            <p className="text-[14px] mb-1" style={{ color: "var(--text-secondary)" }}>Участник</p>
            <p className="text-[14px] mb-5" style={{ color: "var(--text-tertiary)" }}>
              {currentUser.university} · {currentUser.city}
            </p>

            <div className="rounded-[var(--radius-md)] p-3 mb-4" style={{ background: "var(--bg-subtle)" }}>
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
                {camp.city} · {camp.university}
              </p>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {new Date(camp.dates.start).toLocaleDateString("ru-RU")} – {new Date(camp.dates.end).toLocaleDateString("ru-RU")}
              </p>
            </div>

            {/* Live timestamp */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
              <span className="text-[18px] tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {timeStr}
              </span>
            </div>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>{dateStr}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4 text-center">
        <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Покажите бейдж на входе в корпус
        </p>
      </div>
    </div>
  );
}
