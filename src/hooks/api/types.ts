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
  branchName?: string;
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
  managedBranchIds?: string[];
  managedBranchNames?: string[];
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
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
}

export interface Client extends BaseEntity {
  fullName: string;
  phone?: string;
  birthDate?: string;
  discountPercent: number;
  birthdayDiscountPercent: number;
  level?: "silver" | "gold" | "vip";
  totalSpent?: number;
  cashbackRatePercent?: number;
  cashbackBalance?: number;
  cashbackExpiryDays?: number;
  cashbackExpiresAt?: string | null;
  bonusesBlocked?: boolean;
  referralCode?: string;
  referredByClientId?: string;
  note?: string;
  isActive: boolean;
}

export interface ClientLoyaltyTransaction extends BaseEntity {
  clientId: string;
  type: "cashback_accrual" | "cashback_spend" | "cashback_expire" | "referral_bonus" | "manual_adjust";
  amount: number;
  expiresAt?: string | null;
  saleId?: string;
  note?: string;
}

export interface ClientPromotion extends BaseEntity {
  clientId?: string;
  title: string;
  description?: string;
  discountPercent: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface ClientSmsLog extends BaseEntity {
  clientId: string;
  phone: string;
  message: string;
  status: "queued" | "sent" | "failed";
  error?: string;
}

export interface ClientHistory {
  client: Client;
  sales: Sale[];
  loyalty: ClientLoyaltyTransaction[];
  sms: ClientSmsLog[];
  promotions: ClientPromotion[];
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
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  comment?: string;
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
  deliveryPaidByCompany?: boolean;
  loyaltyDiscountPercent?: number;
  cashbackUsed?: number;
  cashbackAccrued?: number;
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
  managerExpenses?: number;
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
  attachmentUrls?: string[];
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

export interface MarketingKpiAlert {
  id: string;
  level: "critical" | "warning" | "success" | "info";
  title: string;
  description: string;
  managerId?: string;
  managerName?: string;
}

export interface MarketingKpiPerformerControl {
  managerId: string;
  managerName: string;
  managerRole?: string;
  kpiScore: number;
  erPercent: number;
  planCompletion: number;
  checklistCompletion: number;
  salaryTotal: number;
  status: "risk" | "stable" | "strong";
  nextAction: string;
}

export interface MarketingKpiInsights {
  month: string;
  prevMonth: string;
  healthScore: number;
  totals: {
    records: number;
    avgKpi: number;
    avgEr: number;
    planCompletion: number;
    checklistCompletion: number;
    totalSalary: number;
    riskCount: number;
    strongCount: number;
  };
  trend: {
    kpiDelta: number;
    erDelta: number;
    planCompletionDelta: number;
    salaryDeltaPercent: number;
  };
  alerts: MarketingKpiAlert[];
  performerControl: MarketingKpiPerformerControl[];
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

export interface AiOrderDraftRequest {
  text: string;
  locale?: string;
  branches?: string[];
  products?: Array<{ id?: string; name?: string; price?: number }>;
  managers?: Array<{ id?: string; name?: string; role?: string }>;
  manualPaymentTypes?: string[];
}

export interface AiOrderDraftResult {
  source: "llm";
  draft: {
    clientName?: string;
    clientPhone?: string;
    clientAddress?: string;
    branchName?: string;
    productName?: string;
    quantity?: number;
    price?: number;
    saleType?: "office" | "delivery";
    paymentType?: "cash" | "installment" | "hybrid" | "booking" | "manual";
    paymentLabel?: string;
    installmentMonths?: number;
    deliveryCost?: number;
    clientPaysDelivery?: boolean;
    bookingDeposit?: number;
    bookingBuyout?: number;
    managerName?: string;
    comment?: string;
  };
}
