import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import type { AppState } from "../types";
import { parseLocalDate } from "./date";

const NOTIFICATION_HOUR = 9;
const NOTIFICATION_MINUTE = 0;
const IMMEDIATE_DELAY_MS = 60 * 1000;

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

  await LocalNotifications.removeAllPendingNotifications();
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
