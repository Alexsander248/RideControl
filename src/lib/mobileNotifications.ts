import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import type { AppState } from "../types";
import { parseLocalDate } from "./date";

const NOTIFICATION_HOUR = 9;
const NOTIFICATION_MINUTE = 0;
const IMMEDIATE_DELAY_MS = 60 * 1000;
const REENGAGEMENT_DELAY_MS = 24 * 60 * 60 * 1000;
const REENGAGEMENT_NOTIFICATION_PREFIX = "reengagement";

const REENGAGEMENT_MESSAGES = [
  {
    title: "RideControl quer te lembrar",
    body: "Abasteceu? Adicione nos seus gastos para manter tudo em dia.",
  },
  {
    title: "Seu controle está te esperando",
    body: "Fez alguma despesa com a moto? Registre agora antes de esquecer.",
  },
  {
    title: "Hora de atualizar a moto",
    body: "Manteve a moto em dia? Lance abastecimento, manutenção e gastos no RideControl.",
  },
  {
    title: "Volta rapidinha ao app",
    body: "Anote seus gastos de hoje e mantenha o histórico da moto completo.",
  },
];

export type MobileNotificationPermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

export type MobileNotificationState = Pick<
  AppState,
  "bikes" | "expenses" | "tasks" | "subscriptions" | "notificationSettings"
>;

const isNativeNotificationsSupported = () => Capacitor.isNativePlatform();

const buildNotificationTime = (date: Date) => {
  const next = new Date(date);
  next.setHours(NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);
  return next;
};

const getImmediateFallbackTime = (referenceDate: Date) =>
  new Date(referenceDate.getTime() + IMMEDIATE_DELAY_MS);

const createStableNotificationId = (seed: string) => {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
};

const pickReengagementMessage = (scope: string, referenceDate: Date) => {
  const bucket = Math.floor(referenceDate.getTime() / REENGAGEMENT_DELAY_MS);
  const seed = `${REENGAGEMENT_NOTIFICATION_PREFIX}:${scope}:${bucket}`;
  const index = createStableNotificationId(seed) % REENGAGEMENT_MESSAGES.length;

  return REENGAGEMENT_MESSAGES[index];
};

const getReengagementNotificationId = (scope: string) =>
  createStableNotificationId(`${REENGAGEMENT_NOTIFICATION_PREFIX}:${scope}`);

const normalizeNotificationPermission = (
  permission: string | undefined,
): MobileNotificationPermission => {
  if (!isNativeNotificationsSupported()) {
    return "unsupported";
  }

  if (permission === "granted" || permission === "denied") {
    return permission;
  }

  return "prompt";
};

export const checkMobileNotificationPermission =
  async (): Promise<MobileNotificationPermission> => {
    if (!isNativeNotificationsSupported()) {
      return "unsupported";
    }

    const permission = await LocalNotifications.checkPermissions();
    return normalizeNotificationPermission(permission.display);
  };

export const requestMobileNotificationPermission =
  async (): Promise<MobileNotificationPermission> => {
    if (!isNativeNotificationsSupported()) {
      return "unsupported";
    }

    const permission = await LocalNotifications.requestPermissions();
    return normalizeNotificationPermission(permission.display);
  };

export const syncMobileNotifications = async (
  state: MobileNotificationState,
  referenceDate = new Date(),
) => {
  if (!isNativeNotificationsSupported()) {
    return { scheduled: 0, permission: "unsupported" as const };
  }

  const permission = await checkMobileNotificationPermission();
  if (permission !== "granted") {
    return { scheduled: 0, permission };
  }

  const pendingNotifications = await LocalNotifications.getPending();
  if (pendingNotifications.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pendingNotifications.notifications.map((notification) => ({
        id: notification.id,
      })),
    });
  }
  await LocalNotifications.removeAllDeliveredNotifications();

  const notifications: Parameters<
    typeof LocalNotifications.schedule
  >[0]["notifications"] = [];
  const referenceTs = referenceDate.getTime();

  const bikeNameById = new Map(state.bikes.map((bike) => [bike.id, bike.name]));

  if (state.notificationSettings.taskDueSoonEnabled) {
    state.tasks
      .filter((task) => !task.completed && task.dueDate)
      .forEach((task) => {
        const dueDate = parseLocalDate(task.dueDate as string);
        const dueTs = dueDate.getTime();

        if (dueTs < referenceTs) {
          return;
        }

        const reminderAt = buildNotificationTime(new Date(dueDate));
        reminderAt.setDate(
          reminderAt.getDate() - state.notificationSettings.daysBefore,
        );

        const scheduledAt =
          reminderAt.getTime() > referenceTs
            ? reminderAt
            : getImmediateFallbackTime(referenceDate);

        notifications.push({
          id: createStableNotificationId(`task:${task.id}`),
          title: "Lembrete de manutenção",
          body: `${task.title} vence em ${
            state.notificationSettings.daysBefore
          } dia(s) na moto ${bikeNameById.get(task.bikeId) || "selecionada"}.`,
          schedule: { at: scheduledAt },
        });
      });
  }

  if (state.notificationSettings.recurringExpenseDueSoonEnabled) {
    state.expenses
      .filter(
        (expense) =>
          expense.subscriptionId &&
          expense.status === "Pendente" &&
          typeof expense.dueDate === "string",
      )
      .forEach((expense) => {
        const dueDate = parseLocalDate(expense.dueDate as string);
        const dueTs = dueDate.getTime();

        if (dueTs < referenceTs) {
          return;
        }

        const reminderAt = buildNotificationTime(new Date(dueDate));
        reminderAt.setDate(reminderAt.getDate() - 1);

        const scheduledAt =
          reminderAt.getTime() > referenceTs
            ? reminderAt
            : getImmediateFallbackTime(referenceDate);

        notifications.push({
          id: createStableNotificationId(`recurring:${expense.id}`),
          title: "Gasto recorrente amanhã",
          body: `${expense.notes || "Gasto recorrente"} vence amanhã na moto ${
            bikeNameById.get(expense.bikeId) || "selecionada"
          }.`,
          schedule: { at: scheduledAt },
        });
      });
  }

  if (notifications.length === 0) {
    return { scheduled: 0, permission };
  }

  await LocalNotifications.schedule({ notifications });
  return { scheduled: notifications.length, permission };
};

export const syncReengagementReminder = async (
  scope: string,
  referenceDate = new Date(),
) => {
  if (!isNativeNotificationsSupported()) {
    return { scheduled: 0, permission: "unsupported" as const };
  }

  const permission = await checkMobileNotificationPermission();
  if (permission !== "granted") {
    return { scheduled: 0, permission };
  }

  const reminderId = getReengagementNotificationId(scope);
  const reminderAt = new Date(referenceDate.getTime() + REENGAGEMENT_DELAY_MS);
  const message = pickReengagementMessage(scope, referenceDate);

  try {
    await LocalNotifications.cancel({ notifications: [{ id: reminderId }] });
  } catch {
    // Ignore cancellation issues and overwrite with a fresh schedule.
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminderId,
        title: message.title,
        body: message.body,
        schedule: { at: reminderAt },
      },
    ],
  });

  return { scheduled: 1, permission };
};

export const clearReengagementReminder = async (scope: string) => {
  if (!isNativeNotificationsSupported()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: getReengagementNotificationId(scope) }],
    });
  } catch {
    // Ignore cancellation failures.
  }
};
