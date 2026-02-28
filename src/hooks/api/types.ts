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
  barcode?: string;
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
  startDate?: string;
  deadline?: string;
  rewardType?: "money" | "material";
  rewardText?: string;
  rewardIssued?: boolean;
  rewardIssuedAt?: string | null;
  rewardApprovedBy?: string | null;
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
  shiftId?: string;
  paymentType: "cash" | "installment" | "hybrid" | "booking" | "manual";
  paymentLabel?: string;
  hybridCash?: number;
  hybridCard?: number;
  hybridTransfer?: number;
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

export interface CashShift extends BaseEntity {
  cashierId: string;
  cashierName: string;
  branchName?: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string | null;
  openingCash: number;
  closingCash?: number | null;
  expectedCash?: number | null;
  difference?: number | null;
  debtBefore?: number | null;
  shortageAmount?: number | null;
  overageAmount?: number | null;
  debtAfter?: number | null;
  noteOpen?: string;
  noteClose?: string;
}

export interface CashShiftReport {
  shift: CashShift;
  totals: {
    totalOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    manualRevenue: number;
    installmentRevenue: number;
    hybridRevenue: number;
    bookingRevenue: number;
  };
  expectedCash: number;
  shortageAmount?: number;
  overageAmount?: number;
  debtBefore?: number;
  debtAfter?: number;
  sales: Sale[];
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
  manualPaymentTypes?: string[];
}

export type RepairStatus =
  | "received"
  | "to_service"
  | "diagnostic"
  | "ready"
  | "returned"
  | "canceled";

export interface RepairEvent extends BaseEntity {
  ticketId: string;
  text: string;
  author: string;
  status?: RepairStatus;
}

export interface RepairTicket extends BaseEntity {
  clientName: string;
  clientPhone?: string;
  itemName: string;
  serialNumber?: string;
  issue: string;
  branchName?: string;
  status: RepairStatus;
  messages?: RepairEvent[];
}

export interface PaginatedRepairs {
  items: RepairTicket[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "canceled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeRole?: string;
  createdById?: string;
  createdByName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string | null;
  completedAt?: string | null;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MarketingKpi extends BaseEntity {
  managerId: string;
  managerName: string;
  managerRole?: string;
  branchName?: string;
  month: string; // YYYY-MM
  planMode: "week" | "month";
  periodStart?: string | null;
  periodEnd?: string | null;
  plannedPosts: number;
  plannedReels: number;
  publishedPosts: number;
  publishedReels: number;
  planItems?: Array<{
    id: string;
    date: string; // YYYY-MM-DD
    type: "post" | "reels" | "story" | "other";
    title?: string;
    done: boolean;
  }>;
  reach: number;
  engagements: number;
  followersGrowth: number;
  erPercent: number;
  kpiScore: number;
  salaryBase: number;
  salaryBonus: number;
  salaryTotal: number;
  note?: string;
}

export interface PaginatedMarketingKpi {
  items: MarketingKpi[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AiAnalyzeRequest {
  domain: "sales" | "marketing";
  locale?: string;
  metrics?: Record<string, unknown>;
}

export interface AiAnalyzeResult {
  source: "llm";
  summary: string;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface AiTasksDraftRequest {
  text: string;
  locale?: string;
  assignees?: Array<{ id: string; name: string; role?: string }>;
}

export interface AiTasksDraftItem {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeRole?: string;
  priority: TaskPriority;
  deadline?: string | null;
}

export interface AiTasksDraftResult {
  source: "llm";
  tasks: AiTasksDraftItem[];
}

export interface AiMarketingPlanDraftRequest {
  text: string;
  locale?: string;
  month?: string;
  assignees?: Array<{ id: string; name: string; role?: string }>;
}

export interface AiMarketingPlanDraftResult {
  source: "llm";
  draft: {
    managerId?: string;
    managerName?: string;
    managerRole?: string;
    month: string;
    planMode: "week" | "month";
    periodStart?: string | null;
    periodEnd?: string | null;
    plannedPosts: number;
    plannedReels: number;
    publishedPosts: number;
    publishedReels: number;
    reach: number;
    engagements: number;
    followersGrowth: number;
    salaryBase: number;
    note?: string;
    planItems: Array<{
      id: string;
      date: string;
      type: "post" | "reels" | "story" | "other";
      title?: string;
      done: boolean;
    }>;
  };
}

export interface AiMaterialsHelpRequest {
  question: string;
  locale?: string;
  audience?: "manager" | "marketing" | "smm" | "general";
  history?: Array<{
    question?: string;
    answer?: string;
    createdAt?: string;
  }>;
  materials?: Array<{
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    folderName?: string;
  }>;
}

export interface AiMaterialsHelpResult {
  source: "llm";
  answer: string;
  recommendedMaterials: Array<{
    id?: string;
    title: string;
    reason?: string;
    url?: string;
  }>;
}
