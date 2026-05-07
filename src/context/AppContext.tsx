import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

import type {
  Bike,
  Expense,
  RecurringSubscription,
  MaintenanceTask,
  AppState,
  AppSyncMeta,
  SyncCollectionsMeta,
  UserProfile,
  NotificationSettings,
} from "../types";
import {
  supabase,
  isSupabaseConfigured,
  getAppBaseUrl,
  getAuthRedirectUrl,
} from "../lib/supabase";
import {
  getMissingRecurringExpenses,
  getRecurringExpenseAlerts,
  shouldSendRecurringNotification,
} from "../lib/recurringExpenses";
import { syncMobileNotifications } from "../lib/mobileNotifications";

interface AppContextType extends AppState {
  isProfileComplete: boolean;
  isTutorialActive: boolean;
  isTutorialWelcomeOpen: boolean;
  isTutorialWelcomeSkippable: boolean;
  isCloudReady: boolean;
  isCloudConfigured: boolean;
  isCloudAuthenticated: boolean;
  cloudUserEmail: string | null;
  cloudBootProgress: number;
  cloudBootStatus: string;
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
  addSubscription: (subscription: Omit<RecurringSubscription, "id">) => void;
  updateSubscription: (subscription: RecurringSubscription) => void;
  deleteSubscription: (id: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  markTutorialViewed: () => void;
  startTutorial: (allowSkip?: boolean) => void;
  beginTutorial: () => void;
  closeTutorialWelcome: () => void;
  signUpCloud: (email: string, password: string) => Promise<string | null>;
  signInCloud: (email: string, password: string) => Promise<string | null>;
  signInDev: (password: string) => Promise<string | null>;
  signOutCloud: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "motocontrol_data";
const LOCAL_UPDATED_AT_PREFIX = "motocontrol_local_updated_at";
const INSTALL_YEAR_KEY = "ridecontrol_install_year";
const DEV_SESSION_KEY = "ridecontrol_dev_session";
const DEV_SESSION_ID = "dev-account";
const DEV_SESSION_PASSWORD =
  (import.meta.env.VITE_DEV_SESSION_PASSWORD as string | undefined) || "";
const DEV_SESSION_EMAIL =
  (import.meta.env.VITE_DEV_ACCOUNT_EMAIL as string | undefined) ||
  "dev@ridecontrol.local";
const DEV_SESSION_NAME =
  (import.meta.env.VITE_DEV_ACCOUNT_NAME as string | undefined) ||
  "Conta de dev";
const CLOUD_STATE_TABLE = "app_state";
const CLOUD_REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_PROFILE_PHOTO = "/icons/perfil.png";
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  taskDueSoonEnabled: true,
  daysBefore: 3,
  recurringExpenseDueSoonEnabled: true,
};

type SyncCollectionKey = keyof SyncCollectionsMeta;

type DevSession = {
  id: string;
  email: string;
  name: string;
};

const getStorageKey = (userId: string | null) =>
  `${STORAGE_KEY_PREFIX}:${userId || "guest"}`;

const getUpdatedAtKey = (userId: string | null) =>
  `${LOCAL_UPDATED_AT_PREFIX}:${userId || "guest"}`;

const getDevSession = (): DevSession | null => {
  try {
    const raw = localStorage.getItem(DEV_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DevSession>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      id: typeof parsed.id === "string" ? parsed.id : DEV_SESSION_ID,
      email:
        typeof parsed.email === "string" && parsed.email.trim()
          ? parsed.email.trim()
          : DEV_SESSION_EMAIL,
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim()
          : DEV_SESSION_NAME,
    };
  } catch {
    return null;
  }
};

const persistDevSession = (session: DevSession) => {
  localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session));
};

const clearDevSession = () => {
  localStorage.removeItem(DEV_SESSION_KEY);
};

const clearAppLocalStorage = () => {
  const keysToRemove: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    if (key.startsWith("motocontrol_") || key.startsWith("ridecontrol_")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
};

const nowTs = () => Date.now();

const sanitizeTimestamp = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return fallback;
};

const createEmptyCollectionsMeta = (): SyncCollectionsMeta => ({
  bikes: {},
  expenses: {},
  tasks: {},
  subscriptions: {},
});

const createDefaultSyncMeta = (timestamp: number): AppSyncMeta => ({
  items: createEmptyCollectionsMeta(),
  deleted: createEmptyCollectionsMeta(),
  userProfileUpdatedAt: timestamp,
  notificationSettingsUpdatedAt: timestamp,
  tutorialViewedUpdatedAt: timestamp,
});

