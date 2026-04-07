export type ExpenseCategory =
  | "Combustivel"
  | "Manutencao"
  | "Pecas"
  | "Equipamentos"
  | "Outros";

export interface Expense {
  id: string;
  bikeId: string;
  type: ExpenseCategory;
  date: string;
  amount: number;
  km: number;
  liters?: number;
  notes?: string;
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
}

export interface AppState {
  bikes: Bike[];
  expenses: Expense[];
  tasks: MaintenanceTask[];
  userProfile: UserProfile;
  notificationSettings: NotificationSettings;
}
