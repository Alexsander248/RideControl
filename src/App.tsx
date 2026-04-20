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
  useNavigate,
  useParams,
} from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import { App as CapacitorApp } from "@capacitor/app";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { AppUpdateManager } from "./components/AppUpdateManager";
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
import { supabase } from "./lib/supabase";

function LegacyBikeRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/moto/${id}` : "/garagem"} replace />;
}

function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      if (!supabase) {
        navigate("/auth", { replace: true });
        return;
      }

      const currentUrl = new URL(window.location.href);
      const code = currentUrl.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!isActive) return;

        if (error) {
          navigate("/auth", {
            replace: true,
            state: { message: error.message, type: "error" },
          });
          return;
        }

        navigate("/", { replace: true });
        return;
      }

      navigate("/auth", { replace: true });
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white border border-gray-100 rounded-3xl px-6 py-5 shadow-sm text-center">
        <p className="text-sm font-semibold text-gray-700">
          Finalizando autenticação...
        </p>
        <p className="text-xs text-gray-400 mt-1">{location.pathname}</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { isCloudAuthenticated, isCloudReady, isProfileComplete } = useApp();
  const location = useLocation();

  if (!isCloudReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white border border-gray-100 rounded-3xl px-6 py-5 shadow-sm text-center">
          <p className="text-sm font-semibold text-gray-700">
            Restaurando sua sessão...
          </p>
        </div>
      </div>
    );
  }

  if (!isCloudAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const isProfileSetupRoute = location.pathname === "/perfil/informacoes";

  if (!isProfileComplete && !isProfileSetupRoute) {
    return (
      <Navigate
        to="/perfil/informacoes"
        replace
        state={{ from: location, fromProfileSetup: true }}
      />
    );
  }

  return <Outlet />;
}

function AppContent() {
  const { isTutorialActive } = useApp();

  useEffect(() => {
    const handleUrlOpen = (event: { url: string }) => {
      try {
        const incomingUrl = new URL(event.url);

        if (
          incomingUrl.protocol === "com.ridecontrol.app:" &&
          incomingUrl.hostname === "auth" &&
          incomingUrl.pathname === "/callback"
        ) {
          const targetPath = `/auth${incomingUrl.pathname}${incomingUrl.search}${incomingUrl.hash}`;
          window.history.replaceState({}, "", targetPath);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      } catch {
        // Ignore malformed deep links.
      }
    };

    const listener = CapacitorApp.addListener("appUrlOpen", handleUrlOpen);

    return () => {
      void listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);

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
        <Route path="/auth/callback" element={<AuthCallback />} />
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
        <AppUpdateManager />
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}