const cloneSyncMeta = (syncMeta: AppSyncMeta): AppSyncMeta => ({
  items: {
    bikes: { ...syncMeta.items.bikes },
    expenses: { ...syncMeta.items.expenses },
    tasks: { ...syncMeta.items.tasks },
    subscriptions: { ...syncMeta.items.subscriptions },
  },
  deleted: {
    bikes: { ...syncMeta.deleted.bikes },
    expenses: { ...syncMeta.deleted.expenses },
    tasks: { ...syncMeta.deleted.tasks },
    subscriptions: { ...syncMeta.deleted.subscriptions },
  },
  userProfileUpdatedAt: syncMeta.userProfileUpdatedAt,
  notificationSettingsUpdatedAt: syncMeta.notificationSettingsUpdatedAt,
  tutorialViewedUpdatedAt: syncMeta.tutorialViewedUpdatedAt,
});

const sanitizeRecordTimestamps = (
  record: Record<string, unknown> | undefined,
  fallback: number,
) => {
  const safeRecord: Record<string, number> = {};
  Object.entries(record || {}).forEach(([id, value]) => {
    safeRecord[id] = sanitizeTimestamp(value, fallback);
  });
  return safeRecord;
};

const buildCollectionSyncMap = <T extends { id: string }>(
  items: T[],
  rawMap: Record<string, unknown> | undefined,
  fallback: number,
) => {
  const safeRecord = sanitizeRecordTimestamps(rawMap, fallback);
  const output: Record<string, number> = {};

  items.forEach((item) => {
    output[item.id] = safeRecord[item.id] ?? fallback;
  });

  return output;
};

const touchCollectionItem = (
  syncMeta: AppSyncMeta,
  collection: SyncCollectionKey,
  id: string,
  timestamp: number,
) => {
  syncMeta.items[collection][id] = timestamp;
  delete syncMeta.deleted[collection][id];
};

const markCollectionDeleted = (
  syncMeta: AppSyncMeta,
  collection: SyncCollectionKey,
  id: string,
  timestamp: number,
) => {
  delete syncMeta.items[collection][id];
  syncMeta.deleted[collection][id] = timestamp;
};

const getCollectionTimestamp = (
  syncMeta: AppSyncMeta,
  collection: SyncCollectionKey,
  id: string,
  fallback: number,
) => syncMeta.items[collection][id] ?? fallback;

const normalizeSyncMeta = (
  source: Partial<AppSyncMeta> | undefined,
  bikes: Bike[],
  expenses: Expense[],
  tasks: MaintenanceTask[],
  subscriptions: RecurringSubscription[],
  fallback: number,
): AppSyncMeta => {
  const fallbackSync = createDefaultSyncMeta(fallback);

  return {
    items: {
      bikes: buildCollectionSyncMap(
        bikes,
        source?.items?.bikes as Record<string, unknown> | undefined,
        fallback,
      ),
      expenses: buildCollectionSyncMap(
        expenses,
        source?.items?.expenses as Record<string, unknown> | undefined,
        fallback,
      ),
      tasks: buildCollectionSyncMap(
        tasks,
        source?.items?.tasks as Record<string, unknown> | undefined,
        fallback,
      ),
      subscriptions: buildCollectionSyncMap(
        subscriptions,
        source?.items?.subscriptions as Record<string, unknown> | undefined,
        fallback,
      ),
    },
    deleted: {
      bikes: sanitizeRecordTimestamps(
        source?.deleted?.bikes as Record<string, unknown> | undefined,
        fallback,
      ),
      expenses: sanitizeRecordTimestamps(
        source?.deleted?.expenses as Record<string, unknown> | undefined,
        fallback,
      ),
      tasks: sanitizeRecordTimestamps(
        source?.deleted?.tasks as Record<string, unknown> | undefined,
        fallback,
      ),
      subscriptions: sanitizeRecordTimestamps(
        source?.deleted?.subscriptions as Record<string, unknown> | undefined,
        fallback,
      ),
    },
    userProfileUpdatedAt: sanitizeTimestamp(
      source?.userProfileUpdatedAt,
      fallbackSync.userProfileUpdatedAt,
    ),
    notificationSettingsUpdatedAt: sanitizeTimestamp(
      source?.notificationSettingsUpdatedAt,
      fallbackSync.notificationSettingsUpdatedAt,
    ),
    tutorialViewedUpdatedAt: sanitizeTimestamp(
      source?.tutorialViewedUpdatedAt,
      fallbackSync.tutorialViewedUpdatedAt,
    ),
  };
};

