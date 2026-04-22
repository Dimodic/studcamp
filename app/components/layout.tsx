import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import logoImg from "../assets/logo.png";
import { useIsMobile } from "../hooks/useMobile";
import { useAppData } from "../lib/app-data";
import {
  filterNavigation,
  getActivePrimaryPath,
  isPrimaryRoute,
  navigationItems,
} from "../lib/navigation";

const COLLAPSED_WIDTH = "4.5rem";
const EXPANDED_WIDTH = "16rem";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data } = useAppData();
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const canManageUsers = data?.currentUser.capabilities.canManageUsers ?? false;
  const visibleNav = useMemo(
    () => filterNavigation(navigationItems, { canManageUsers }),
    [canManageUsers],
  );

  const activePrimaryPath = getActivePrimaryPath(location.pathname);
  const showMobileBottomNav = isMobile && isPrimaryRoute(location.pathname);
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // Каждый раз при смене маршрута возвращаем main в начало, чтобы при переходе
  // между вкладками страница не "наследовала" скролл предыдущей. Страницы,
  // которым нужен свой начальный скролл (например Schedule на текущий день),
  // делают это в своих эффектах уже после сброса.
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div
      className="h-dvh flex overflow-hidden"
      style={{ background: "var(--bg-app)", fontFamily: "var(--font-ui)" }}
    >
      {!isMobile && (
        <aside
          className="hidden md:flex md:flex-col shrink-0 transition-[width] duration-200 border-r"
          style={{
            width: sidebarWidth,
            borderColor: "var(--line-subtle)",
            background: "var(--bg-card)",
          }}
        >
          <div
            className={`h-16 flex items-center shrink-0 ${collapsed ? "justify-center px-2" : "justify-between pl-5 pr-3"}`}
          >
            {!collapsed && (
              <Link to="/" className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logoImg}
                  alt="Яндекс Образование"
                  className="h-8 w-8 rounded-[10px] object-cover shrink-0"
                />
                <div className="min-w-0 flex flex-col">
                  <span
                    className="text-[14.5px] leading-tight truncate"
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    Яндекс
                  </span>
                  <span
                    className="text-[12px] leading-tight truncate"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Образование
                  </span>
                </div>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
              className="h-9 w-9 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--bg-subtle)] shrink-0"
              style={{ color: "var(--text-tertiary)" }}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <ul className="space-y-0.5">
              {visibleNav.map((item) => {
                const active = activePrimaryPath === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex h-11 items-center rounded-[var(--radius-md)] transition-colors ${collapsed ? "justify-center" : "gap-3 px-3"}`}
                      style={{
                        background: active ? "var(--accent-peach)" : "transparent",
                        color: active ? "var(--text-primary)" : "var(--text-secondary)",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      <item.icon
                        size={20}
                        strokeWidth={active ? 2.2 : 1.8}
                        className="shrink-0"
                        style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                      />
                      {!collapsed && <span className="text-[14.5px] truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      )}

      <main
        ref={mainRef}
        className={`flex-1 overflow-y-auto min-w-0 ${showMobileBottomNav ? "pb-20" : ""}`}
      >
        <Outlet />
      </main>

      {showMobileBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
        >
          <div className="max-w-lg mx-auto flex">
            {visibleNav.map((item) => {
              const active = activePrimaryPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex min-h-[52px] flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors"
                  style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full"
                      style={{ background: "var(--text-primary)" }}
                    />
                  )}
                  <item.icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                  <span className="text-[11px]" style={{ fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
