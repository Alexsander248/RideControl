import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { QuickActionModal } from './QuickActionModal';

export const Layout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <main className="max-w-md mx-auto min-h-screen relative overflow-hidden">
        <Outlet />
      </main>
      <BottomNav onQuickAction={() => setIsModalOpen(true)} />
      <QuickActionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
