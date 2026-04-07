import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Activity, Plus, Bike, User } from "lucide-react";
import { cn } from "../lib/utils";

interface BottomNavProps {
  onQuickAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onQuickAction }) => {
  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Bike, label: "Garagem", path: "/garagem" },
    { icon: null, label: "", path: "", isAction: true },
    { icon: Activity, label: "Diagnóstico", path: "/diagnostico" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

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
                className="bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-200 -mt-12 transform transition-transform active:scale-95"
              >
                <Plus size={28} />
              </button>
            );
          }

          const Icon = item.icon!;
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
