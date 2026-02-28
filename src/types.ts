
export type Role = "admin" | "manager";
export type SaleType = "office" | "delivery";
export type PaymentType = "cash" | "installment" | "hybrid" | "booking";
export type DeliveryStatusCode =
  | "reserved"
  | "ready"
  | "on_way"
  | "picked_up"
  | "delivered"
  | "canceled";
export type ThemeMode = "light" | "dark";
export type CollectionName =
  | "sales"
  | "products"
  | "managers"
  | "branches"
  | "bonuses"
  | "bonusTargets"
  | "suppliers"
  | "expenses";

export interface UserData {
  id?: string;
  name: string;
  role: Role;
  theme?: ThemeMode;
}

export interface BaseEntity {
  id: string;
  timestamp?: Date;
  createdAt?: any;
}

export interface Product extends BaseEntity {
  name: string;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  managerEarnings?: number;
}

export interface Manager extends BaseEntity {
  name:string;
  password?: string;
  role?: Role;
  theme?: ThemeMode;
}

export interface Branch extends BaseEntity {
  name: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  contacts?: string;
}

export interface Bonus extends BaseEntity {
  managerId?: string;
  managerName: string;
  amount: number;
  reason: string;
  addedBy?: string;
}

export interface BonusTarget extends BaseEntity {
  type: "global" | "personal";
  managerId?: string;
  amount: number;
  reward: number;
  deadline?: Date;
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
  product: string;
  supplierSnapshot?: string;
  costPriceSnapshot: number;
  price: number;
  quantity: number;
  total: number;
  branch: string;
  paymentType: PaymentType;
  installmentMonths?: number;
  managerEarnings: number;
  potentialEarnings?: number;
  baseManagerEarnings?: number;
  deliveryStatus: DeliveryStatusCode;
  saleType: SaleType;
  managerId?: string;
  manager: string;
  bookingDeadline?: Date | null;
  bookingDeposit?: number | null;
  manualDate?: Date | null;
  updatedBy?: string;
}
