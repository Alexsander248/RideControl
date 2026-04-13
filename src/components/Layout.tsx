import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { QuickActionModal } from "./QuickActionModal";

export const Layout: React.FC = () => {
  const mainRef = useRef<HTMLElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const isOnAddExpensePage = location.pathname === "/adicionar-gasto";
  const requiresOnboarding = false;

  useEffect(() => {
    // Garante que toda navegação abra no topo, inclusive ao voltar de rota.
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <main
        ref={mainRef}
        className="max-w-md mx-auto min-h-screen relative overflow-hidden"
      >
        <Outlet />
      </main>
      <BottomNav
        disabled={requiresOnboarding}
        onQuickAction={() => {
          if (requiresOnboarding) {
            return;
          }

          if (isOnAddExpensePage) {
            window.dispatchEvent(new Event("app:submit-add-expense"));
            return;
          }

          if (!requiresOnboarding) {
            setIsModalOpen(true);
          }
        }}
        quickActionMode={isOnAddExpensePage ? "save-expense" : "default"}
      />
      <QuickActionModal
        isOpen={isModalOpen && !requiresOnboarding}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
