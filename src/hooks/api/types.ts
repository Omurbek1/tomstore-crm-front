export type Role = "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";
export type ThemeMode = "light" | "dark";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product extends BaseEntity {
  name: string;
  category: string;
  categories?: string[];
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  photoUrl?: string;
  photoUrls?: string[] | null;
  characteristics?: string;
  managerEarnings?: number;
  stockQty?: number;
  isCombo?: boolean;
  comboItems?: { productId: string; quantity: number }[] | null;
}

export interface ProductCategory extends BaseEntity {
  name: string;
}

export interface Manager extends BaseEntity {
  login?: string;
  name: string;
  phone?: string;
  address?: string;
  branchId?: string;
  branchName?: string;
  birthYear?: number;
  birthDate?: string;
  photoUrl?: string;
  role: Role;
  roles?: Role[];
  salaryType?: "commission" | "fixed";
  fixedMonthlySalary?: number;
  canManageProducts?: boolean;
  theme?: ThemeMode;
  deleted?: boolean;
}

export interface Branch extends BaseEntity {
  name: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  contacts?: string;
  address?: string;
}

export interface Bonus extends BaseEntity {
  managerId?: string;
  managerName: string;
  amount: number;
  reason: string;
}

export interface BonusTarget extends BaseEntity {
  type: "global" | "personal";
  managerId?: string;
  amount: number;
  reward: number;
  deadline?: string;
  rewardType?: "money" | "material";
  rewardText?: string;
}

export interface Expense extends BaseEntity {
  amount: number;
  category: string;
  comment?: string;
  managerId?: string;
  managerName?: string;
}

export interface Sale extends BaseEntity {
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  productId: string;
  productName: string;
  supplierSnapshot?: string;
  costPriceSnapshot: number;
  price: number;
  quantity: number;
  total: number;
  branch: string;
  paymentType: "cash" | "installment" | "hybrid" | "booking" | "manual";
  installmentMonths?: number;
  managerEarnings: number;
  deliveryStatus:
    | "reserved"
    | "ready"
    | "on_way"
    | "picked_up"
    | "delivered"
    | "canceled";
  saleType: "office" | "delivery";
  managerId?: string;
  managerName: string;
  bookingDeadline?: string | null;
  bookingDeposit?: number | null;
  bookingBuyout?: number | null;
  manualDate?: string | null;
  updatedBy?: string;
  deliveryCost?: number;
}

export interface AuthResponse {
  accessToken: string;
  user: Manager;
}

export interface ManagerPayoutBalance {
  managerId: string;
  earned: number;
  bonuses: number;
  advances: number;
  available: number;
  maxPayable: number;
  debt: number;
}

export interface AppSettings extends BaseEntity {
  companyName: string;
  companyLogoUrl?: string;
}
