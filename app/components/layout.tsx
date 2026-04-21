import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "../hooks/useMobile";
import {
  getActivePrimaryPath,
  isPrimaryRoute,
  navigationItems,
} from "../lib/navigation";

const COLLAPSED_WIDTH = "4rem";
const EXPANDED_WIDTH = "15rem";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const activePrimaryPath = getActivePrimaryPath(location.pathname);
  const showMobileBottomNav = isMobile && isPrimaryRoute(location.pathname);
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <div
      className="min-h-dvh flex"
      style={{ background: "var(--bg-app)", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {!isMobile && (
        <aside
          className="hidden md:flex md:flex-col border-r shrink-0 transition-[width] duration-200"
          style={{
            width: sidebarWidth,
            borderColor: "var(--line-subtle)",
            background: "var(--bg-card)",
          }}
        >
          <div
            className="flex h-14 items-center border-b px-3"
            style={{ borderColor: "var(--line-subtle)" }}
          >
            <div className="flex items-center gap-3 px-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px] shrink-0"
                style={{ background: "var(--brand-soft)", color: "var(--brand-contrast)" }}
              >
                <PanelLeft size={16} />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-[14px] truncate" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    Studcamp
                  </p>
                  <p className="text-[12px] truncate" style={{ color: "var(--text-tertiary)" }}>
                    Desktop navigation
                  </p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {!collapsed && (
              <p
                className="px-3 pb-1.5 text-[11px] uppercase tracking-wide"
                style={{ color: "var(--text-tertiary)" }}
              >
                Навигация
              </p>
            )}
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const active = activePrimaryPath === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className="flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 transition-colors"
                      style={{
                        background: active ? "var(--bg-subtle)" : "transparent",
                        color: active ? "var(--text-primary)" : "var(--text-secondary)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span className="text-[14px] truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {!collapsed && (
            <div className="px-3 pb-3">
              <p
                className="rounded-[var(--radius-md)] px-3 py-2 text-[12px]"
                style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
              >
                Mobile keeps the bottom tabs. Desktop switches to the left menu.
              </p>
            </div>
          )}
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {!isMobile && (
          <header
            className="flex h-14 items-center border-b px-4 lg:px-6"
            style={{ background: "var(--bg-app)", borderColor: "var(--line-subtle)" }}
          >
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
              className="h-9 w-9 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <PanelLeft size={18} />
            </button>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${showMobileBottomNav ? "pb-20" : ""}`}>
          <Outlet />
        </main>
      </div>

      {showMobileBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--line-subtle)" }}
        >
          <div className="max-w-lg mx-auto flex">
            {navigationItems.map((item) => {
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
                      style={{ background: "var(--brand)" }}
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
