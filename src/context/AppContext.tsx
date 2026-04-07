import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Bike,
  Expense,
  MaintenanceTask,
  AppState,
  UserProfile,
  NotificationSettings,
} from "../types";

interface AppContextType extends AppState {
  addBike: (bike: Omit<Bike, "id">) => void;
  updateBike: (bike: Bike) => void;
  toggleFavoriteBike: (id: string) => void;
  deleteBike: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  addTask: (task: Omit<MaintenanceTask, "id">) => void;
  toggleTask: (id: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "motocontrol_data";
const INSTALL_YEAR_KEY = "ridecontrol_install_year";
const DEFAULT_PROFILE_PHOTO = "https://picsum.photos/seed/rider/200/200";
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  taskDueSoonEnabled: true,
  daysBefore: 3,
};

const getInstallYear = () => {
  const currentYear = new Date().getFullYear();
  const storedInstallYear = Number(localStorage.getItem(INSTALL_YEAR_KEY));

  if (
    Number.isInteger(storedInstallYear) &&
    storedInstallYear > 2000 &&
    storedInstallYear <= currentYear
  ) {
    return storedInstallYear;
  }

  localStorage.setItem(INSTALL_YEAR_KEY, String(currentYear));
  return currentYear;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AppState>(() => {
    const installYear = getInstallYear();
    const defaultProfile: UserProfile = {
      name: "Alexsander Alcantara",
      photoUrl: DEFAULT_PROFILE_PHOTO,
      memberSince: installYear,
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return {
        bikes: [],
        expenses: [],
        tasks: [],
        userProfile: defaultProfile,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      };
    }

    try {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      const savedMemberSince = parsed.userProfile?.memberSince;
      const memberSince =
        typeof savedMemberSince === "number"
          ? savedMemberSince === 2020
            ? installYear
            : savedMemberSince
          : installYear;

      return {
        bikes: parsed.bikes || [],
        expenses: parsed.expenses || [],
        tasks: parsed.tasks || [],
        userProfile: {
          ...defaultProfile,
          ...(parsed.userProfile || {}),
          memberSince,
        },
        notificationSettings: {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(parsed.notificationSettings || {}),
        },
      };
    } catch {
      return {
        bikes: [],
        expenses: [],
        tasks: [],
        userProfile: defaultProfile,
        notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Erro ao salvar dados no localStorage:", error);
    }
  }, [state]);

  const addBike = (bikeData: Omit<Bike, "id">) => {
    const newBike: Bike = {
      ...bikeData,
      id: crypto.randomUUID(),
      isFavorite: bikeData.isFavorite ?? false,
    };
    setState((prev) => ({ ...prev, bikes: [...prev.bikes, newBike] }));
  };

  const updateBike = (bike: Bike) => {
    setState((prev) => ({
      ...prev,
      bikes: prev.bikes.map((b) => (b.id === bike.id ? bike : b)),
    }));
  };

  const toggleFavoriteBike = (id: string) => {
    setState((prev) => ({
      ...prev,
      bikes: prev.bikes.map((bike) =>
        bike.id === id ? { ...bike, isFavorite: !bike.isFavorite } : bike,
      ),
    }));
  };

  const deleteBike = (id: string) => {
    setState((prev) => ({
      ...prev,
      bikes: prev.bikes.filter((b) => b.id !== id),
      expenses: prev.expenses.filter((e) => e.bikeId !== id),
      tasks: prev.tasks.filter((t) => t.bikeId !== id),
    }));
  };

  const addExpense = (expenseData: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expenseData, id: crypto.randomUUID() };
    setState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, newExpense],
      bikes: prev.bikes.map((bike) =>
        bike.id === expenseData.bikeId && expenseData.km > bike.currentKm
          ? { ...bike, currentKm: expenseData.km }
          : bike,
      ),
    }));
  };

  const addTask = (taskData: Omit<MaintenanceTask, "id">) => {
    const newTask: MaintenanceTask = { ...taskData, id: crypto.randomUUID() };
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const toggleTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id === id) {
          const completed = !t.completed;
          return {
            ...t,
            completed,
            completedDate: completed ? new Date().toISOString() : undefined,
            completedKm: completed
              ? prev.bikes.find((b) => b.id === t.bikeId)?.currentKm
              : undefined,
          };
        }
        return t;
      }),
    }));
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      userProfile: {
        ...prev.userProfile,
        ...profile,
      },
    }));
  };

  const updateNotificationSettings = (
    settings: Partial<NotificationSettings>,
  ) => {
    setState((prev) => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        ...settings,
      },
    }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addBike,
        updateBike,
        toggleFavoriteBike,
        deleteBike,
        addExpense,
        addTask,
        toggleTask,
        updateUserProfile,
        updateNotificationSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp deve ser usado dentro de AppProvider");
  return context;
};
