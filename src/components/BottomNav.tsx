import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Activity, Plus, Bike, User } from "lucide-react";
import { cn } from "../lib/utils";

interface BottomNavProps {
  onQuickAction: () => void;
  disabled?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onQuickAction,
  disabled = false,
}) => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Bike, label: "Garagem", path: "/garagem" },
    { icon: null, label: "", path: "", isAction: true },
    { icon: Activity, label: "Diagnóstico", path: "/diagnostico" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  const isItemActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-[calc(env(safe-area-inset-bottom)+16px)] bg-white pointer-events-none z-40" />
      <nav className="fixed bottom-3 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-safe">
        {navItems.map((item, index) => {
          if (item.isAction) {
            return (
              <button
                key={index}
                onClick={onQuickAction}
                disabled={disabled}
                className={cn(
                  "tutorial-quick-action p-4 rounded-full -mt-12 transform transition-transform",
                  disabled
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white shadow-lg shadow-blue-200 active:scale-95",
                )}
              >
                <Plus size={28} />
              </button>
            );
          }

          const Icon = item.icon!;

          if (disabled) {
            const active = isItemActive(item.path);

            return (
              <button
                key={index}
                type="button"
                disabled
                className={cn(
                  "flex flex-col items-center gap-1 cursor-not-allowed",
                  active ? "text-blue-500" : "text-gray-300",
                )}
              >
                <Icon size={24} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  isActive ? "text-blue-500" : "text-gray-400",
                )
              }
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