const mergeCollectionByTimestamp = <T extends { id: string }>(
  localItems: T[],
  remoteItems: T[],
  localSyncMeta: AppSyncMeta,
  remoteSyncMeta: AppSyncMeta,
  collection: SyncCollectionKey,
  localBaseTs: number,
  remoteBaseTs: number,
) => {
  const localMap = new Map(localItems.map((item) => [item.id, item]));
  const remoteMap = new Map(remoteItems.map((item) => [item.id, item]));

  const idSet = new Set<string>([
    ...localMap.keys(),
    ...remoteMap.keys(),
    ...Object.keys(localSyncMeta.deleted[collection]),
    ...Object.keys(remoteSyncMeta.deleted[collection]),
  ]);

  const mergedItems: T[] = [];
  const mergedItemsMeta: Record<string, number> = {};
  const mergedDeletedMeta: Record<string, number> = {};

  idSet.forEach((id) => {
    const localItem = localMap.get(id);
    const remoteItem = remoteMap.get(id);
    const localItemTs = localItem
      ? getCollectionTimestamp(localSyncMeta, collection, id, localBaseTs)
      : -1;
    const remoteItemTs = remoteItem
      ? getCollectionTimestamp(remoteSyncMeta, collection, id, remoteBaseTs)
      : -1;
    const localDeletedTs = localSyncMeta.deleted[collection][id] ?? -1;
    const remoteDeletedTs = remoteSyncMeta.deleted[collection][id] ?? -1;

    const latestTs = Math.max(
      localItemTs,
      remoteItemTs,
      localDeletedTs,
      remoteDeletedTs,
    );

    if (latestTs < 0) {
      return;
    }

    if (latestTs === localDeletedTs || latestTs === remoteDeletedTs) {
      mergedDeletedMeta[id] = latestTs;
      return;
    }

    const pickRemote = remoteItemTs >= localItemTs;
    const chosenItem =
      (pickRemote ? remoteItem : localItem) || remoteItem || localItem;

    if (!chosenItem) {
      return;
    }

    mergedItems.push(chosenItem);
    mergedItemsMeta[id] = latestTs;
  });

  return {
    items: mergedItems,
    itemsMeta: mergedItemsMeta,
    deletedMeta: mergedDeletedMeta,
  };
};

