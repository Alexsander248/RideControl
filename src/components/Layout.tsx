import React, { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { QuickActionModal } from "./QuickActionModal";
import { useApp } from "../context/AppContext";

export const Layout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isProfileComplete } = useApp();
  const location = useLocation();
  const isOnPersonalInfoPage = location.pathname === "/perfil/informacoes";
  const requiresOnboarding = !isProfileComplete;

  if (requiresOnboarding && !isOnPersonalInfoPage) {
    return <Navigate to="/perfil/informacoes" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <main className="max-w-md mx-auto min-h-screen relative overflow-hidden">
        <Outlet />
      </main>
      <BottomNav
        disabled={requiresOnboarding}
        onQuickAction={() => {
          if (!requiresOnboarding) {
            setIsModalOpen(true);
          }
        }}
      />
      <QuickActionModal
        isOpen={isModalOpen && !requiresOnboarding}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
