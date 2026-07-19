export type ExpenseCategory =
  | "Combustivel"
  | "Manutencao"
  | "Pecas"
  | "Equipamentos"
  | "Outros";

export type ExpenseStatus = "Pendente" | "Pago";

export interface RecurringSubscription {
  id: string;
  motoId: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  active: boolean;
}

export interface Expense {
  id: string;
  bikeId: string;
  type: ExpenseCategory;
  date: string;
  amount: number;
  km: number;
  liters?: number;
  fullTank?: boolean;
  notes?: string;
  receiptImageUrl?: string;
  status?: ExpenseStatus;
  subscriptionId?: string;
  dueDate?: string;
}

export type Priority = "ALTA" | "MEDIA" | "BAIXA";

export interface MaintenanceTask {
  id: string;
  bikeId: string;
  title: string;
  targetKm: number;
  dueDate?: string;
  priority: Priority;
  completed: boolean;
  completedDate?: string;
  completedKm?: number;
}

export interface Bike {
  id: string;
  name: string;
  model: string;
  year: number;
  initialKm?: number;
  currentKm: number;
  photoUrl?: string;
  purchasePrice?: number;
  isFavorite?: boolean;
}

export interface UserProfile {
  name: string;
  photoUrl: string;
  memberSince: number;
}

export interface NotificationSettings {
  taskDueSoonEnabled: boolean;
  daysBefore: number;
  recurringExpenseDueSoonEnabled: boolean;
}

export interface SyncCollectionsMeta {
  bikes: Record<string, number>;
  expenses: Record<string, number>;
  tasks: Record<string, number>;
  subscriptions: Record<string, number>;
}

export interface AppSyncMeta {
  items: SyncCollectionsMeta;
  deleted: SyncCollectionsMeta;
  userProfileUpdatedAt: number;
  notificationSettingsUpdatedAt: number;
  tutorialViewedUpdatedAt: number;
}

export interface AppState {
  bikes: Bike[];
  expenses: Expense[];
  tasks: MaintenanceTask[];
  subscriptions: RecurringSubscription[];
  userProfile: UserProfile;
  notificationSettings: NotificationSettings;
  tutorialViewed: boolean;
  syncMeta?: AppSyncMeta;
}
