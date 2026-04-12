/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { motion } from "motion/react";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { OnboardingTutorial } from "./components/OnboardingTutorial.tsx";
import { TutorialWelcome } from "./components/TutorialWelcome";
import { Auth } from "./pages/Auth";
import { Home } from "./pages/Home";
import { Garage } from "./pages/Garage";
import { BikeDetails } from "./pages/BikeDetails";
import { BikeTasks } from "./pages/BikeTasks.tsx";
import { EditBike } from "./pages/EditBike";
import { ExpenseInsights } from "./pages/ExpenseInsights.tsx";
import { ExpenseActivityDetails } from "./pages/ExpenseActivityDetails";
import { AddBike } from "./pages/AddBike";
import { AddExpense } from "./pages/AddExpense";
import { AddTask } from "./pages/AddTask";
import { Profile } from "./pages/Profile";
import { PersonalInfo } from "./pages/PersonalInfo.tsx";
import { Notifications } from "./pages/Notifications";

function LegacyBikeRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/moto/${id}` : "/garagem"} replace />;
}

function LoadingScreen() {
  const { cloudBootProgress, cloudBootStatus } = useApp();
  const safeProgress = Math.max(0, Math.min(100, cloudBootProgress));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_28%),linear-gradient(180deg,#eff6ff_0%,#ffffff_58%,#ecfeff_100%)] px-6">
      <motion.div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-400/20 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-14 -right-8 w-48 h-48 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <motion.div
          className="w-full max-w-sm rounded-[40px] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_28px_80px_rgba(59,130,246,0.18)] p-7"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-blue-200"
              animate={{ rotate: [0, 8, 0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="font-black text-xl">R</span>
            </motion.div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-500">
                RideControl Cloud
              </p>
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                Sincronizando conta
              </h2>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700">
                {cloudBootStatus}
              </p>
              <p className="text-xs font-black text-blue-600">
                {safeProgress}%
              </p>
            </div>

            <div className="h-4 rounded-full bg-gray-100 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500"
                animate={{
                  backgroundPositionX: ["0%", "100%"],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                style={{
                  width: `${safeProgress}%`,
                  backgroundSize: "200% 100%",
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
              <span>Carregando conta</span>
              <span>{safeProgress < 100 ? "Aguarde" : "Pronto"}</span>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="w-2.5 h-2.5 rounded-full bg-blue-500"
                  animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.15,
                  }}
                />
              ))}
              <span className="ml-1 text-xs text-gray-400 font-medium">
                Carregando dados e sessão
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { isCloudReady, isCloudAuthenticated } = useApp();
  const location = useLocation();

  if (!isCloudReady) {
    return <LoadingScreen />;
  }

  if (!isCloudAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function AppContent() {
  const { isTutorialActive } = useApp();

  return (
    <>
      <Routes>
        <Route path="/garage" element={<Navigate to="/garagem" replace />} />
        <Route path="/bike/:id" element={<LegacyBikeRedirect />} />
        <Route
          path="/diagnose"
          element={<Navigate to="/diagnostico" replace />}
        />
        <Route path="/profile" element={<Navigate to="/perfil" replace />} />
        <Route
          path="/add-bike"
          element={<Navigate to="/adicionar-moto" replace />}
        />
        <Route
          path="/add-expense"
          element={<Navigate to="/adicionar-gasto" replace />}
        />
        <Route
          path="/add-task"
          element={<Navigate to="/adicionar-tarefa" replace />}
        />
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="garagem" element={<Garage />} />
            <Route path="moto/:id" element={<BikeDetails />} />
            <Route path="moto/:id/tarefas" element={<BikeTasks />} />
            <Route path="moto/:id/editar" element={<EditBike />} />
            <Route path="diagnostico" element={<ExpenseInsights />} />
            <Route
              path="diagnostico/atividade/:id"
              element={<ExpenseActivityDetails />}
            />
            <Route path="perfil" element={<Profile />} />
            <Route path="perfil/informacoes" element={<PersonalInfo />} />
            <Route path="perfil/notificacoes" element={<Notifications />} />
            <Route path="adicionar-moto" element={<AddBike />} />
            <Route path="adicionar-gasto" element={<AddExpense />} />
            <Route path="adicionar-tarefa" element={<AddTask />} />
          </Route>
        </Route>
      </Routes>
      <TutorialWelcome />
      {isTutorialActive && <OnboardingTutorial />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}
