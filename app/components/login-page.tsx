import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { ArrowLeft, Mail } from "lucide-react";
import logoImg from "../assets/logo.png";
import { ImageWithFallback, PrimaryButton } from "./common";
import { useAppData } from "../lib/app-data";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Заполните все поля");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password.trim());
      setError("");
      navigate(from, { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-dvh grid lg:grid-cols-2 relative"
      style={{ background: "var(--bg-app)", fontFamily: "var(--font-ui)" }}
    >
      <div className="flex flex-col px-8 sm:px-12 lg:px-20 py-10 lg:py-14">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0">
            <ImageWithFallback src={logoImg} alt="Яндекс Образование" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px]" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Яндекс
            </span>
            <span className="text-[12.5px]" style={{ color: "var(--text-tertiary)" }}>
              Образование
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[440px]">
            <h1 className="mb-5" style={{ fontSize: "56px", lineHeight: 1.02, letterSpacing: "-0.02em" }}>
              Студкемп
            </h1>
            <p className="text-[18px] leading-relaxed mb-10" style={{ color: "var(--text-secondary)" }}>
              Алиса и умные устройства Яндекса. Войди, чтобы открыть расписание, людей, проекты и документы.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(evt) => setEmail(evt.target.value)}
                    placeholder="student@university.ru"
                    className="w-full rounded-[var(--radius-lg)] pl-11 pr-4 h-[54px] text-[16px] outline-none"
                    style={{
                      border: "1px solid var(--line-subtle)",
                      background: "var(--bg-input)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(evt) => setPassword(evt.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(evt) => evt.key === "Enter" && void handleSubmit()}
                  className="w-full rounded-[var(--radius-lg)] px-4 h-[54px] text-[16px] outline-none"
                  style={{
                    border: "1px solid var(--line-subtle)",
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {error && (
                <p className="text-[14px]" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <PrimaryButton
                  className="flex-1 min-w-[200px]"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? "Входим…" : "Войти"}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex items-center justify-center gap-2 h-[var(--button-height)] px-6 text-[16px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ArrowLeft size={16} />
                  Вернуться
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:flex items-center justify-center p-16"
        style={{ background: "var(--accent-peach)" }}
      >
        <div className="max-w-md">
          <p
            className="text-[13px] uppercase tracking-wider mb-6"
            style={{ color: "var(--text-primary)", fontWeight: 600, opacity: 0.6 }}
          >
            Программа кемпа
          </p>
          <p
            className="text-[44px] leading-[1.05]"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
          >
            Расписание, проекты и люди в одном светлом интерфейсе.
          </p>
          <p className="text-[16px] mt-6" style={{ color: "var(--text-primary)", opacity: 0.75 }}>
            Всё, что нужно участнику — от чек-ина до ментора и бейджа — открывается в два клика.
          </p>
        </div>
      </div>
    </div>
  );
}
