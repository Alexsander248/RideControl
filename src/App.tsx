/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { OnboardingTutorial } from "./components/OnboardingTutorial";
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
      </Routes>
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