const normalizeState = (
  parsed: Partial<AppState> | null | undefined,
  defaultProfile: UserProfile,
  installYear: number,
  fallbackTimestamp: number,
): AppState => {
  const source = parsed || {};
  const savedMemberSince = source.userProfile?.memberSince;
  const memberSince =
    typeof savedMemberSince === "number"
      ? savedMemberSince === 2020
        ? installYear
        : savedMemberSince
      : installYear;

  const bikes = (source.bikes || []).map((bike) => ({
    ...bike,
    initialKm: bike.initialKm ?? bike.currentKm,
  }));
  const expenses = (source.expenses || []).map((expense) => ({
    ...expense,
    status: expense.status ?? "Pago",
  }));
  const tasks = source.tasks || [];
  const subscriptions = (source.subscriptions || []).map((subscription) => ({
    ...subscription,
    active: subscription.active ?? true,
  }));

  return {
    bikes,
    expenses,
    tasks,
    subscriptions,
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
    syncMeta: normalizeSyncMeta(
      source.syncMeta,
      bikes,
      expenses,
      tasks,
      subscriptions,
      fallbackTimestamp,
    ),
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

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timer: number | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error("Tempo limite excedido ao comunicar com a nuvem."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
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
    normalizeState(null, defaultProfile, installYear, nowTs());

  const [state, setState] = useState<AppState>(() => createDefaultState());

  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [devSession, setDevSession] = useState<DevSession | null>(null);
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isCloudHydrating, setIsCloudHydrating] = useState(false);
  const [cloudBootProgress, setCloudBootProgress] = useState(0);
  const [cloudBootStatus, setCloudBootStatus] = useState("Inicializando");
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
      const activeUserId = cloudUser?.id ?? devSession?.id ?? null;

      if (activeUserId) {
        localStorage.setItem(
          getStorageKey(activeUserId),
          JSON.stringify(state),
        );
        if (!isApplyingRemoteState.current) {
          localStorage.setItem(
            getUpdatedAtKey(activeUserId),
            String(Date.now()),
          );
        }
      }
    } catch (error) {
      console.error("Erro ao salvar dados no localStorage:", error);
    }
  }, [state, cloudUser, devSession]);

  const setBootStep = (progress: number, status: string) => {
    setCloudBootProgress((prev) => Math.max(prev, progress));
    setCloudBootStatus(status);
  };

  const getMutableSyncMeta = (appState: AppState, timestamp: number) =>
    cloneSyncMeta(appState.syncMeta || createDefaultSyncMeta(timestamp));

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
        nowTs(),
      );
    } catch {
      return createDefaultState();
    }
  };

  const activateDevSession = () => {
    const session: DevSession = {
      id: DEV_SESSION_ID,
      email: DEV_SESSION_EMAIL,
      name: DEV_SESSION_NAME,
    };

    persistDevSession(session);
    setDevSession(session);
    setCloudUser(null);
    setState(loadLocalStateForUser(session.id));
    setIsCloudReady(true);
    setIsCloudHydrating(false);
    setCloudSyncStatus("idle");
    setCloudSyncError(null);
    setCloudBootProgress(100);
    setCloudBootStatus("Conta de dev ativa");
  };

  const upsertCloudState = async (userId: string, appState: AppState) => {
    if (!supabase) return;

    const payload = {
      user_id: userId,
      data: appState,
      updated_at: new Date().toISOString(),
    };

    const { error } = await withTimeout(
      Promise.resolve(
        supabase
          .from(CLOUD_STATE_TABLE)
          .upsert(payload, { onConflict: "user_id" }),
      ),
      CLOUD_REQUEST_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }
  };

  const mergeAppStates = (
    localState: AppState,
    remoteState: AppState,
    localBaseTs: number,
    remoteBaseTs: number,
  ) => {
    const localSyncMeta =
      localState.syncMeta || createDefaultSyncMeta(localBaseTs);
    const remoteSyncMeta =
      remoteState.syncMeta || createDefaultSyncMeta(remoteBaseTs);

    const mergedBikes = mergeCollectionByTimestamp(
      localState.bikes,
      remoteState.bikes,
      localSyncMeta,
      remoteSyncMeta,
      "bikes",
      localBaseTs,
      remoteBaseTs,
    );

    const mergedExpenses = mergeCollectionByTimestamp(
      localState.expenses,
      remoteState.expenses,
      localSyncMeta,
      remoteSyncMeta,
      "expenses",
      localBaseTs,
      remoteBaseTs,
    );

    const mergedTasks = mergeCollectionByTimestamp(
      localState.tasks,
      remoteState.tasks,
      localSyncMeta,
      remoteSyncMeta,
      "tasks",
      localBaseTs,
      remoteBaseTs,
    );

    const mergedSubscriptions = mergeCollectionByTimestamp(
      localState.subscriptions,
      remoteState.subscriptions,
      localSyncMeta,
      remoteSyncMeta,
      "subscriptions",
      localBaseTs,
      remoteBaseTs,
    );

    const useRemoteProfile =
      remoteSyncMeta.userProfileUpdatedAt >= localSyncMeta.userProfileUpdatedAt;
    const useRemoteNotifications =
      remoteSyncMeta.notificationSettingsUpdatedAt >=
      localSyncMeta.notificationSettingsUpdatedAt;
    const useRemoteTutorial =
      remoteSyncMeta.tutorialViewedUpdatedAt >=
      localSyncMeta.tutorialViewedUpdatedAt;

    return normalizeState(
      {
        bikes: mergedBikes.items,
        expenses: mergedExpenses.items,
        tasks: mergedTasks.items,
        subscriptions: mergedSubscriptions.items,
        userProfile: useRemoteProfile
          ? remoteState.userProfile
          : localState.userProfile,
        notificationSettings: useRemoteNotifications
          ? remoteState.notificationSettings
          : localState.notificationSettings,
        tutorialViewed: useRemoteTutorial
          ? remoteState.tutorialViewed
          : localState.tutorialViewed,
        syncMeta: {
          items: {
            bikes: mergedBikes.itemsMeta,
            expenses: mergedExpenses.itemsMeta,
            tasks: mergedTasks.itemsMeta,
            subscriptions: mergedSubscriptions.itemsMeta,
          },
          deleted: {
            bikes: {
              ...localSyncMeta.deleted.bikes,
              ...remoteSyncMeta.deleted.bikes,
              ...mergedBikes.deletedMeta,
            },
            expenses: {
              ...localSyncMeta.deleted.expenses,
              ...remoteSyncMeta.deleted.expenses,
              ...mergedExpenses.deletedMeta,
            },
            tasks: {
              ...localSyncMeta.deleted.tasks,
              ...remoteSyncMeta.deleted.tasks,
              ...mergedTasks.deletedMeta,
            },
            subscriptions: {
              ...localSyncMeta.deleted.subscriptions,
              ...remoteSyncMeta.deleted.subscriptions,
              ...mergedSubscriptions.deletedMeta,
            },
          },
          userProfileUpdatedAt: Math.max(
            localSyncMeta.userProfileUpdatedAt,
            remoteSyncMeta.userProfileUpdatedAt,
          ),
          notificationSettingsUpdatedAt: Math.max(
            localSyncMeta.notificationSettingsUpdatedAt,
            remoteSyncMeta.notificationSettingsUpdatedAt,
          ),
          tutorialViewedUpdatedAt: Math.max(
            localSyncMeta.tutorialViewedUpdatedAt,
            remoteSyncMeta.tutorialViewedUpdatedAt,
          ),
        },
      },
      defaultProfile,
      installYear,
      Math.max(localBaseTs, remoteBaseTs, nowTs()),
    );
  };

  const pullCloudState = async (
    userId: string,
    localStateSnapshot: AppState = state,
  ) => {
    if (!supabase) return;

    setCloudSyncStatus("syncing");
    setCloudSyncError(null);

    const localUpdatedAt = Number(
      localStorage.getItem(getUpdatedAtKey(userId)),
    );
    const safeLocalUpdatedAt = Number.isFinite(localUpdatedAt)
      ? localUpdatedAt
      : nowTs();

    let data: { data: Partial<AppState>; updated_at: string } | null = null;
    let error: { message: string } | null = null;

    try {
      const response = await withTimeout(
        Promise.resolve(
          supabase
            .from(CLOUD_STATE_TABLE)
            .select("data, updated_at")
            .eq("user_id", userId)
            .maybeSingle(),
        ),
        CLOUD_REQUEST_TIMEOUT_MS,
      );

      data = response.data as {
        data: Partial<AppState>;
        updated_at: string;
      } | null;
      error = response.error as { message: string } | null;
    } catch (pullError) {
      setCloudSyncStatus("error");
      setCloudSyncError(
        pullError instanceof Error
          ? pullError.message
          : "Falha ao ler dados da nuvem",
      );
      return;
    }

    if (error) {
      setCloudSyncStatus("error");
      setCloudSyncError(error.message);
      return;
    }

    const normalizedLocal = normalizeState(
      localStateSnapshot,
      defaultProfile,
      installYear,
      safeLocalUpdatedAt,
    );

    if (!data) {
      await upsertCloudState(userId, normalizedLocal);
      localStorage.setItem(getUpdatedAtKey(userId), String(nowTs()));
      setCloudSyncStatus("idle");
      return;
    }

    const remoteUpdatedAt = new Date(data.updated_at).getTime();
    const safeRemoteUpdatedAt = Number.isFinite(remoteUpdatedAt)
      ? remoteUpdatedAt
      : nowTs();

    const remoteState = normalizeState(
      data.data as Partial<AppState>,
      defaultProfile,
      installYear,
      safeRemoteUpdatedAt,
    );

    const mergedState = mergeAppStates(
      normalizedLocal,
      remoteState,
      safeLocalUpdatedAt,
      safeRemoteUpdatedAt,
    );

    isApplyingRemoteState.current = true;
    setState(mergedState);
    localStorage.setItem(
      getUpdatedAtKey(userId),
      String(Math.max(safeLocalUpdatedAt, safeRemoteUpdatedAt, nowTs())),
    );
    queueMicrotask(() => {
      isApplyingRemoteState.current = false;
    });

    const mergedPayload = JSON.stringify(mergedState);
    const remotePayload = JSON.stringify(remoteState);

    if (mergedPayload !== remotePayload) {
      await upsertCloudState(userId, mergedState);
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

  useEffect(() => {
    if (!isCloudReady || isCloudHydrating) {
      return;
    }

    const now = new Date();

    setState((prev) => {
      const missingRecurringExpenses = getMissingRecurringExpenses(prev, now);

      if (missingRecurringExpenses.length === 0) {
        return prev;
      }

      const timestamp = nowTs();
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      const nextExpenses = [...prev.expenses];

      missingRecurringExpenses.forEach((expense) => {
        const newExpense = {
          ...expense,
          id: generateId(),
          status: "Pendente" as ExpenseStatus,
        };

        touchCollectionItem(syncMeta, "expenses", newExpense.id, timestamp);
        nextExpenses.push(newExpense);
      });

      return {
        ...prev,
        expenses: nextExpenses,
        syncMeta,
      };
    });
  }, [
    isCloudReady,
    isCloudHydrating,
    state.subscriptions,
    state.expenses,
    state.bikes,
  ]);

  useEffect(() => {
    if (!isCloudReady || isCloudHydrating) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      return;
    }

    const alerts = getRecurringExpenseAlerts(state, new Date());
    if (alerts.length === 0 || typeof Notification === "undefined") {
      return;
    }

    const activeUserId = cloudUser?.id ?? devSession?.id ?? "guest";

    alerts.forEach((alert) => {
      if (!shouldSendRecurringNotification(alert, new Date())) {
        return;
      }

      const monthKey = getRecurringMonthKey(
        new Date(alert.expense.dueDate || alert.expense.date),
      );
      const notificationKey = `${activeUserId}:${alert.subscription.id}:${monthKey}`;

      if (localStorage.getItem(notificationKey) === "1") {
        return;
      }

      try {
        new Notification("Gasto recorrente próximo do vencimento", {
          body: `${alert.subscription.name} vence em menos de 24h na moto ${
            state.bikes.find((bike) => bike.id === alert.subscription.motoId)
              ?.name || "selecionada"
          }.`,
        });
        localStorage.setItem(notificationKey, "1");
      } catch {
        // Ignore notification failures when permission is granted but delivery is not available.
      }
    });
  }, [isCloudReady, isCloudHydrating, cloudUser?.id, devSession?.id, state]);

  useEffect(() => {
    if (!isCloudReady || isCloudHydrating) {
      return;
    }

    const timer = window.setTimeout(() => {
      void syncMobileNotifications(
        {
          bikes: state.bikes,
          expenses: state.expenses,
          tasks: state.tasks,
          subscriptions: state.subscriptions,
          notificationSettings: state.notificationSettings,
        },
        new Date(),
      );
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isCloudReady,
    isCloudHydrating,
    state.bikes,
    state.expenses,
    state.tasks,
    state.subscriptions,
    state.notificationSettings,
  ]);

  const signUpCloud = async (email: string, password: string) => {
    if (!supabase) return "Supabase não configurado.";
    try {
      const redirectTo = getAuthRedirectUrl() || undefined;
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
          },
        }),
        18000,
      );

      return error?.message || null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Falha ao criar conta. Tente novamente.";
    }
  };

  const signInCloud = async (email: string, password: string) => {
    if (devSession) {
      return "A conta de dev está ativa. Saia dela antes de usar login real.";
    }

    if (!supabase) return "Supabase não configurado.";
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        18000,
      );

      return error?.message || null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Falha ao entrar. Tente novamente.";
    }
  };

  const signInDev = async (password: string) => {
    if (!import.meta.env.DEV) {
      return "A conta de dev não está disponível nesta build.";
    }

    if (password !== DEV_SESSION_PASSWORD) {
      return "Senha inválida para a conta de dev.";
    }

    activateDevSession();
    return null;
  };

  const signOutCloud = async () => {
    if (devSession) {
      clearDevSession();
      setDevSession(null);
      setCloudUser(null);
      setState(createDefaultState());
      setCloudSyncStatus("idle");
      setCloudSyncError(null);
      setCloudBootProgress(100);
      setCloudBootStatus("Concluído");
      return;
    }

    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudUser(null);
    setState(createDefaultState());
    setCloudSyncStatus("idle");
    setCloudSyncError(null);
  };

  const deleteAccount = async () => {
    try {
      setCloudSyncStatus("syncing");
      setCloudSyncError(null);

      if (devSession) {
        clearDevSession();
      } else if (supabase && cloudUser) {
        const { data: sessionData } = await withTimeout(
          supabase.auth.getSession(),
          6000,
        );
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Sessão inválida para exclusão de conta.");
        }

        const deleteAccountUrl = `${getAppBaseUrl()}/api/delete-account`;

        const response = await withTimeout(
          fetch(deleteAccountUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ userId: cloudUser.id }),
          }),
          CLOUD_REQUEST_TIMEOUT_MS,
        );

        if (!response.ok) {
          let message = "Falha ao excluir conta.";

          try {
            const payload = (await response.json()) as { error?: string };
            if (typeof payload.error === "string" && payload.error.trim()) {
              message = payload.error.trim();
            }
          } catch {
            // Keep the default message.
          }

          throw new Error(message);
        }

        await supabase.auth.signOut();
      }

      clearAppLocalStorage();
      setDevSession(null);
      setCloudUser(null);
      setState(createDefaultState());
      setIsCloudHydrating(false);
      setIsCloudReady(true);
      setCloudSyncStatus("idle");
      setCloudSyncError(null);
      setCloudBootProgress(100);
      setCloudBootStatus("Concluído");

      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao excluir conta.";
      setCloudSyncStatus("error");
      setCloudSyncError(message);
      return message;
    }
  };

  useEffect(() => {
    const storedDevSession = getDevSession();
    if (storedDevSession) {
      setDevSession(storedDevSession);
      setCloudUser(null);
      setState(loadLocalStateForUser(storedDevSession.id));
      setIsCloudReady(true);
      setIsCloudHydrating(false);
      setCloudBootProgress(100);
      setCloudBootStatus("Conta de dev ativa");
      return;
    }

    if (!supabase) {
      setIsCloudReady(true);
      setIsCloudHydrating(false);
      setCloudBootProgress(100);
      setCloudBootStatus("Concluído");
      return;
    }
    const client = supabase;

    let isMounted = true;

    const hydrateUserSession = async (nextUser: User | null) => {
      if (!isMounted) return;

      setBootStep(15, "Verificando sessão");

      if (!nextUser) {
        setDevSession(null);
        setCloudUser(null);
        setIsCloudHydrating(false);
        setState(createDefaultState());
        setIsCloudReady(true);
        setCloudBootProgress(100);
        setCloudBootStatus("Concluído");
        return;
      }

      setDevSession(null);
      setCloudUser(nextUser);
      setIsCloudReady(false);
      setIsCloudHydrating(true);
      setBootStep(35, "Sessão encontrada");

      const localState = loadLocalStateForUser(nextUser.id);
      setBootStep(55, "Carregando dados locais");
      setState(localState);

      try {
        setBootStep(75, "Sincronizando com a nuvem");
        await pullCloudState(nextUser.id, localState);
      } finally {
        if (isMounted) {
          setIsCloudHydrating(false);
          setIsCloudReady(true);
          setCloudBootProgress(100);
          setCloudBootStatus("Concluído");
        }
      }
    };

    const bootstrap = async () => {
      try {
        const { data } = await withTimeout(client.auth.getSession(), 6000);
        if (!isMounted) return;
        await hydrateUserSession(data.session?.user || null);
      } catch (error) {
        console.error("Erro ao inicializar sessão na nuvem:", error);
        if (isMounted) {
          setDevSession(null);
          setCloudUser(null);
          setIsCloudHydrating(false);
          setState(createDefaultState());
          setIsCloudReady(true);
          setCloudBootProgress(100);
          setCloudBootStatus("Modo offline local");
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void hydrateUserSession(session?.user || null);
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
    const timestamp = nowTs();
    const newBike: Bike = {
      ...bikeData,
      id: generateId(),
      initialKm: bikeData.initialKm ?? bikeData.currentKm,
      isFavorite: bikeData.isFavorite ?? false,
    };

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(syncMeta, "bikes", newBike.id, timestamp);

      return {
        ...prev,
        bikes: [...prev.bikes, newBike],
        syncMeta,
      };
    });
  };

  const updateBike = (bike: Bike) => {
    const timestamp = nowTs();

    setState((prev) => {
      const existingBike = prev.bikes.find((b) => b.id === bike.id);
      const hasBikeExpenses = prev.expenses.some((e) => e.bikeId === bike.id);
      const persistedInitialKm =
        existingBike?.initialKm ?? existingBike?.currentKm ?? bike.currentKm;

      const nextBike: Bike = {
        ...bike,
        initialKm: hasBikeExpenses ? persistedInitialKm : bike.currentKm,
      };

      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(syncMeta, "bikes", bike.id, timestamp);

      return {
        ...prev,
        bikes: prev.bikes.map((b) => (b.id === bike.id ? nextBike : b)),
        syncMeta,
      };
    });
  };

  const toggleFavoriteBike = (id: string) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(syncMeta, "bikes", id, timestamp);

      return {
        ...prev,
        bikes: prev.bikes.map((bike) =>
          bike.id === id ? { ...bike, isFavorite: !bike.isFavorite } : bike,
        ),
        syncMeta,
      };
    });
  };

  const deleteBike = (id: string) => {
    const timestamp = nowTs();

    setState((prev) => {
      const removedExpenseIds = prev.expenses
        .filter((expense) => expense.bikeId === id)
        .map((expense) => expense.id);
      const removedTaskIds = prev.tasks
        .filter((task) => task.bikeId === id)
        .map((task) => task.id);
      const removedSubscriptionIds = prev.subscriptions
        .filter((subscription) => subscription.motoId === id)
        .map((subscription) => subscription.id);

      const syncMeta = getMutableSyncMeta(prev, timestamp);
      markCollectionDeleted(syncMeta, "bikes", id, timestamp);
      removedExpenseIds.forEach((expenseId) => {
        markCollectionDeleted(syncMeta, "expenses", expenseId, timestamp);
      });
      removedTaskIds.forEach((taskId) => {
        markCollectionDeleted(syncMeta, "tasks", taskId, timestamp);
      });
      removedSubscriptionIds.forEach((subscriptionId) => {
        markCollectionDeleted(
          syncMeta,
          "subscriptions",
          subscriptionId,
          timestamp,
        );
      });

      return {
        ...prev,
        bikes: prev.bikes.filter((b) => b.id !== id),
        expenses: prev.expenses.filter((e) => e.bikeId !== id),
        tasks: prev.tasks.filter((t) => t.bikeId !== id),
        subscriptions: prev.subscriptions.filter(
          (subscription) => subscription.motoId !== id,
        ),
        syncMeta,
      };
    });
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

      if (expenseMaxKm === undefined) {
        return bike.currentKm === baseKm
          ? { ...bike, initialKm: baseKm }
          : { ...bike, currentKm: baseKm, initialKm: baseKm };
      }

      const nextKm = Math.max(baseKm, expenseMaxKm);
      return {
        ...bike,
        currentKm: nextKm,
        initialKm: baseKm,
      };
    });
  };

  const addExpense = (expenseData: Omit<Expense, "id">) => {
    const timestamp = nowTs();
    const newExpense: Expense = {
      ...expenseData,
      id: generateId(),
      status: expenseData.status ?? "Pago",
    };

    setState((prev) => {
      const nextExpenses = [...prev.expenses, newExpense];
      const nextBikes = syncBikeKmWithExpenses(nextExpenses, prev.bikes);
      const syncMeta = getMutableSyncMeta(prev, timestamp);

      touchCollectionItem(syncMeta, "expenses", newExpense.id, timestamp);
      nextBikes.forEach((bike) => {
        if (
          bike.currentKm !==
          (prev.bikes.find((b) => b.id === bike.id)?.currentKm ??
            bike.currentKm)
        ) {
          touchCollectionItem(syncMeta, "bikes", bike.id, timestamp);
        }
      });

      return {
        ...prev,
        expenses: nextExpenses,
        bikes: nextBikes,
        syncMeta,
      };
    });
  };

  const updateExpense = (expense: Expense) => {
    const timestamp = nowTs();

    setState((prev) => {
      const nextExpenses = prev.expenses.map((item) =>
        item.id === expense.id ? expense : item,
      );
      const nextBikes = syncBikeKmWithExpenses(nextExpenses, prev.bikes);
      const syncMeta = getMutableSyncMeta(prev, timestamp);

      touchCollectionItem(syncMeta, "expenses", expense.id, timestamp);
      nextBikes.forEach((bike) => {
        if (
          bike.currentKm !==
          (prev.bikes.find((b) => b.id === bike.id)?.currentKm ??
            bike.currentKm)
        ) {
          touchCollectionItem(syncMeta, "bikes", bike.id, timestamp);
        }
      });

      return {
        ...prev,
        expenses: nextExpenses,
        bikes: nextBikes,
        syncMeta,
      };
    });
  };

  const deleteExpense = (id: string) => {
    const timestamp = nowTs();

    setState((prev) => {
      const nextExpenses = prev.expenses.filter((item) => item.id !== id);
      const nextBikes = syncBikeKmWithExpenses(nextExpenses, prev.bikes);
      const syncMeta = getMutableSyncMeta(prev, timestamp);

      markCollectionDeleted(syncMeta, "expenses", id, timestamp);
      nextBikes.forEach((bike) => {
        if (
          bike.currentKm !==
          (prev.bikes.find((b) => b.id === bike.id)?.currentKm ??
            bike.currentKm)
        ) {
          touchCollectionItem(syncMeta, "bikes", bike.id, timestamp);
        }
      });

      return {
        ...prev,
        expenses: nextExpenses,
        bikes: nextBikes,
        syncMeta,
      };
    });
  };

  const addTask = (taskData: Omit<MaintenanceTask, "id">) => {
    const timestamp = nowTs();
    const newTask: MaintenanceTask = { ...taskData, id: generateId() };

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(syncMeta, "tasks", newTask.id, timestamp);

      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
        syncMeta,
      };
    });
  };

  const addSubscription = (
    subscriptionData: Omit<RecurringSubscription, "id">,
  ) => {
    const timestamp = nowTs();
    const newSubscription: RecurringSubscription = {
      ...subscriptionData,
      id: generateId(),
      active: subscriptionData.active ?? true,
    };

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(
        syncMeta,
        "subscriptions",
        newSubscription.id,
        timestamp,
      );

      return {
        ...prev,
        subscriptions: [...prev.subscriptions, newSubscription],
        syncMeta,
      };
    });
  };

  const updateSubscription = (subscription: RecurringSubscription) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(
        syncMeta,
        "subscriptions",
        subscription.id,
        timestamp,
      );

      return {
        ...prev,
        subscriptions: prev.subscriptions.map((item) =>
          item.id === subscription.id ? subscription : item,
        ),
        syncMeta,
      };
    });
  };

  const deleteSubscription = (id: string) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      markCollectionDeleted(syncMeta, "subscriptions", id, timestamp);

      return {
        ...prev,
        subscriptions: prev.subscriptions.filter((item) => item.id !== id),
        syncMeta,
      };
    });
  };

  const toggleTask = (id: string) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      touchCollectionItem(syncMeta, "tasks", id, timestamp);

      return {
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
        syncMeta,
      };
    });
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      syncMeta.userProfileUpdatedAt = timestamp;

      return {
        ...prev,
        userProfile: {
          ...prev.userProfile,
          ...profile,
        },
        syncMeta,
      };
    });
  };

  const updateNotificationSettings = (
    settings: Partial<NotificationSettings>,
  ) => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      syncMeta.notificationSettingsUpdatedAt = timestamp;

      return {
        ...prev,
        notificationSettings: {
          ...prev.notificationSettings,
          ...settings,
        },
        syncMeta,
      };
    });
  };

  const markTutorialViewed = () => {
    const timestamp = nowTs();

    setState((prev) => {
      const syncMeta = getMutableSyncMeta(prev, timestamp);
      syncMeta.tutorialViewedUpdatedAt = timestamp;

      return {
        ...prev,
        tutorialViewed: true,
        syncMeta,
      };
    });

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

  const isProfileComplete =
    state.userProfile.name.trim().length > 0 &&
    state.userProfile.photoUrl.trim().length > 0 &&
    state.userProfile.photoUrl !== DEFAULT_PROFILE_PHOTO;
  const activeUserEmail = cloudUser?.email ?? devSession?.email ?? null;
  const isAuthenticated = Boolean(cloudUser || devSession);

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
        isCloudAuthenticated: isAuthenticated,
        cloudUserEmail: activeUserEmail,
        cloudBootProgress,
        cloudBootStatus,
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
        addSubscription,
        updateSubscription,
        deleteSubscription,
        updateUserProfile,
        updateNotificationSettings,
        markTutorialViewed,
        startTutorial,
        beginTutorial,
        closeTutorialWelcome,
        signUpCloud,
        signInCloud,
        signInDev,
        signOutCloud,
        deleteAccount,
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
