import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Mail, ArrowLeft } from "lucide-react";
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
      className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[var(--radius-lg)] overflow-hidden mx-auto mb-5">
            <ImageWithFallback src={logoImg} alt="Яндекс Образование" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-[var(--text-primary)]">Студкемп</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Алиса и умные устройства Яндекса
          </p>
        </div>

        <div
          className="rounded-[var(--radius-lg)] p-6 border space-y-4"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
        >
          <div>
            <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
              <input
                type="email"
                value={email}
                onChange={(evt) => setEmail(evt.target.value)}
                placeholder="student@university.ru"
                className="w-full border rounded-[var(--radius-md)] pl-10 pr-4 py-3 text-[15px] outline-none"
                style={{ borderColor: "var(--line-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div>
            <label className="text-[13px] mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(evt) => setPassword(evt.target.value)}
              placeholder="••••••••"
              onKeyDown={(evt) => evt.key === "Enter" && void handleSubmit()}
              className="w-full border rounded-[var(--radius-md)] px-4 py-3 text-[15px] outline-none"
              style={{ borderColor: "var(--line-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          {error && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <PrimaryButton onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Входим…" : "Войти"}
          </PrimaryButton>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 text-[14px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={15} />
            Вернуться к приложению
          </button>
        </div>
      </div>
    </div>
  );
}
