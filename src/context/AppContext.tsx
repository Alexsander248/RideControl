import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";

import type {
  Bike,
  Expense,
  MaintenanceTask,
  AppState,
  UserProfile,
  NotificationSettings,
} from "../types";
import { supabase, isSupabaseConfigured, getAppBaseUrl } from "../lib/supabase";

interface AppContextType extends AppState {
  isProfileComplete: boolean;
  isTutorialActive: boolean;
  isTutorialWelcomeOpen: boolean;
  isTutorialWelcomeSkippable: boolean;
  isCloudReady: boolean;
  isCloudConfigured: boolean;
  isCloudAuthenticated: boolean;
  cloudUserEmail: string | null;
  cloudSyncStatus: "idle" | "syncing" | "error";
  cloudSyncError: string | null;
  addBike: (bike: Omit<Bike, "id">) => void;
  updateBike: (bike: Bike) => void;
  toggleFavoriteBike: (id: string) => void;
  deleteBike: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addTask: (task: Omit<MaintenanceTask, "id">) => void;
  toggleTask: (id: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  markTutorialViewed: () => void;
  startTutorial: (allowSkip?: boolean) => void;
  beginTutorial: () => void;
  closeTutorialWelcome: () => void;
  signUpCloud: (email: string, password: string) => Promise<string | null>;
  signInCloud: (email: string, password: string) => Promise<string | null>;
  signOutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "motocontrol_data";
const LOCAL_UPDATED_AT_PREFIX = "motocontrol_local_updated_at";
const INSTALL_YEAR_KEY = "ridecontrol_install_year";
const CLOUD_STATE_TABLE = "app_state";
const DEFAULT_PROFILE_PHOTO = "/icons/perfil.png";
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  taskDueSoonEnabled: true,
  daysBefore: 3,
};

const getStorageKey = (userId: string | null) =>
  `${STORAGE_KEY_PREFIX}:${userId || "guest"}`;

const getUpdatedAtKey = (userId: string | null) =>
  `${LOCAL_UPDATED_AT_PREFIX}:${userId || "guest"}`;

const normalizeState = (
  parsed: Partial<AppState> | null | undefined,
  defaultProfile: UserProfile,
  installYear: number,
): AppState => {
  const source = parsed || {};
  const savedMemberSince = source.userProfile?.memberSince;
  const memberSince =
    typeof savedMemberSince === "number"
      ? savedMemberSince === 2020
        ? installYear
        : savedMemberSince
      : installYear;

  return {
    bikes: (source.bikes || []).map((bike) => ({
      ...bike,
      initialKm: bike.initialKm ?? bike.currentKm,
    })),
    expenses: source.expenses || [],
    tasks: source.tasks || [],
    userProfile: {
      ...defaultProfile,
      ...(source.userProfile || {}),
      memberSince,
    },
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(source.notificationSettings || {}),
    },
    tutorialViewed: Boolean(source.tutorialViewed),
  };
};

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
  const installYear = getInstallYear();
  const defaultProfile: UserProfile = {
    name: "",
    photoUrl: DEFAULT_PROFILE_PHOTO,
    memberSince: installYear,
  };

  const createDefaultState = (): AppState =>
    normalizeState(null, defaultProfile, installYear);

  const [state, setState] = useState<AppState>(() => createDefaultState());

  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isCloudHydrating, setIsCloudHydrating] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    "idle" | "syncing" | "error"
  >("idle");
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const isApplyingRemoteState = useRef(false);

  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isTutorialWelcomeOpen, setIsTutorialWelcomeOpen] = useState(false);
  const [isTutorialWelcomeSkippable, setIsTutorialWelcomeSkippable] =
    useState(true);

  useEffect(() => {
    try {
      if (cloudUser) {
        localStorage.setItem(
          getStorageKey(cloudUser.id),
          JSON.stringify(state),
        );
        if (!isApplyingRemoteState.current) {
          localStorage.setItem(
            getUpdatedAtKey(cloudUser.id),
            String(Date.now()),
          );
        }
      }
    } catch (error) {
      console.error("Erro ao salvar dados no localStorage:", error);
    }
  }, [state, cloudUser]);

  const loadLocalStateForUser = (userId: string | null) => {
    const saved = localStorage.getItem(getStorageKey(userId));

    if (!saved) {
      return createDefaultState();
    }

    try {
      return normalizeState(
        JSON.parse(saved) as Partial<AppState>,
        defaultProfile,
        installYear,
      );
    } catch {
      return createDefaultState();
    }
  };

  const upsertCloudState = async (userId: string, appState: AppState) => {
    if (!supabase) return;

    const payload = {
      user_id: userId,
      data: appState,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(CLOUD_STATE_TABLE)
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw error;
    }
  };

  const pullCloudState = async (
    userId: string,
    localStateSnapshot: AppState = state,
  ) => {
    if (!supabase) return;

    setCloudSyncStatus("syncing");
    setCloudSyncError(null);

    const { data, error } = await supabase
      .from(CLOUD_STATE_TABLE)
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setCloudSyncStatus("error");
      setCloudSyncError(error.message);
      return;
    }

    const localUpdatedAt = Number(
      localStorage.getItem(getUpdatedAtKey(userId)),
    );
    const safeLocalUpdatedAt = Number.isFinite(localUpdatedAt)
      ? localUpdatedAt
      : 0;

    if (!data) {
      await upsertCloudState(userId, localStateSnapshot);
      setCloudSyncStatus("idle");
      return;
    }

    const remoteUpdatedAt = new Date(data.updated_at).getTime();
    const safeRemoteUpdatedAt = Number.isFinite(remoteUpdatedAt)
      ? remoteUpdatedAt
      : 0;
    const remoteState = normalizeState(
      data.data as Partial<AppState>,
      defaultProfile,
      installYear,
    );

    if (safeRemoteUpdatedAt > safeLocalUpdatedAt) {
      isApplyingRemoteState.current = true;
      setState(remoteState);
      localStorage.setItem(
        getUpdatedAtKey(userId),
        String(safeRemoteUpdatedAt),
      );
      queueMicrotask(() => {
        isApplyingRemoteState.current = false;
      });
      setCloudSyncStatus("idle");
      return;
    }

    if (safeLocalUpdatedAt > safeRemoteUpdatedAt) {
      await upsertCloudState(userId, localStateSnapshot);
    }

    setCloudSyncStatus("idle");
  };

  const syncNow = async () => {
    if (!supabase || !cloudUser) return;

    try {
      setCloudSyncStatus("syncing");
      setCloudSyncError(null);
      await upsertCloudState(cloudUser.id, state);
      setCloudSyncStatus("idle");
    } catch (error) {
      setCloudSyncStatus("error");
      setCloudSyncError(
        error instanceof Error ? error.message : "Falha ao sincronizar",
      );
    }
  };

  const signUpCloud = async (email: string, password: string) => {
    if (!supabase) return "Supabase não configurado.";
    const baseUrl = getAppBaseUrl();
    const redirectTo = baseUrl ? `${baseUrl}/auth` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });

    return error?.message || null;
  };

  const signInCloud = async (email: string, password: string) => {
    if (!supabase) return "Supabase não configurado.";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return error?.message || null;
  };

  const signOutCloud = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudUser(null);
    setState(createDefaultState());
    setCloudSyncStatus("idle");
    setCloudSyncError(null);
  };

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    let isMounted = true;

    const hydrateUserSession = async (nextUser: User | null) => {
      if (!isMounted) return;

      if (!nextUser) {
        setCloudUser(null);
        setIsCloudHydrating(false);
        setState(createDefaultState());
        setIsCloudReady(true);
        return;
      }

      setCloudUser(nextUser);
      setIsCloudReady(false);
      setIsCloudHydrating(true);

      const localState = loadLocalStateForUser(nextUser.id);
      setState(localState);

      try {
        await pullCloudState(nextUser.id, localState);
      } finally {
        if (isMounted) {
          setIsCloudHydrating(false);
          setIsCloudReady(true);
        }
      }
    };

    const bootstrap = async () => {
      const { data } = await client.auth.getUser();
      if (!isMounted) return;
      await hydrateUserSession(data.user || null);
    };

    bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      await hydrateUserSession(session?.user || null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !supabase ||
      !cloudUser ||
      !isCloudReady ||
      isCloudHydrating ||
      isApplyingRemoteState.current
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setCloudSyncStatus("syncing");
        setCloudSyncError(null);
        await upsertCloudState(cloudUser.id, state);
        setCloudSyncStatus("idle");
      } catch (error) {
        setCloudSyncStatus("error");
        setCloudSyncError(
          error instanceof Error ? error.message : "Falha ao sincronizar",
        );
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state, cloudUser]);

  const addBike = (bikeData: Omit<Bike, "id">) => {
    const newBike: Bike = {
      ...bikeData,
      id: generateId(),
      initialKm: bikeData.initialKm ?? bikeData.currentKm,
      isFavorite: bikeData.isFavorite ?? false,
    };
    setState((prev) => ({ ...prev, bikes: [...prev.bikes, newBike] }));
  };

  const updateBike = (bike: Bike) => {
    setState((prev) => {
      const existingBike = prev.bikes.find((b) => b.id === bike.id);
      const hasBikeExpenses = prev.expenses.some((e) => e.bikeId === bike.id);
      const persistedInitialKm =
        existingBike?.initialKm ?? existingBike?.currentKm ?? bike.currentKm;

      const nextBike: Bike = {
        ...bike,
        initialKm: hasBikeExpenses ? persistedInitialKm : bike.currentKm,
      };

      return {
        ...prev,
        bikes: prev.bikes.map((b) => (b.id === bike.id ? nextBike : b)),
      };
    });
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

  const syncBikeKmWithExpenses = (expenses: Expense[], bikes: Bike[]) => {
    const maxKmByBike = new Map<string, number>();

    expenses.forEach((expense) => {
      const currentMax = maxKmByBike.get(expense.bikeId) || 0;
      if (expense.km > currentMax) {
        maxKmByBike.set(expense.bikeId, expense.km);
      }
    });

    return bikes.map((bike) => {
      const expenseMaxKm = maxKmByBike.get(bike.id);
      const baseKm = bike.initialKm ?? bike.currentKm;

      // Sem atividades: volta para o KM base de cadastro.
      if (expenseMaxKm === undefined) {
        return bike.currentKm === baseKm
          ? { ...bike, initialKm: baseKm }
          : { ...bike, currentKm: baseKm, initialKm: baseKm };
      }

      // Com atividades: usa o maior KM registrado, sem descer abaixo do KM base.
      const nextKm = Math.max(baseKm, expenseMaxKm);
      return {
        ...bike,
        currentKm: nextKm,
        initialKm: baseKm,
      };
    });
  };

  const addExpense = (expenseData: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expenseData, id: generateId() };
    setState((prev) => {
      const nextExpenses = [...prev.expenses, newExpense];
      return {
        ...prev,
        expenses: nextExpenses,
        bikes: syncBikeKmWithExpenses(nextExpenses, prev.bikes),
      };
    });
  };

  const updateExpense = (expense: Expense) => {
    setState((prev) => {
      const nextExpenses = prev.expenses.map((item) =>
        item.id === expense.id ? expense : item,
      );
      return {
        ...prev,
        expenses: nextExpenses,
        bikes: syncBikeKmWithExpenses(nextExpenses, prev.bikes),
      };
    });
  };

  const deleteExpense = (id: string) => {
    setState((prev) => {
      const nextExpenses = prev.expenses.filter((item) => item.id !== id);
      return {
        ...prev,
        expenses: nextExpenses,
        bikes: syncBikeKmWithExpenses(nextExpenses, prev.bikes),
      };
    });
  };

  const addTask = (taskData: Omit<MaintenanceTask, "id">) => {
    const newTask: MaintenanceTask = { ...taskData, id: generateId() };
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

  const markTutorialViewed = () => {
    setState((prev) => ({
      ...prev,
      tutorialViewed: true,
    }));
    setIsTutorialWelcomeOpen(false);
    setIsTutorialActive(false);
    setIsTutorialWelcomeSkippable(true);
  };

  const startTutorial = (allowSkip = true) => {
    setIsTutorialWelcomeSkippable(allowSkip);
    setIsTutorialWelcomeOpen(true);
    setIsTutorialActive(false);
  };

  const beginTutorial = () => {
    setIsTutorialWelcomeOpen(false);
    setIsTutorialActive(true);
    setIsTutorialWelcomeSkippable(true);
  };

  const closeTutorialWelcome = () => {
    setIsTutorialWelcomeOpen(false);
    setIsTutorialActive(false);
    setIsTutorialWelcomeSkippable(true);
  };

  const isProfileComplete = state.userProfile.name.trim().length > 0;

  return (
    <AppContext.Provider
      value={{
        ...state,
        isProfileComplete,
        isTutorialActive,
        isTutorialWelcomeOpen,
        isTutorialWelcomeSkippable,
        isCloudReady,
        isCloudConfigured: isSupabaseConfigured,
        isCloudAuthenticated: Boolean(cloudUser),
        cloudUserEmail: cloudUser?.email ?? null,
        cloudSyncStatus,
        cloudSyncError,
        addBike,
        updateBike,
        toggleFavoriteBike,
        deleteBike,
        addExpense,
        updateExpense,
        deleteExpense,
        addTask,
        toggleTask,
        updateUserProfile,
        updateNotificationSettings,
        markTutorialViewed,
        startTutorial,
        beginTutorial,
        closeTutorialWelcome,
        signUpCloud,
        signInCloud,
        signOutCloud,
        syncNow,
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
