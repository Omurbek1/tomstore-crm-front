import React, { useState, useEffect, useMemo } from "react";
import { create } from "zustand";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Layout,
  Menu,
  Button,
  Table,
  Tag,
  Statistic,
  Card,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Typography,
  Avatar,
  Badge,
  Progress,
  Timeline,
  Radio,
  Tooltip,
  Divider,
  ConfigProvider,
  theme,
} from "antd";
import {
  UserOutlined,
  DownloadOutlined,
  ShoppingCartOutlined,
  DashboardOutlined,
  TeamOutlined,
  WalletOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  ShopOutlined,
  KeyOutlined,
  SolutionOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ru";
import { api, API_BASE_URL } from "./api/httpClient";
import { queryClient } from "./api/queryClient";
import { toSafeMediaUrl } from "./security/url";
import { formatBirthDate, formatDate, formatPhone } from "./shared/lib/format";
import { isValidKgPhone, normalizeKgPhone } from "./shared/lib/phone";
import { isDirectVideoFile, toVideoEmbedUrl } from "./shared/lib/media";
import {
  formatMovementQty,
  getAvailableStock,
  resolveOperationType,
} from "./shared/lib/inventory";
import { INVENTORY_OPERATION_META } from "./shared/constants/inventory";
import { DELIVERY_STATUSES } from "./shared/constants/sales";
import {
  EXPENSE_CATEGORIES,
  PRODUCT_CATEGORIES,
} from "./shared/constants/catalog";
import { AppHeader } from "./shared/ui/AppHeader";
import {
  type PaginatedMaterials,
  type TrainingMaterial,
  type TrainingMaterialFolder,
} from "./entities/material/model/types";
import { useMaterialsFilters } from "./features/materials-list/model/useMaterialsFilters";
import { MaterialsPanel } from "./features/materials-list/ui/MaterialsPanel";
import { useSalesFilters } from "./features/sales-list/model/useSalesFilters";
import { SalesTable } from "./features/sales-list/ui/SalesTable";
import { WarehousePanel } from "./features/warehouse/ui/WarehousePanel";
import type { InventoryMovement } from "./features/warehouse/model/hooks";
import { ProductModal } from "./features/products-list/ui/ProductModal";
import { CreateProductModal } from "./features/products-list/ui/CreateProductModal";
import { ManagersSection } from "./features/managers-list/ui/ManagersSection";
import { FinanceSection } from "./features/finance/ui/FinanceSection";
import { SettingsSection } from "./features/settings/ui/SettingsSection";
import { FinanceAccrualModal } from "./features/finance/ui/FinanceAccrualModal";
import { BranchCreateModal } from "./features/branches/ui/BranchCreateModal";
import { BranchesSection } from "./features/branches/ui/BranchesSection";
import { useBranchDetailsData } from "./features/branches/model/useBranchDetailsData";
import { ProfileModal } from "./features/profile/ui/ProfileModal";
import { ManagerModal } from "./features/managers-list/ui/ManagerModal";
import { SupplierModal } from "./features/suppliers/ui/SupplierModal";
import { SuppliersSection } from "./features/suppliers/ui/SuppliersSection";
import { TargetModal } from "./features/targets/ui/TargetModal";
import { MaterialModal } from "./features/materials-list/ui/MaterialModal";
import { MaterialFolderModal } from "./features/materials-list/ui/MaterialFolderModal";
import { MaterialPreviewModal } from "./features/materials-list/ui/MaterialPreviewModal";
import { BranchDetailsModal } from "./features/branches/ui/BranchDetailsModal";
import { EmployeeDetailsModal } from "./features/managers-list/ui/EmployeeDetailsModal";
import { SalaryHistoryModal } from "./features/managers-list/ui/SalaryHistoryModal";
import { MapAddressPickerModal } from "./features/suppliers/ui/MapAddressPickerModal";
import { ExpenseForm } from "./features/expenses/ui/ExpenseForm";
import { SaleForm } from "./features/sales-form/ui/SaleForm";

dayjs.locale("ru");

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// --- TYPES ---

type Role = "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";
type SaleType = "office" | "delivery";
type PaymentType = "cash" | "installment" | "hybrid" | "booking" | "manual";
type DeliveryStatusCode =
  | "reserved"
  | "ready"
  | "on_way"
  | "picked_up"
  | "delivered"
  | "canceled";
type ThemeMode = "light" | "dark";

interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface Product extends BaseEntity {
  name: string;
  category: string;
  categories?: string[] | null;
  branchName?: string;
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

interface ProductCategory extends BaseEntity {
  name: string;
}

interface Manager extends BaseEntity {
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

interface Branch extends BaseEntity {
  name: string;
}

interface Supplier extends BaseEntity {
  name: string;
  contacts?: string;
  address?: string;
}

interface Bonus extends BaseEntity {
  managerId?: string;
  managerName: string;
  amount: number;
  reason: string;
  addedBy?: string;
}

interface BonusTarget extends BaseEntity {
  type: "global" | "personal";
  managerId?: string;
  amount: number;
  reward: number;
  rewardType?: "money" | "material";
  rewardText?: string | null;
  deadline?: string;
  rewardIssued?: boolean;
  rewardIssuedAt?: string | null;
  rewardApprovedBy?: string | null;
}

interface Expense extends BaseEntity {
  amount: number;
  category: string;
  comment?: string;
  managerId?: string;
  managerName?: string;
}

interface Sale extends BaseEntity {
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
  discount?: number;
  branch: string;
  paymentType: PaymentType;
  paymentLabel?: string;
  hybridCash?: number;
  hybridCard?: number;
  hybridTransfer?: number;
  installmentMonths?: number;
  managerEarnings: number;
  potentialEarnings?: number;
  baseManagerEarnings?: number;
  deliveryStatus: DeliveryStatusCode;
  saleType: SaleType;
  managerId?: string;
  managerName: string;
  bookingDeadline?: string | null;
  bookingDeposit?: number | null;
  bookingBuyout?: number | null;
  manualDate?: string | null;
  updatedBy?: string;
  deliveryCost?: number;
}

interface AuthResponse {
  accessToken: string;
  user: Manager;
}

interface ManagerPayoutBalance {
  managerId: string;
  earned: number;
  bonuses: number;
  advances: number;
  available: number;
  maxPayable: number;
  debt: number;
}

interface AppSettings extends BaseEntity {
  companyName: string;
  companyLogoUrl?: string;
}

// --- CONSTANTS ---
const nowIso = () => new Date().toISOString();

// --- ZUSTAND STORE (UI STATE) ---
interface AppStore {
  user: Manager | null;
  appTheme: ThemeMode;
  setUser: (user: Manager | null) => void;
  setAppTheme: (mode: ThemeMode) => void;
  logout: () => void;
}

const useAppStore = create<AppStore>((set) => ({
  user: JSON.parse(localStorage.getItem("tomstore_user") || "null"),
  appTheme: (localStorage.getItem("tomstore_theme") as ThemeMode) || "light",

  setUser: (user) => {
    if (user) localStorage.setItem("tomstore_user", JSON.stringify(user));
    else localStorage.removeItem("tomstore_user");
    set({ user });
  },

  setAppTheme: (mode) => {
    localStorage.setItem("tomstore_theme", mode);
    set({ appTheme: mode });
    const body = document.body;
    const html = document.documentElement;
    if (mode === "dark") {
      html.classList.add("dark");
      body.classList.add("bg-gray-900");
      body.style.backgroundColor = "#141414";
    } else {
      html.classList.remove("dark");
      body.classList.remove("bg-gray-900");
      body.style.backgroundColor = "#f5f5f5";
    }
  },

  logout: () => {
    localStorage.removeItem("tomstore_user");
    localStorage.removeItem("token");
    set({ user: null });
  },
}));

// --- HOOKS ---

// 1. Auth Hooks
const useLogin = () => {
  const { setUser, setAppTheme } = useAppStore();
  return useMutation({
    mutationFn: async (credentials: { login: string; password: string }) => {
      const { data } = await api.post<AuthResponse>("/auth/login", credentials);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.accessToken);
      setUser(data.user);
      if (data.user.theme) setAppTheme(data.user.theme);
      message.success(`Добро пожаловать, ${data.user.name}!`);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || "Ошибка входа");
    },
  });
};

const useUpdateProfile = () => {
  const { user, setUser } = useAppStore();
  return useMutation({
    mutationFn: async (data: Partial<Manager>) => {
      const { data: updated } = await api.patch(`/users/${user?.id}`, data);
      return updated as Manager;
    },
    onSuccess: (data) => {
      setUser(data);
      message.success("Профиль обновлен");
    },
  });
};

// 2. Sales Hooks
const useSales = () => {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await api.get<Sale[]>("/sales");
      return data;
    },
  });
};

const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Partial<Sale>) => {
      const { data } = await api.post("/sales", sale);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      message.success("Продажа создана");
    },
  });
};

const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sale> }) => {
      const { data: updated } = await api.patch(`/sales/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа обновлена");
    },
  });
};

const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа удалена");
    },
  });
};

// 3. Products Hooks
const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get<Product[]>("/products");
      return data;
    },
  });
};

const useProductCategories = () => {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await api.get<ProductCategory[]>("/products/categories");
      return data;
    },
  });
};

const useCreateProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Название категории обязательно");
      const { data } = await api.post<ProductCategory>("/products/categories", {
        name: trimmed,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      message.success("Категория добавлена");
    },
    onError: (error: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Ошибка добавления категории",
      );
    },
  });
};

const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      await api.post("/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      message.success("Товар добавлен");
    },
  });
};

const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { file: File; branchName?: string }) => {
      const formData = new FormData();
      formData.append("file", params.file);
      if (params.branchName) formData.append("branchName", params.branchName);
      const { data } = await api.post<{
        totalRows: number;
        created: number;
        skipped: number;
        errors: string[];
      }>("/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      const base = `Импорт завершен: добавлено ${result.created}, пропущено ${result.skipped}`;
      if (result.errors?.length) {
        message.warning(`${base}. Ошибок: ${result.errors.length}`);
      } else {
        message.success(base);
      }
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(
        error.response?.data?.message || error.message || "Ошибка импорта товаров",
      );
    },
  });
};

const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Product>;
    }) => {
      const { data: updated } = await api.patch<Product>(
        `/products/${id}`,
        data,
      );
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      message.success("Товар обновлен");
    },
  });
};

// 4. Managers Hooks
const useManagers = () => {
  return useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const { data } = await api.get<Manager[]>("/users");
      return data.filter((m) => !m.deleted);
    },
  });
};

const useManagersPayoutMeta = (managerIds: string[]) => {
  const stableIds = useMemo(
    () => [...managerIds].filter(Boolean).sort(),
    [managerIds],
  );

  return useQuery({
    queryKey: ["manager-payout-meta", stableIds.join(",")],
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        stableIds.map(async (id) => {
          const { data } = await api.get<ManagerPayoutBalance>(
            `/users/${id}/payout-balance`,
          );
          return data;
        }),
      );
      return results.reduce<Record<string, ManagerPayoutBalance>>(
        (acc, item) => {
          acc[item.managerId] = item;
          return acc;
        },
        {},
      );
    },
  });
};

const useDeletedManagers = () => {
  return useQuery({
    queryKey: ["deleted-managers"],
    queryFn: async () => {
      const { data } = await api.get<Manager[]>("/users/deleted");
      return data.filter((m) => m.role !== "admin");
    },
  });
};

const useCreateManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Manager>) => {
      const { data: created } = await api.post<Manager>("/auth/register", data);
      return created;
    },
    onSuccess: (created) => {
      if (created) {
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => [
          created,
          ...prev.filter((m) => m.id !== created.id),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      message.success("Сотрудник добавлен");
    },
    onError: (error: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Не удалось добавить сотрудника",
      );
    },
  });
};

const useUpdateManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Manager>;
    }) => {
      const { data: updated } = await api.patch<Manager>(`/users/${id}`, data);
      return updated;
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      message.success("Сотрудник обновлен");
    },
    onError: (error: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Не удалось обновить сотрудника",
      );
    },
  });
};

const useDeleteManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: (_data, id) => {
      let removedManager: Manager | undefined;
      queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => {
        removedManager = prev.find((m) => m.id === id);
        return prev.filter((m) => m.id !== id);
      });
      if (removedManager) {
        const deletedSnapshot: Manager = {
          ...removedManager,
          deleted: true,
          updatedAt: nowIso(),
        };
        queryClient.setQueryData<Manager[]>(
          ["deleted-managers"],
          (prev = []) => [deletedSnapshot, ...prev.filter((m) => m.id !== id)],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-managers"] });
      message.success("Сотрудник удален");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || "Не удалось удалить сотрудника",
      );
    },
  });
};

const useRestoreManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/users/${id}/restore`);
    },
    onSuccess: (_data, id) => {
      let restoredManager: Manager | undefined;
      queryClient.setQueryData<Manager[]>(["deleted-managers"], (prev = []) =>
        prev.filter((m) => {
          if (m.id === id) restoredManager = m;
          return m.id !== id;
        }),
      );
      if (restoredManager) {
        const restoredSnapshot: Manager = {
          ...restoredManager,
          deleted: false,
          updatedAt: nowIso(),
        };
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => [
          restoredSnapshot,
          ...prev.filter((m) => m.id !== id),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-managers"] });
      message.success("Сотрудник восстановлен");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(
        error.response?.data?.message || "Не удалось восстановить сотрудника",
      );
    },
  });
};

// 5. Financial Hooks (Bonuses & Expenses)
const useBonuses = () => {
  return useQuery({
    queryKey: ["bonuses"],
    queryFn: async () => {
      const { data } = await api.get<Bonus[]>("/bonuses");
      return data;
    },
  });
};

const useExpenses = () => {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await api.get<Expense[]>("/expenses");
      return data;
    },
  });
};

const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      type: "bonus" | "expense";
      payload: Record<string, unknown>;
    }) => {
      const endpoint = data.type === "bonus" ? "/bonuses" : "/expenses";
      await api.post(endpoint, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["manager-payout-meta"] });
      message.success("Транзакция сохранена");
    },
    onError: (error: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Не удалось сохранить транзакцию",
      );
    },
  });
};

// 6. Branch & Supplier Hooks
const useBranches = () => {
  return useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get<Branch[]>("/branches");
      return data;
    },
  });
};

const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Branch>) => {
      const { data: created } = await api.post<Branch>("/branches", data);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      message.success("Филиал добавлен");
    },
    onError: (error: {
      response?: { data?: { message?: string } };
      message?: string;
    }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Ошибка создания филиала",
      );
    },
  });
};

const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      message.success("Филиал удален");
    },
  });
};

const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await api.get<Supplier[]>("/suppliers");
      return data;
    },
  });
};

const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      await api.post("/suppliers", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Supplier>;
    }) => {
      const { data: updated } = await api.patch(`/suppliers/${id}`, data);
      return updated as Supplier;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

const useTargets = () => {
  return useQuery({
    queryKey: ["targets"],
    queryFn: async () => {
      const { data } = await api.get<BonusTarget[]>("/targets");
      return data;
    },
  });
};

const useCreateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BonusTarget>) => {
      await api.post("/targets", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["targets"] }),
  });
};

const useDeleteTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/targets/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["targets"] }),
  });
};

const useIssueTargetReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; approvedBy?: string }) => {
      const { data } = await api.post(`/targets/${params.id}/issue-reward`, {
        approvedBy: params.approvedBy,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["manager-payout-meta"] });
      message.success("Бонус по цели выдан");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Не удалось выдать бонус по цели",
      );
    },
  });
};

// 9. App Settings & Training Materials
const useAppSettings = () => {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await api.get<AppSettings>("/settings");
      return data;
    },
  });
};

const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AppSettings>) => {
      const { data } = await api.patch<AppSettings>("/settings", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      message.success("Настройки компании сохранены");
    },
  });
};

const useMaterialFolders = () => {
  return useQuery({
    queryKey: ["material-folders"],
    queryFn: async () => {
      const { data } = await api.get<{
        items: TrainingMaterialFolder[];
        total: number;
      }>("/materials/folders");
      return data;
    },
  });
};

const useMaterials = (params: {
  folderId?: string;
  q?: string;
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ["materials", params],
    queryFn: async (): Promise<PaginatedMaterials> => {
      const { data } = await api.get<PaginatedMaterials>("/materials", {
        params,
      });
      return data;
    },
  });
};

const useCreateMaterialFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TrainingMaterialFolder>) => {
      const { data } = await api.post<TrainingMaterialFolder>(
        "/materials/folders",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Папка создана");
    },
  });
};

const useDeleteMaterialFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      message.success("Папка удалена");
    },
  });
};

const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TrainingMaterial>) => {
      const { data } = await api.post<TrainingMaterial>("/materials", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал добавлен");
    },
  });
};

const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TrainingMaterial>;
    }) => {
      const { data: updated } = await api.patch<TrainingMaterial>(
        `/materials/${id}`,
        data,
      );
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал обновлен");
    },
  });
};

const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал удален");
    },
  });
};

// --- DERIVED TYPES ---

interface Payout {
  id: string;
  createdAt: string;
  updatedAt: string;
  isExpense: boolean;
  date: string;
  amount: number;
  managerName?: string;
  managerId?: string;
  reason: string;
}

// --- COMPONENTS ---

const AnalyticsChart: React.FC<{
  data: { label: string; value: number }[];
  period: string;
}> = ({ data }) => {
  const { appTheme } = useAppStore();
  const isDark = appTheme === "dark";
  if (!data || data.length === 0)
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-10">
        Нет данных за этот период
      </div>
    );
  const maxVal = Math.max(...data.map((d) => d.value));
  const chartHeight = 200;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end space-x-4 min-w-[600px] h-[250px] pt-8 pb-2 px-4">
        {data.map((d, i) => {
          const height = maxVal > 0 ? (d.value / maxVal) * chartHeight : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center group relative"
            >
              <div
                className={`absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs px-2 py-1 rounded pointer-events-none z-10 ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {d.value.toLocaleString()}
              </div>
              <div
                className={`w-full rounded-t-md relative transition-all ${
                  isDark
                    ? "bg-blue-900 group-hover:bg-blue-800"
                    : "bg-blue-100 group-hover:bg-blue-200"
                }`}
                style={{ height: `${height}px`, minHeight: "4px" }}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500 ${
                    isDark ? "bg-blue-600" : "bg-blue-500"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <div
                className={`text-xs mt-2 truncate w-full text-center ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LoginScreen: React.FC = () => {
  const loginMutation = useLogin();
  const [form] = Form.useForm();
  const isDark = useAppStore((s) => s.appTheme) === "dark";

  const onFinish = (values) => {
    loginMutation.mutate(values);
  };

  return (
    <div
      className={`flex h-screen items-center justify-center ${
        isDark ? "bg-black" : "bg-gray-100"
      } transition-colors duration-300`}
    >
      <Card
        className={`w-full max-w-md shadow-xl rounded-2xl ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white"
        }`}
      >
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isDark ? "bg-blue-900" : "bg-blue-50"
            }`}
          >
            <ShopOutlined style={{ fontSize: "28px", color: "#1890ff" }} />
          </div>
          <Title level={3} className={isDark ? "!text-white" : ""}>
            Tomstore CRM
          </Title>
          <Text type="secondary" className={isDark ? "!text-gray-400" : ""}>
            NestJS Edition
          </Text>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="login" label="Логин" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true }]}
          >
            <Input.Password prefix={<KeyOutlined />} size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            className="mt-2"
            loading={loginMutation.isPending}
          >
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
};

const Dashboard: React.FC<{
  sales: Sale[];
  expenses: Expense[];
  bonuses: Bonus[];
  managers: Manager[];
  branches: Branch[];
  targets: BonusTarget[];
  user: Manager;
}> = ({ sales, expenses, bonuses, managers, branches, targets, user }) => {
  const { appTheme } = useAppStore();
  const isDark = appTheme === "dark";
  const isSuperAdmin =
    user.role === "superadmin" || user.roles?.includes("superadmin");
  const hasAdminAccess =
    isSuperAdmin ||
    user.role === "admin" ||
    user.roles?.includes("admin");
  const isManager = !hasAdminAccess;

  const [period, setPeriod] = useState<
    "day" | "week" | "month" | "custom" | "all"
  >("month");
  const [periodDate, setPeriodDate] = useState<Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("all");

  const availableBranchNames = useMemo(() => {
    const set = new Set<string>([
      ...branches.map((b) => b.name),
      ...sales.map((s) => s.branch).filter(Boolean),
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [branches, sales]);

  const branchFilterSet = useMemo(
    () =>
      isSuperAdmin && selectedBranchNames.length > 0
        ? new Set(selectedBranchNames)
        : null,
    [isSuperAdmin, selectedBranchNames],
  );

  const isWithinPeriod = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const date = dayjs(dateValue);
    if (period === "all") return true;
    if (period === "day") return date.isSame(periodDate, "day");
    if (period === "week") return date.isSame(periodDate, "week");
    if (period === "month") return date.isSame(periodDate, "month");
    if (period === "custom") {
      const [start, end] = customRange;
      return (
        date.isSame(start, "day") ||
        date.isSame(end, "day") ||
        (date.isAfter(start, "day") && date.isBefore(end, "day"))
      );
    }
    return true;
  };

  const filteredSales = useMemo(() => {
    return (sales || []).filter((s) => {
      const byPeriod = isWithinPeriod(s.manualDate || s.createdAt);
      if (!byPeriod) return false;
      if (branchFilterSet) {
        return branchFilterSet.has(s.branch || "");
      }
      if (!hasAdminAccess && user.branchName) {
        return s.branch === user.branchName;
      }
      return true;
    });
  }, [
    sales,
    period,
    periodDate,
    customRange,
    branchFilterSet,
    hasAdminAccess,
    user.branchName,
    isWithinPeriod,
  ]);

  const filteredExpenses = useMemo(() => {
    const managerSet = branchFilterSet
      ? new Set(
          managers
            .filter((m) => branchFilterSet.has(m.branchName || ""))
            .map((m) => m.id),
        )
      : null;
    return (expenses || []).filter((e) => {
      if (!isWithinPeriod(e.createdAt)) return false;
      if (!managerSet) return true;
      return !!e.managerId && managerSet.has(e.managerId);
    });
  }, [
    expenses,
    managers,
    period,
    periodDate,
    customRange,
    branchFilterSet,
    isWithinPeriod,
  ]);

  const filteredBonuses = useMemo(() => {
    const managerSet = branchFilterSet
      ? new Set(
          managers
            .filter((m) => branchFilterSet.has(m.branchName || ""))
            .map((m) => m.id),
        )
      : null;
    return (bonuses || []).filter((b) => {
      if (!isWithinPeriod(b.createdAt)) return false;
      if (!managerSet) return true;
      return !!b.managerId && managerSet.has(b.managerId);
    });
  }, [
    bonuses,
    managers,
    period,
    periodDate,
    customRange,
    branchFilterSet,
    isWithinPeriod,
  ]);

  const stats = useMemo(() => {
    const totalRev = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const regularExpenses = filteredExpenses.reduce(
      (acc, e) => acc + e.amount,
      0,
    );
    const bonusesAsExpense = filteredBonuses.reduce(
      (acc, b) => acc + b.amount,
      0,
    );
    const totalExp = regularExpenses + bonusesAsExpense;
    const mySales = filteredSales.filter((s) => s.managerId === user.id);
    const myRev = mySales.reduce((acc, s) => acc + s.total, 0);
    const myEarnings = mySales.reduce((acc, s) => acc + s.managerEarnings, 0);
    const netProfit =
      filteredSales.reduce((acc, s) => {
        return (
          acc +
          (s.total -
            s.costPriceSnapshot * s.quantity -
            s.managerEarnings -
            (s.deliveryCost || 0))
        );
      }, 0) - totalExp;
    const avgCheck =
      filteredSales.length > 0 ? totalRev / filteredSales.length : 0;
    return {
      totalRev,
      totalExp,
      myRev,
      netProfit,
      count: filteredSales.length,
      avgCheck,
      myEarnings,
    };
  }, [filteredSales, filteredExpenses, filteredBonuses, user]);

  // Chart data: last 7 days or days of month
  const chartData = useMemo(() => {
    const days =
      period === "day"
        ? 1
        : period === "week"
          ? 7
          : period === "custom"
            ? Math.max(1, customRange[1].diff(customRange[0], "day") + 1)
            : 30;
    const chartEnd = period === "custom" ? customRange[1] : periodDate;
    const map: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = (period === "all" ? dayjs() : chartEnd)
        .subtract(i, "day")
        .format("DD.MM");
      map[d] = 0;
    }
    filteredSales.forEach((s) => {
      const d = dayjs(s.manualDate || s.createdAt).format("DD.MM");
      if (d in map) map[d] += s.total;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [filteredSales, period, periodDate, customRange]);

  // Manager leaderboard
  const managerStats = useMemo(() => {
    const sourceManagers = branchFilterSet
      ? (managers || []).filter((m) => branchFilterSet.has(m.branchName || ""))
      : managers || [];
    return sourceManagers
      .map((m) => {
        const ms = filteredSales.filter((s) => s.managerId === m.id);
        const mb = filteredBonuses.filter(
          (b) => b.managerId === m.id || b.managerName === m.name,
        );
        const me = filteredExpenses.filter(
          (e) =>
            (e.category === "Аванс" || e.category === "Штраф") &&
            (e.managerId === m.id || e.managerName === m.name),
        );
        const earnings = ms.reduce((a, s) => a + s.managerEarnings, 0);
        const bonusesTotal = mb.reduce((a, b) => a + b.amount, 0);
        const advancesTotal = me.reduce((a, e) => a + e.amount, 0);
        return {
          ...m,
          count: ms.length,
          rev: ms.reduce((a, s) => a + s.total, 0),
          earnings,
          bonusesTotal,
          advancesTotal,
          totalSalary: earnings + bonusesTotal - advancesTotal,
          avgCheck:
            ms.length > 0
              ? Math.round(ms.reduce((a, s) => a + s.total, 0) / ms.length)
              : 0,
        };
      })
      .sort((a, b) => b.rev - a.rev);
  }, [managers, filteredSales, filteredBonuses, filteredExpenses, branchFilterSet]);

  const managerReportData = useMemo(() => {
    if (selectedManagerId === "all") return managerStats;
    return managerStats.filter((m) => m.id === selectedManagerId);
  }, [managerStats, selectedManagerId]);

  const branchReportData = useMemo(() => {
    const branchNames = new Set<string>([
      ...branches.map((b) => b.name),
      ...filteredSales.map((s) => s.branch || "—"),
    ]);
    return Array.from(branchNames)
      .map((name) => {
        const bs = filteredSales.filter((s) => (s.branch || "—") === name);
        const revenue = bs.reduce((sum, s) => sum + s.total, 0);
        const profit = bs.reduce(
          (sum, s) =>
            sum +
            (s.total -
              s.costPriceSnapshot * s.quantity -
              s.managerEarnings -
              (s.deliveryCost || 0)),
          0,
        );
        return {
          key: name,
          branch: name,
          count: bs.length,
          revenue,
          profit,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [branches, filteredSales]);

  // Target progress
  const globalTargets = (targets || []).filter((t) => t.type === "global");
  const personalTargets = (targets || []).filter((t) => t.type === "personal");
  const totalRevAll = (sales || []).reduce((a, s) => a + s.total, 0);

  // Recent activity timeline (deterministic order: bonuses then sales by date)
 const recentActivity = useMemo(() => {
   const bonusItems = (bonuses || []).slice(0, 3).map((b) => ({
     key: `b-${b.id}`,
     color: "green" as const,
     date: b.createdAt,
     content: (
       <div>
         <span className="font-semibold">{b.managerName}</span> — бонус{" "}
         {b.amount} c
         <div className="text-xs text-gray-400">
           {formatDate(b.createdAt, true)}
         </div>
       </div>
     ),
   }));

   const saleItems = filteredSales.slice(0, 3).map((s) => ({
     key: `s-${s.id}`,
     color: "blue" as const,
     date: s.manualDate || s.createdAt,
     content: (
       <div>
         <span className="font-semibold">{s.managerName}</span> —{" "}
         {s.productName} {s.total.toLocaleString()} c
         <div className="text-xs text-gray-400">
           {formatDate(s.manualDate || s.createdAt, true)}
         </div>
       </div>
     ),
   }));

   return [...bonusItems, ...saleItems]
     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 6)
     .map(({ key, color, content }) => ({ key, color, content }));
 }, [bonuses, filteredSales]);
  return (
    <div className="space-y-5 min-w-0">
      {/* Period selector */}
      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select
            mode="multiple"
            allowClear
            placeholder="Филиалы (все)"
            style={{ minWidth: 260 }}
            value={selectedBranchNames}
            onChange={setSelectedBranchNames}
            maxTagCount="responsive"
          >
            {availableBranchNames.map((name) => (
              <Option key={name} value={name}>
                {name}
              </Option>
            ))}
          </Select>
        )}
        <Radio.Group
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="day">День</Radio.Button>
          <Radio.Button value="week">Неделя</Radio.Button>
          <Radio.Button value="month">Месяц</Radio.Button>
          <Radio.Button value="custom">Custom</Radio.Button>
          <Radio.Button value="all">Всё время</Radio.Button>
        </Radio.Group>
        {period !== "all" && period !== "custom" && (
          <DatePicker
            value={periodDate}
            onChange={(v) => setPeriodDate(v || dayjs())}
            picker={period === "day" ? "date" : period}
            allowClear={false}
          />
        )}
        {period === "custom" && (
          <RangePicker
            value={customRange}
            onChange={(v) => {
              if (v?.[0] && v?.[1]) setCustomRange([v[0], v[1]]);
            }}
            allowClear={false}
          />
        )}
      </div>

      {/* Stats cards */}
      <Row gutter={[16, 16]}>
        {[
          {
            title: "Выручка",
            value: stats.totalRev,
            color: "#3f8600",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Расходы",
            value: stats.totalExp,
            color: "#cf1322",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Чистая прибыль",
            value: stats.netProfit,
            color: stats.netProfit >= 0 ? "#3f8600" : "#cf1322",
            suffix: "c",
            hideForManager: true,
          },
          {
            title: "Мои продажи",
            value: stats.myRev,
            color: "#1890ff",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Моя ЗП",
            value: stats.myEarnings,
            color: "#722ed1",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Средний чек",
            value: Math.round(stats.avgCheck),
            color: "#fa8c16",
            suffix: "c",
            hideForManager: false,
          },
        ]
          .filter((item) => !(isManager && item.hideForManager))
          .map(({ title, value, color, suffix }) => (
            <Col xs={12} sm={8} lg={4} key={title}>
              <Card size="small" className="text-center">
                <Statistic
                  title={title}
                  value={value}
                  suffix={suffix}
                  styles={{
                    content: {
                      color,
                      fontSize: 18,
                    },
                  }}
                />
              </Card>
            </Col>
          ))}
      </Row>

      {/* Chart + Leaderboard */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={`Выручка по дням`} size="small">
            <AnalyticsChart data={chartData} period={period} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Топ менеджеры" size="small">
            <div className="space-y-3">
              {managerStats.slice(0, 5).map((m, idx) => (
                <div key={m.id} className="border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex items-center gap-2 w-full">
                    <Badge
                      count={idx + 1}
                      style={{
                        backgroundColor:
                          idx === 0
                            ? "#faad14"
                            : idx === 1
                              ? "#bfbfbf"
                              : "#d46b08",
                      }}
                    />
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span className="flex-1 truncate">{m.name}</span>
                    <Tooltip title={`${m.count} продаж`}>
                      <Tag color="blue">{m.rev.toLocaleString()} c</Tag>
                    </Tooltip>
                  </div>
                  <Progress
                    percent={
                      managerStats[0]?.rev
                        ? Math.round((m.rev / managerStats[0].rev) * 100)
                        : 0
                    }
                    showInfo={false}
                    size="small"
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Targets + Recent activity */}
      <Row gutter={[16, 16]}>
        {targets.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Цели" size="small">
              {globalTargets.map((t) => {
                const pct = Math.min(
                  100,
                  Math.round((totalRevAll / t.amount) * 100),
                );
                const daysLeft =
                  t.deadline !== undefined
                    ? dayjs(t.deadline).endOf("day").diff(dayjs(), "day")
                    : null;
                return (
                  <div key={t.id} className="mb-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm mb-1">
                      <span>
                        Выручка: {totalRevAll.toLocaleString()} /{" "}
                        {t.amount.toLocaleString()} c
                      </span>
                      <Tag color="gold">Бонус: {t.reward} c</Tag>
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-gray-400 mb-1">
                        до {formatDate(t.deadline)} ·{" "}
                        {daysLeft !== null && daysLeft >= 0
                          ? `осталось ${daysLeft} дн`
                          : `просрочено на ${Math.abs(daysLeft ?? 0)} дн`}
                      </div>
                    )}
                    <Progress
                      percent={pct}
                      status={pct >= 100 ? "success" : "active"}
                    />
                  </div>
                );
              })}
              {personalTargets.map((t) => {
                const managerName =
                  managers.find((m) => m.id === t.managerId)?.name ||
                  "Сотрудник";
                const personalIncome = (sales || [])
                  .filter((s) => s.managerId === t.managerId)
                  .reduce((sum, s) => sum + s.total, 0);
                const pct = Math.min(
                  100,
                  Math.round((personalIncome / t.amount) * 100),
                );
                const daysLeft =
                  t.deadline !== undefined
                    ? dayjs(t.deadline).endOf("day").diff(dayjs(), "day")
                    : null;
                return (
                  <div key={t.id} className="mb-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm mb-1">
                      <span>
                        {managerName}: {personalIncome.toLocaleString()} /{" "}
                        {t.amount.toLocaleString()} c
                      </span>
                      <Tag color="purple">Личная</Tag>
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-gray-400 mb-1">
                        до {formatDate(t.deadline)} ·{" "}
                        {daysLeft !== null && daysLeft >= 0
                          ? `осталось ${daysLeft} дн`
                          : `просрочено на ${Math.abs(daysLeft ?? 0)} дн`}
                      </div>
                    )}
                    <Progress
                      percent={pct}
                      status={pct >= 100 ? "success" : "active"}
                    />
                  </div>
                );
              })}
            </Card>
          </Col>
        )}
        <Col xs={24} lg={targets.length > 0 ? 12 : 24}>
          <Card title="Последние события" size="small">
            <Timeline items={recentActivity} />
          </Card>
        </Col>
      </Row>

      {/* Bonus payouts summary */}
      {!isManager && (
        <Card title="ЗП сотрудников за период" size="small">
          <Row gutter={[12, 12]}>
            {managerStats.map((m) => (
              <Col xs={12} sm={8} md={6} key={m.id}>
                <Card
                  size="small"
                  className={`text-center ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                >
                  <Avatar icon={<UserOutlined />} className="mb-2" />
                  <div className="font-semibold truncate">{m.name}</div>
                  <Divider style={{ margin: "8px 0" }} />
                  <div className="text-xs text-gray-400">{m.count} продаж</div>
                  <div className="text-green-600 font-bold">
                    {m.totalSalary.toLocaleString()} c
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    ЗП: {m.earnings.toLocaleString()} · Бонус: +
                    {m.bonusesTotal.toLocaleString()} · Аванс/Штраф: -
                    {m.advancesTotal.toLocaleString()}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {!isManager && (
        <Card title="Отчеты по менеджерам" size="small">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <Select
              value={selectedManagerId}
              onChange={setSelectedManagerId}
              style={{ minWidth: 240 }}
            >
              <Option value="all">Все менеджеры</Option>
              {managers.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
            <Text type="secondary">
              Период:{" "}
              {period === "custom"
                ? `${customRange[0].format("DD.MM.YYYY")} - ${customRange[1].format("DD.MM.YYYY")}`
                : period === "all"
                  ? "всё время"
                  : period === "day"
                    ? `день (${periodDate.format("DD.MM.YYYY")})`
                    : period === "week"
                      ? `неделя (${periodDate.format("DD.MM.YYYY")})`
                      : `месяц (${periodDate.format("MM.YYYY")})`}
            </Text>
          </div>
          <Table
            size="small"
            rowKey="id"
            dataSource={managerReportData}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
            columns={[
              { title: "Менеджер", dataIndex: "name" },
              { title: "Продаж", dataIndex: "count", width: 90 },
              {
                title: "Выручка",
                dataIndex: "rev",
                render: (v: number) => (
                  <span className="text-blue-600 font-semibold">
                    {v.toLocaleString()} c
                  </span>
                ),
              },
              {
                title: "Средний чек",
                dataIndex: "avgCheck",
                render: (v: number) => `${v.toLocaleString()} c`,
              },
              {
                title: "ЗП от продаж",
                dataIndex: "earnings",
                render: (v: number) => `${v.toLocaleString()} c`,
              },
              {
                title: "Бонусы",
                dataIndex: "bonusesTotal",
                render: (v: number) => (
                  <span className="text-green-600">
                    +{v.toLocaleString()} c
                  </span>
                ),
              },
              {
                title: "Аванс/Штраф",
                dataIndex: "advancesTotal",
                render: (v: number) => (
                  <span className="text-orange-600">
                    -{v.toLocaleString()} c
                  </span>
                ),
              },
              {
                title: "Итого ЗП",
                dataIndex: "totalSalary",
                render: (v: number) => (
                  <span
                    className={`font-bold ${v >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {v.toLocaleString()} c
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {!isManager && (
        <Card title="Отчеты по филиалам" size="small">
          <Table
            size="small"
            rowKey="key"
            dataSource={branchReportData}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: "Филиал", dataIndex: "branch" },
              { title: "Продаж", dataIndex: "count", width: 90 },
              {
                title: "Выручка",
                dataIndex: "revenue",
                render: (v: number) => (
                  <span className="text-blue-600 font-semibold">
                    {v.toLocaleString()} c
                  </span>
                ),
              },
              {
                title: "Прибыль",
                dataIndex: "profit",
                render: (v: number) => (
                  <span className={v >= 0 ? "text-green-600" : "text-red-500"}>
                    {v.toLocaleString()} c
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

const AppContent = () => {
  const { user, appTheme, setAppTheme, logout } = useAppStore();
  const [activeTab, setActiveTab] = useState("1");
  const salesFilters = useSalesFilters();
  const materialsFilters = useMaterialsFilters();
  const {
    folderId: materialsFolderId,
    setFolderId: setMaterialsFolderId,
    search: materialsSearch,
    setSearch: setMaterialsSearch,
    page: materialsPage,
    pageSize: materialsPageSize,
    onPageChange: onMaterialsPageChange,
  } = materialsFilters;
  const hasRole = (target: Role) =>
    !!user && !!(user.role === target || user.roles?.includes(target));
  const isSuperAdmin = hasRole("superadmin");
  const isAdmin = hasRole("admin") || isSuperAdmin;
  const isStorekeeper = hasRole("storekeeper");
  const canAccessWarehouse = isAdmin || isStorekeeper;
  const canStorekeeperManageProducts = isAdmin || !!user?.canManageProducts;

  // Data Hooks
  const { data: appSettings } = useAppSettings();
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();
  const { data: productCategories = [] } = useProductCategories();
  const { data: materialFoldersData } = useMaterialFolders();
  const { data: materialsData } = useMaterials({
    folderId: materialsFolderId,
    q: materialsSearch,
    includeDrafts: isAdmin,
    limit: materialsPageSize,
    offset: (materialsPage - 1) * materialsPageSize,
  });
  const { data: managers = [] } = useManagers();
  const { data: serverManagerPayoutMeta = {} } = useManagersPayoutMeta(
    managers.map((m) => m.id),
  );
  const { data: deletedManagers = [] } = useDeletedManagers();
  const { data: branches = [] } = useBranches();
  const { data: bonuses = [] } = useBonuses();
  const { data: expenses = [] } = useExpenses();
  const { data: suppliers = [] } = useSuppliers();
  const { data: targets = [] } = useTargets();

  // Mutations
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();
  const createProduct = useCreateProduct();
  const importProducts = useImportProducts();
  const createProductCategory = useCreateProductCategory();
  const updateProduct = useUpdateProduct();
  const updateAppSettings = useUpdateAppSettings();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const createMaterialFolder = useCreateMaterialFolder();
  const deleteMaterialFolder = useDeleteMaterialFolder();
  const createTransaction = useCreateTransaction();
  const updateProfile = useUpdateProfile();
  const createManager = useCreateManager();
  const updateManager = useUpdateManager();
  const deleteManager = useDeleteManager();
  const restoreManager = useRestoreManager();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const createTarget = useCreateTarget();
  const deleteTarget = useDeleteTarget();
  const issueTargetReward = useIssueTargetReward();
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();

  // UI State
  const [isSaleModal, setSaleModal] = useState(false);
  const [isProductModal, setProductModal] = useState(false);
  const [isFinanceModal, setFinanceModal] = useState(false);
  const [isExpenseModal, setExpenseModal] = useState(false);
  const [isManagerModal, setManagerModal] = useState(false);
  const [isSupplierModal, setSupplierModal] = useState(false);
  const [isBranchModal, setBranchModal] = useState(false);
  const [branchDetails, setBranchDetails] = useState<Branch | null>(null);
  const [isMapAddressModal, setMapAddressModal] = useState(false);
  const [isTargetModal, setTargetModal] = useState(false);
  const [isProfileModal, setProfileModal] = useState(false);
  const [isMaterialModal, setMaterialModal] = useState(false);
  const [isMaterialFolderModal, setMaterialFolderModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingManagerPhoto, setIsUploadingManagerPhoto] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);
  const [isUploadingMaterialFile, setIsUploadingMaterialFile] = useState(false);
  const [previewMaterial, setPreviewMaterial] =
    useState<TrainingMaterial | null>(null);
  const [newProductCategory, setNewProductCategory] = useState("");
  const [salaryHistoryManager, setSalaryHistoryManager] = useState<{
    id?: string;
    name?: string;
  } | null>(null);
  const [employeeDetailsManager, setEmployeeDetailsManager] =
    useState<Manager | null>(null);
  const [ownerRange, setOwnerRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [ownerSelectedBranches, setOwnerSelectedBranches] = useState<string[]>(
    [],
  );
  const [productForm] = Form.useForm();
  const [managerForm] = Form.useForm();
  const [supplierForm] = Form.useForm();
  const [branchForm] = Form.useForm();
  const [companyForm] = Form.useForm();
  const [materialForm] = Form.useForm();
  const [materialFolderForm] = Form.useForm();
  const productPhotoUrls = Form.useWatch("photoUrls", productForm);
  const productIsCombo = Form.useWatch("isCombo", productForm);
  const comboItemsFromForm = Form.useWatch("comboItems", productForm);
  const managerPhotoUrl = Form.useWatch("photoUrl", managerForm);

  const [editingItem, setEditingItem] = useState<
    Sale | Product | Manager | Supplier | BonusTarget | TrainingMaterial | null
  >(null);
  const materialsPageData: PaginatedMaterials = materialsData || {
    items: [],
    total: 0,
    limit: materialsPageSize,
    offset: 0,
    hasMore: false,
  };
  const materialFolders = materialFoldersData?.items || [];

  const comboAvailableFromSelection = useMemo(() => {
    const items = Array.isArray(comboItemsFromForm) ? comboItemsFromForm : [];
    const validItems = items.filter(
      (x: { productId?: string; quantity?: number }) =>
        x?.productId && Number(x?.quantity || 0) > 0,
    );
    if (!validItems.length) return 0;
    const productMap = new Map(products.map((p) => [p.id, p]));
    const possible = validItems.map(
      (item: { productId: string; quantity: number }) => {
        const component = productMap.get(item.productId);
        const componentStock = Number(component?.stockQty || 0);
        const qtyPerCombo = Number(item.quantity || 0);
        if (qtyPerCombo <= 0) return 0;
        return Math.floor(componentStock / qtyPerCombo);
      },
    );
    return possible.length ? Math.max(0, Math.min(...possible)) : 0;
  }, [comboItemsFromForm, products]);

  const productCategoryOptions = useMemo(() => {
    const values = new Set<string>();
    PRODUCT_CATEGORIES.forEach((c) => values.add(c));
    (productCategories || []).forEach((c) =>
      values.add(String(c.name || "").trim()),
    );
    (products || []).forEach((p) => {
      const list =
        p.categories && p.categories.length > 0
          ? p.categories
          : p.category
            ? [p.category]
            : [];
      list.forEach((c) => {
        const name = String(c || "").trim();
        if (name) values.add(name);
      });
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ru"));
  }, [productCategories, products]);

  const combinedPayouts = useMemo((): Payout[] => {
    const b: Payout[] = (bonuses || []).map((x) => ({
      ...x,
      isExpense: false,
      date: x.createdAt,
    }));
    const e: Payout[] = (expenses || [])
      .filter((x) => x.category === "Аванс" || x.category === "Штраф")
      .map((x) => ({
        ...x,
        isExpense: true,
        date: x.createdAt,
        reason: x.category + (x.comment ? `: ${x.comment}` : ""),
      }));
    return [...b, ...e].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [bonuses, expenses]);

  const managerPayoutMeta = serverManagerPayoutMeta;

  const { data: branchDetailsData, movements: branchMovements } =
    useBranchDetailsData({
      branch: branchDetails,
      sales,
      managers,
      products,
      expenses,
      bonuses,
    });

  useEffect(() => {
    if (isProductModal) {
      setNewProductCategory("");
      const current = (editingItem as Product) || {};
      const photoUrls =
        current.photoUrls && current.photoUrls.length > 0
          ? current.photoUrls
          : current.photoUrl
            ? [current.photoUrl]
            : [];
      const categories =
        current.categories && current.categories.length > 0
          ? current.categories
          : current.category
            ? [current.category]
            : ["Прочее"];
      productForm.setFieldsValue({
        ...current,
        categories,
        category: categories[0],
        branchName: current.branchName || branches[0]?.name,
        photoUrls,
        stockQty: current.stockQty ?? 0,
        isCombo: current.isCombo ?? false,
      });
    } else {
      productForm.resetFields();
      setNewProductCategory("");
    }
  }, [isProductModal, editingItem, productForm, branches]);

  useEffect(() => {
    if (isSupplierModal) {
      supplierForm.setFieldsValue((editingItem as Supplier) || {});
    }
  }, [isSupplierModal, editingItem, supplierForm]);

  useEffect(() => {
    if (!appSettings || activeTab !== "6") return;
    companyForm.setFieldsValue({
      companyName: appSettings.companyName,
      companyLogoUrl: appSettings.companyLogoUrl,
    });
  }, [appSettings, companyForm, activeTab]);

  useEffect(() => {
    if (isManagerModal) {
      const current = (editingItem as Manager) || {};
      const resolvedBranchId =
        current.branchId ||
        branches.find((b) => b.name === current.branchName)?.id;
      managerForm.setFieldsValue({
        ...current,
        roles:
          current.roles && current.roles.length > 0
            ? current.roles
            : current.role
              ? [current.role]
              : ["manager"],
        salaryType: current.salaryType || "commission",
        fixedMonthlySalary: Number(current.fixedMonthlySalary || 0),
        branchId: resolvedBranchId,
        birthDate: current.birthDate
          ? dayjs(current.birthDate)
          : current.birthYear
            ? dayjs(`${current.birthYear}-01-01`)
            : undefined,
      });
    } else {
      managerForm.resetFields();
    }
  }, [isManagerModal, editingItem, managerForm, branches]);

  type UploadRequestOptions<T = { url: string }> = {
    file: File;
    onSuccess?: (res?: T) => void;
    onError?: (err?: unknown) => void;
  };

  const uploadProductPhoto = async (options: UploadRequestOptions) => {
    const { file, onSuccess, onError } = options;
    try {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>(
        "/uploads/image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const photoUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      const prev =
        (productForm.getFieldValue("photoUrls") as string[] | undefined) || [];
      productForm.setFieldValue("photoUrls", [...prev, photoUrl]);
      productForm.setFieldValue("photoUrl", photoUrl);
      onSuccess?.(data);
    } catch (error) {
      message.error("Ошибка загрузки фото");
      onError?.(error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const uploadManagerPhoto = async (options: UploadRequestOptions) => {
    const { file, onSuccess, onError } = options;
    try {
      setIsUploadingManagerPhoto(true);
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>(
        "/uploads/image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const photoUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      managerForm.setFieldValue("photoUrl", photoUrl);
      onSuccess?.(data);
    } catch (error) {
      message.error("Ошибка загрузки фото сотрудника");
      onError?.(error);
    } finally {
      setIsUploadingManagerPhoto(false);
    }
  };

  const uploadCompanyLogo = async (options: UploadRequestOptions) => {
    const { file, onSuccess, onError } = options;
    try {
      setIsUploadingCompanyLogo(true);
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>(
        "/uploads/image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const logoUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      companyForm.setFieldValue("companyLogoUrl", logoUrl);
      onSuccess?.(data);
    } catch (error) {
      message.error("Ошибка загрузки логотипа");
      onError?.(error);
    } finally {
      setIsUploadingCompanyLogo(false);
    }
  };

  const uploadMaterialFile = async (options: UploadRequestOptions) => {
    const { file, onSuccess, onError } = options;
    try {
      setIsUploadingMaterialFile(true);
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>(
        "/uploads/file",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const fileUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      materialForm.setFieldValue("url", fileUrl);
      onSuccess?.(data);
    } catch (error) {
      message.error("Ошибка загрузки файла");
      onError?.(error);
    } finally {
      setIsUploadingMaterialFile(false);
    }
  };

  const uploadMaterialThumbnail = async (options: UploadRequestOptions) => {
    const { file, onSuccess, onError } = options;
    try {
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>(
        "/uploads/image",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      const imageUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      materialForm.setFieldValue("thumbnailUrl", imageUrl);
      onSuccess?.(data);
    } catch (error) {
      message.error("Ошибка загрузки превью");
      onError?.(error);
    }
  };

  const salaryHistory = useMemo(() => {
    if (!salaryHistoryManager) return null;

    const managerById = salaryHistoryManager.id
      ? managers.find((m) => m.id === salaryHistoryManager.id)
      : null;
    const managerName =
      salaryHistoryManager.name || managerById?.name || "Сотрудник";
    const managerId = salaryHistoryManager.id || managerById?.id;
    const salaryType = managerById?.salaryType || "commission";
    const fixedMonthlySalary = Number(managerById?.fixedMonthlySalary || 0);

    const byManager = (id?: string, name?: string) => {
      return (entryId?: string, entryName?: string) =>
        (!!id && entryId === id) || (!!name && entryName === name);
    };
    const match = byManager(managerId, managerName);

    const salesItems = sales
      .filter((s) => match(s.managerId, s.managerName))
      .map((s) => ({
        key: `sale-${s.id}`,
        date: s.manualDate || s.createdAt,
        type: "sale" as const,
        title: `ЗП с продажи: ${s.productName}`,
        amount: s.managerEarnings,
      }));

    const bonusItems = bonuses
      .filter((b) => match(b.managerId, b.managerName))
      .map((b) => ({
        key: `bonus-${b.id}`,
        date: b.createdAt,
        type: "bonus" as const,
        title: `Бонус: ${b.reason}`,
        amount: b.amount,
      }));

    const advanceItems = expenses
      .filter(
        (e) =>
          (e.category === "Аванс" || e.category === "Штраф") &&
          match(e.managerId, e.managerName),
      )
      .map((e) => ({
        key: `exp-${e.id}`,
        date: e.createdAt,
        type: "advance" as const,
        title: `${e.category}${e.comment ? `: ${e.comment}` : ""}`,
        amount: e.amount,
      }));

    const items = [...salesItems, ...bonusItems, ...advanceItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const baseSalary = salesItems.reduce((sum, i) => sum + i.amount, 0);
    const bonusesTotal = bonusItems.reduce((sum, i) => sum + i.amount, 0);
    const advancesTotal = advanceItems.reduce((sum, i) => sum + i.amount, 0);
    const total = baseSalary + bonusesTotal - advancesTotal;

    return {
      managerName,
      salaryType,
      fixedMonthlySalary,
      items,
      baseSalary,
      bonusesTotal,
      advancesTotal,
      total,
    };
  }, [salaryHistoryManager, managers, sales, bonuses, expenses]);

  const employeeDetails = useMemo(() => {
    if (!employeeDetailsManager) return null;

    const managerId = employeeDetailsManager.id;
    const managerName = employeeDetailsManager.name;
    const match = (entryId?: string, entryName?: string) =>
      entryId === managerId || entryName === managerName;

    const managerSales = sales
      .filter((s) => match(s.managerId, s.managerName))
      .sort(
        (a, b) =>
          new Date(b.manualDate || b.createdAt).getTime() -
          new Date(a.manualDate || a.createdAt).getTime(),
      );

    const managerBonuses = bonuses
      .filter((b) => match(b.managerId, b.managerName))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const managerExpenses = expenses
      .filter((e) => match(e.managerId, e.managerName))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const salaryFromSales = managerSales.reduce(
      (sum, s) => sum + s.managerEarnings,
      0,
    );
    const bonusesTotal = managerBonuses.reduce((sum, b) => sum + b.amount, 0);
    const penaltiesTotal = managerExpenses
      .filter((e) => e.category === "Штраф")
      .reduce((sum, e) => sum + e.amount, 0);
    const advancesTotal = managerExpenses
      .filter((e) => e.category === "Аванс")
      .reduce((sum, e) => sum + e.amount, 0);
    const otherExpensesTotal = managerExpenses
      .filter((e) => e.category !== "Аванс" && e.category !== "Штраф")
      .reduce((sum, e) => sum + e.amount, 0);

    const revenueTotal = managerSales.reduce((sum, s) => sum + s.total, 0);
    const profitTotal = managerSales.reduce(
      (sum, s) =>
        sum +
        (s.total -
          s.costPriceSnapshot * s.quantity -
          s.managerEarnings -
          (s.deliveryCost || 0)),
      0,
    );

    const finalPayout =
      salaryFromSales + bonusesTotal - penaltiesTotal - advancesTotal;

    const financeHistory = [
      ...managerBonuses.map((b) => ({
        key: `bonus-${b.id}`,
        date: b.createdAt,
        type: "bonus" as const,
        label: b.reason,
        amount: b.amount,
      })),
      ...managerExpenses.map((e) => ({
        key: `exp-${e.id}`,
        date: e.createdAt,
        type: "expense" as const,
        label: `${e.category}${e.comment ? `: ${e.comment}` : ""}`,
        amount: e.amount,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      managerName,
      managerSales,
      financeHistory,
      salaryFromSales,
      bonusesTotal,
      penaltiesTotal,
      advancesTotal,
      otherExpensesTotal,
      revenueTotal,
      profitTotal,
      finalPayout,
    };
  }, [employeeDetailsManager, sales, bonuses, expenses]);

  const ownerAvailableBranches = useMemo(() => {
    const names = new Set<string>([
      ...branches.map((b) => b.name),
      ...sales.map((s) => s.branch).filter(Boolean),
      ...managers.map((m) => m.branchName || "").filter(Boolean),
    ]);
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ru"));
  }, [branches, sales, managers]);

  const ownerBranchFilterSet = useMemo(
    () =>
      ownerSelectedBranches.length > 0
        ? new Set(ownerSelectedBranches)
        : null,
    [ownerSelectedBranches],
  );

  const inOwnerRange = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const d = dayjs(dateValue);
    const [start, end] = ownerRange;
    return (
      d.isSame(start, "day") ||
      d.isSame(end, "day") ||
      (d.isAfter(start, "day") && d.isBefore(end, "day"))
    );
  };

  const managerBranchById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of managers) {
      if (m.id && m.branchName) map.set(m.id, m.branchName);
    }
    return map;
  }, [managers]);

  const ownerFilteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (!inOwnerRange(s.manualDate || s.createdAt)) return false;
      if (!ownerBranchFilterSet) return true;
      return ownerBranchFilterSet.has(s.branch || "");
    });
  }, [sales, ownerBranchFilterSet, ownerRange]);

  const ownerFilteredBonuses = useMemo(() => {
    return bonuses.filter((b) => {
      if (!inOwnerRange(b.createdAt)) return false;
      if (!ownerBranchFilterSet) return true;
      const branch = b.managerId ? managerBranchById.get(b.managerId) : undefined;
      return !!branch && ownerBranchFilterSet.has(branch);
    });
  }, [bonuses, ownerBranchFilterSet, ownerRange, managerBranchById]);

  const ownerFilteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!inOwnerRange(e.createdAt)) return false;
      if (!ownerBranchFilterSet) return true;
      const branch = e.managerId ? managerBranchById.get(e.managerId) : undefined;
      return !!branch && ownerBranchFilterSet.has(branch);
    });
  }, [expenses, ownerBranchFilterSet, ownerRange, managerBranchById]);

  const ownerStats = useMemo(() => {
    const revenue = ownerFilteredSales.reduce((sum, s) => sum + s.total, 0);
    const salesProfit = ownerFilteredSales.reduce(
      (sum, s) =>
        sum +
        (s.total -
          s.costPriceSnapshot * s.quantity -
          s.managerEarnings -
          (s.deliveryCost || 0)),
      0,
    );
    const expensesTotal = ownerFilteredExpenses.reduce(
      (sum, e) => sum + e.amount,
      0,
    );
    const bonusesTotal = ownerFilteredBonuses.reduce(
      (sum, b) => sum + b.amount,
      0,
    );
    const netProfit = salesProfit - expensesTotal - bonusesTotal;
    return {
      revenue,
      expensesTotal,
      bonusesTotal,
      netProfit,
      orders: ownerFilteredSales.length,
    };
  }, [ownerFilteredSales, ownerFilteredExpenses, ownerFilteredBonuses]);

  const ownerBranchRows = useMemo(() => {
    const names =
      ownerBranchFilterSet && ownerBranchFilterSet.size > 0
        ? Array.from(ownerBranchFilterSet)
        : ownerAvailableBranches;
    return names
      .map((name) => {
        const bs = ownerFilteredSales.filter((s) => (s.branch || "—") === name);
        const managerIds = new Set(
          managers.filter((m) => (m.branchName || "—") === name).map((m) => m.id),
        );
        const expensesTotal = ownerFilteredExpenses
          .filter((e) => !!e.managerId && managerIds.has(e.managerId))
          .reduce((sum, e) => sum + e.amount, 0);
        const bonusesTotal = ownerFilteredBonuses
          .filter((b) => !!b.managerId && managerIds.has(b.managerId))
          .reduce((sum, b) => sum + b.amount, 0);
        const revenue = bs.reduce((sum, s) => sum + s.total, 0);
        const profit = bs.reduce(
          (sum, s) =>
            sum +
            (s.total -
              s.costPriceSnapshot * s.quantity -
              s.managerEarnings -
              (s.deliveryCost || 0)),
          0,
        );
        return {
          key: name,
          branch: name,
          orders: bs.length,
          revenue,
          expenses: expensesTotal + bonusesTotal,
          net: profit - expensesTotal - bonusesTotal,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [
    ownerAvailableBranches,
    ownerBranchFilterSet,
    ownerFilteredSales,
    ownerFilteredExpenses,
    ownerFilteredBonuses,
    managers,
  ]);

  const ownerManagerRows = useMemo(() => {
    const sourceManagers = ownerBranchFilterSet
      ? managers.filter((m) => ownerBranchFilterSet.has(m.branchName || ""))
      : managers;
    return sourceManagers
      .map((m) => {
        const ms = ownerFilteredSales.filter((s) => s.managerId === m.id);
        const mb = ownerFilteredBonuses.filter((b) => b.managerId === m.id);
        const me = ownerFilteredExpenses.filter((e) => e.managerId === m.id);
        const revenue = ms.reduce((sum, s) => sum + s.total, 0);
        const salaryFromSales = ms.reduce((sum, s) => sum + s.managerEarnings, 0);
        const bonusesTotal = mb.reduce((sum, b) => sum + b.amount, 0);
        const deductions = me
          .filter((e) => e.category === "Аванс" || e.category === "Штраф")
          .reduce((sum, e) => sum + e.amount, 0);
        const fixed = m.salaryType === "fixed" ? Number(m.fixedMonthlySalary || 0) : 0;
        const payout = fixed + salaryFromSales + bonusesTotal - deductions;
        return {
          key: m.id,
          manager: m.name,
          branch: m.branchName || "—",
          role: m.role,
          revenue,
          payout,
          orders: ms.length,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [managers, ownerBranchFilterSet, ownerFilteredSales, ownerFilteredBonuses, ownerFilteredExpenses]);

  const downloadOwnerCsv = () => {
    const rows: string[][] = [];
    rows.push([
      "Owner Report",
      `${ownerRange[0].format("DD.MM.YYYY")} - ${ownerRange[1].format("DD.MM.YYYY")}`,
    ]);
    rows.push([
      "Филиалы",
      ownerSelectedBranches.length ? ownerSelectedBranches.join(", ") : "Все",
    ]);
    rows.push([]);
    rows.push(["KPI", "Значение"]);
    rows.push(["Выручка", String(ownerStats.revenue)]);
    rows.push(["Расходы", String(ownerStats.expensesTotal)]);
    rows.push(["Бонусы", String(ownerStats.bonusesTotal)]);
    rows.push(["Чистая прибыль", String(ownerStats.netProfit)]);
    rows.push(["Заказы", String(ownerStats.orders)]);
    rows.push([]);
    rows.push(["Отчет по филиалам"]);
    rows.push(["Филиал", "Заказы", "Выручка", "Расходы", "Чистая прибыль"]);
    ownerBranchRows.forEach((r) => {
      rows.push([
        r.branch,
        String(r.orders),
        String(r.revenue),
        String(r.expenses),
        String(r.net),
      ]);
    });
    rows.push([]);
    rows.push(["Отчет по сотрудникам"]);
    rows.push(["Сотрудник", "Филиал", "Роль", "Заказы", "Выручка", "К выплате"]);
    ownerManagerRows.forEach((r) => {
      rows.push([
        r.manager,
        r.branch,
        r.role,
        String(r.orders),
        String(r.revenue),
        String(r.payout),
      ]);
    });

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owner-report-${dayjs().format("YYYY-MM-DD")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("Owner report CSV скачан");
  };

  const menuItems = [
    {
      key: "1",
      icon: <DashboardOutlined />,
      label: (
        <p className={appTheme === "dark" ? "text-white" : "text-gray-800"}>
          Аналитика{" "}
        </p>
      ),
    },
    {
      key: "2",
      icon: <ShoppingCartOutlined />,
      label: (
        <p className={appTheme === "dark" ? "text-white" : "text-gray-800"}>
          Продажи
        </p>
      ),
    },
    ...(canAccessWarehouse
      ? [
          {
            key: "3",
            icon: <ShopOutlined />,
            label: (
              <p
                className={appTheme === "dark" ? "text-white" : "text-gray-800"}
              >
                Склад
              </p>
            ),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            key: "7",
            icon: <SolutionOutlined />,
            label: (
              <p
                className={appTheme === "dark" ? "text-white" : "text-gray-800"}
              >
                Поставщики
              </p>
            ),
          },
          {
            key: "4",
            icon: <TeamOutlined />,
            label: (
              <p
                className={appTheme === "dark" ? "text-white" : "text-gray-800"}
              >
                Сотрудники
              </p>
            ),
          },
          {
            key: "5",
            icon: <WalletOutlined />,
            label: (
              <p
                className={appTheme === "dark" ? "text-white" : "text-gray-800"}
              >
                Финансы
              </p>
            ),
          },
          {
            key: "8",
            icon: <ShopOutlined />,
            label: (
              <p
                className={appTheme === "dark" ? "text-white" : "text-gray-800"}
              >
                Филиалы
              </p>
            ),
          },
          ...(isSuperAdmin
            ? [
                {
                  key: "10",
                  icon: <DashboardOutlined />,
                  label: (
                    <p
                      className={
                        appTheme === "dark" ? "text-white" : "text-gray-800"
                      }
                    >
                      Owner Report
                    </p>
                  ),
                },
              ]
            : []),
        ]
      : []),
    {
      key: "9",
      icon: <ReadOutlined />,
      label: (
        <p className={appTheme === "dark" ? "text-white" : "text-gray-800"}>
          Материалы
        </p>
      ),
    },
    {
      key: "6",
      icon: <SettingOutlined />,
      label: (
        <p className={appTheme === "dark" ? "text-white" : "text-gray-800"}>
          Настройки
        </p>
      ),
    },
  ];

  const addProductCategory = () => {
    const trimmed = newProductCategory.trim();
    if (!trimmed) {
      message.warning("Введите название категории");
      return;
    }
    createProductCategory.mutate(trimmed, {
      onSuccess: (created) => {
        const current = (productForm.getFieldValue("categories") ||
          []) as string[];
        if (!current.includes(created.name)) {
          productForm.setFieldValue("categories", [...current, created.name]);
        }
        setNewProductCategory("");
      },
    });
  };

  const toProductPayload = (v: Record<string, unknown>): Partial<Product> => {
    const cleanedPhotoUrls: string[] = ((v.photoUrls || []) as string[])
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const cleanedCategories: string[] = ((v.categories || []) as string[])
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    const finalCategories =
      cleanedCategories.length > 0 ? cleanedCategories : ["Прочее"];
    const lowerCategories = finalCategories.map((c) => c.toLowerCase());
    const lowerName = String(v.name || "").toLowerCase();
    const isCombo = !!v.isCombo;
    const isComboByText =
      lowerCategories.some((c) => c.includes("комбо") || c.includes("combo")) ||
      lowerName.includes("комбо") ||
      lowerName.includes("combo");
    const isLaptopByText =
      lowerCategories.some(
        (c) =>
          c.includes("ноутбук") ||
          c.includes("ноут") ||
          c.includes("laptop") ||
          c.includes("notebook"),
      ) ||
      lowerName.includes("ноутбук") ||
      lowerName.includes("ноут") ||
      lowerName.includes("laptop") ||
      lowerName.includes("notebook");
    const isPrinterByText =
      lowerCategories.some((c) => c.includes("принтер") || c.includes("printer")) ||
      lowerName.includes("принтер") ||
      lowerName.includes("printer");
    const inferredManagerEarnings = isCombo || isComboByText
      ? 1500
      : isLaptopByText
        ? 1000
        : isPrinterByText
          ? 500
          : undefined;
    const manualManagerEarnings =
      v.managerEarnings !== undefined && v.managerEarnings !== null && String(v.managerEarnings).trim() !== ""
        ? Number(v.managerEarnings)
        : undefined;
    const managerEarnings = inferredManagerEarnings ?? manualManagerEarnings;

    return {
      ...v,
      categories: finalCategories,
      category: finalCategories[0],
      branchName: v.branchName as string,
      isCombo,
      comboItems: v.isCombo
        ? (
            (v.comboItems || []) as { productId?: string; quantity?: number }[]
          ).filter(
            (x): x is { productId: string; quantity: number } =>
              !!x.productId && Number(x.quantity || 0) > 0,
          )
        : null,
      photoUrls: cleanedPhotoUrls,
      photoUrl: cleanedPhotoUrls[0],
      costPrice: v.isCombo ? 0 : Number(v.costPrice || 0),
      stockQty: v.isCombo
        ? comboAvailableFromSelection
        : Number(v.stockQty || 0),
      managerEarnings,
    };
  };

  const closeProductModal = () => setProductModal(false);
  const editingProduct = editingItem as Product | null;
  const productModalProps = {
    open: isProductModal,
    form: productForm,
    products,
    suppliers,
    branches,
    productCategoryOptions,
    newProductCategory,
    setNewProductCategory,
    addCategoryLoading: createProductCategory.isPending,
    productIsCombo: !!productIsCombo,
    comboAvailableFromSelection,
    productPhotoUrls: productPhotoUrls as string[] | undefined,
    isUploadingPhoto,
    onCancel: closeProductModal,
    onAddCategory: addProductCategory,
    onUploadProductPhoto: uploadProductPhoto,
  };

  if (!user) return <LoginScreen />;

  return (
    <Layout className="min-h-screen">
      <Sider
        theme={appTheme}
        breakpoint="lg"
        collapsedWidth="0"
        className="h-screen sticky top-0"
      >
        <div
          className={`  p-5 text-center ${appTheme === "dark" ? "text-white" : "text-gray-800"} font-bold text-xl`}
        >
          <div className="flex items-center justify-center gap-2">
            {appSettings?.companyLogoUrl ? (
              <img
                src={toSafeMediaUrl(appSettings.companyLogoUrl)}
                alt="company-logo"
                className="w-8 h-8 rounded object-cover border border-gray-300"
              />
            ) : null}
            <span>{appSettings?.companyName || "TOMSTORE"}</span>
          </div>
        </div>
        <Menu
          theme={appTheme}
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={(e) => setActiveTab(e.key)}
          items={menuItems}
        />
        <div className="p-4 absolute bottom-0 w-full">
          <Button
            block
            danger
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
          >
            Выйти
          </Button>
        </div>
      </Sider>
      <Layout>
        <AppHeader
          title={menuItems.find((i) => i.key === activeTab)?.label}
          isDark={appTheme === "dark"}
          userName={user.name}
          onThemeChange={(dark) => setAppTheme(dark ? "dark" : "light")}
          onOpenProfile={() => {
            setEditingItem(user);
            setProfileModal(true);
          }}
        />
        <Content className="p-4 md:p-6 overflow-y-auto overflow-x-auto h-[calc(100vh-64px)]">
          {activeTab === "1" && (
            <Dashboard
              sales={sales}
              expenses={expenses}
              bonuses={bonuses}
              managers={managers}
              branches={branches}
              targets={targets}
              user={user}
            />
          )}
          {activeTab === "2" && (
            <div className="animate-fade-in">
              <div className="flex justify-end mb-4">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingItem(null);
                    setSaleModal(true);
                  }}
                >
                  Новый заказ
                </Button>
              </div>
              <SalesTable
                data={sales}
                managers={managers}
                currentUser={user}
                isAdmin={isAdmin}
                onlyMine={salesFilters.onlyMine}
                filterType={salesFilters.filterType}
                filterDate={salesFilters.filterDate}
                onOnlyMineChange={salesFilters.setOnlyMine}
                onFilterTypeChange={salesFilters.setFilterType}
                onFilterDateChange={salesFilters.setFilterDate}
                onEdit={(s) => {
                  setEditingItem(s as Sale);
                  setSaleModal(true);
                }}
                onDelete={(id) => deleteSale.mutate(id)}
                onStatusChange={(id, status) =>
                  updateSale.mutate({ id, data: { deliveryStatus: status } })
                }
                formatDate={formatDate}
                deliveryStatuses={DELIVERY_STATUSES}
              />
            </div>
          )}
          {activeTab === "3" && canAccessWarehouse && (
            <WarehousePanel
              user={user}
              canManageProducts={canStorekeeperManageProducts}
              branchName={isAdmin ? undefined : user.branchName}
              importLoading={importProducts.isPending}
              onCreateProduct={() => {
                setEditingItem(null);
                setProductModal(true);
              }}
              onEditProduct={(p) => {
                setEditingItem(p as Product);
                setProductModal(true);
              }}
              onImportProducts={(file) =>
                importProducts.mutate({
                  file,
                  branchName: isAdmin ? undefined : user.branchName,
                })
              }
            />
          )}
          {activeTab === "7" && isAdmin && (
            <SuppliersSection
              suppliers={suppliers}
              isDark={appTheme === "dark"}
              formatPhone={formatPhone}
              onAdd={() => {
                setEditingItem(null);
                setSupplierModal(true);
              }}
              onEdit={(supplier) => {
                setEditingItem(supplier as Supplier);
                setSupplierModal(true);
              }}
              onDelete={(id) => deleteSupplier.mutate(id)}
            />
          )}
          {activeTab === "8" && isAdmin && (
            <BranchesSection
              branches={branches}
              formatDate={formatDate}
              onAdd={() => setBranchModal(true)}
              onOpenDetails={(branch) => setBranchDetails(branch as Branch)}
              onDelete={(id) => deleteBranch.mutate(id)}
            />
          )}
          {activeTab === "4" && isAdmin && (
            <ManagersSection
              managers={managers}
              deletedManagers={deletedManagers}
              canManagePrivileged={isSuperAdmin}
              onShowDetails={(manager) =>
                setEmployeeDetailsManager(manager as Manager)
              }
              onEdit={(manager) => {
                setEditingItem(manager as Manager);
                setManagerModal(true);
              }}
              onDelete={(id) => deleteManager.mutate(id)}
              onAdd={() => {
                setEditingItem(null);
                setManagerModal(true);
              }}
              onRestore={(id) => restoreManager.mutate(id)}
              formatPhone={formatPhone}
              formatBirthDate={formatBirthDate}
              formatDate={formatDate}
            />
          )}
          {activeTab === "5" && isAdmin && (
            <FinanceSection
              sales={sales}
              expenses={expenses}
              bonuses={bonuses}
              targets={targets}
              managers={managers}
              combinedPayouts={combinedPayouts}
              onOpenExpense={() => setExpenseModal(true)}
              onOpenFinance={() => setFinanceModal(true)}
              onOpenTarget={() => setTargetModal(true)}
              onDeleteTarget={(id) => deleteTarget.mutate(id)}
              onIssueTargetReward={(target) =>
                issueTargetReward.mutate({
                  id: target.id,
                  approvedBy: user.name,
                })
              }
              issuingTargetReward={issueTargetReward.isPending}
              canApproveTargetReward={isAdmin}
              onOpenSalaryHistory={(payload) =>
                setSalaryHistoryManager(payload)
              }
              formatDate={formatDate}
            />
          )}
          {activeTab === "9" && (
            <div className="animate-fade-in">
              <MaterialsPanel
                materialsPage={materialsPageData}
                folders={materialFolders}
                selectedFolderId={materialsFolderId}
                search={materialsSearch}
                isAdmin={isAdmin}
                onSearchChange={setMaterialsSearch}
                onSelectFolder={setMaterialsFolderId}
                onCreateFolder={() => {
                  materialFolderForm.resetFields();
                  materialFolderForm.setFieldsValue({
                    sortOrder: materialFolders.length + 1,
                  });
                  setMaterialFolderModal(true);
                }}
                onCreate={() => {
                  setEditingItem(null);
                  materialForm.resetFields();
                  materialForm.setFieldsValue({
                    type: "document",
                    isPublished: true,
                    folderId: materialsFolderId,
                    lessonOrder: 1,
                  });
                  setMaterialModal(true);
                }}
                onEdit={(m) => {
                  setEditingItem(m);
                  materialForm.setFieldsValue(m);
                  setMaterialModal(true);
                }}
                onPreviewVideo={(m) => setPreviewMaterial(m)}
                onDeleteFolder={(id) => deleteMaterialFolder.mutate(id)}
                onPageChange={onMaterialsPageChange}
                onDelete={(id) => deleteMaterial.mutate(id)}
                formatDate={formatDate}
              />
            </div>
          )}
          {activeTab === "10" && isSuperAdmin && (
            <div className="animate-fade-in space-y-4">
              <Card
                size="small"
                title="Owner Report"
                extra={
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={downloadOwnerCsv}
                  >
                    Экспорт CSV
                  </Button>
                }
              >
                <div className="flex flex-wrap gap-3">
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Филиалы (все)"
                    style={{ minWidth: 300 }}
                    value={ownerSelectedBranches}
                    onChange={setOwnerSelectedBranches}
                    maxTagCount="responsive"
                  >
                    {ownerAvailableBranches.map((name) => (
                      <Option key={name} value={name}>
                        {name}
                      </Option>
                    ))}
                  </Select>
                  <RangePicker
                    value={ownerRange}
                    onChange={(v) => {
                      if (v?.[0] && v?.[1]) setOwnerRange([v[0], v[1]]);
                    }}
                    allowClear={false}
                  />
                </div>
              </Card>

              <Row gutter={[12, 12]}>
                <Col xs={12} sm={8} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="Выручка"
                      value={ownerStats.revenue}
                      suffix="c"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="Расходы"
                      value={ownerStats.expensesTotal}
                      suffix="c"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="Бонусы"
                      value={ownerStats.bonusesTotal}
                      suffix="c"
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={8} lg={6}>
                  <Card size="small">
                    <Statistic
                      title="Чистая прибыль"
                      value={ownerStats.netProfit}
                      suffix="c"
                      styles={{
                        content: {
                          color:
                            ownerStats.netProfit >= 0 ? "#3f8600" : "#cf1322",
                        },
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card size="small" title="Отчет по филиалам">
                <Table
                  size="small"
                  rowKey="key"
                  scroll={{ x: 900 }}
                  dataSource={ownerBranchRows}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: "Филиал", dataIndex: "branch" },
                    { title: "Заказы", dataIndex: "orders", width: 90 },
                    {
                      title: "Выручка",
                      dataIndex: "revenue",
                      render: (v: number) => `${v.toLocaleString()} c`,
                    },
                    {
                      title: "Расходы",
                      dataIndex: "expenses",
                      render: (v: number) => `${v.toLocaleString()} c`,
                    },
                    {
                      title: "Чистая прибыль",
                      dataIndex: "net",
                      render: (v: number) => (
                        <span
                          className={v >= 0 ? "text-green-600" : "text-red-500"}
                        >
                          {v.toLocaleString()} c
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>

              <Card size="small" title="Отчет по сотрудникам">
                <Table
                  size="small"
                  rowKey="key"
                  dataSource={ownerManagerRows}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 900 }}
                  columns={[
                    { title: "Сотрудник", dataIndex: "manager" },
                    { title: "Филиал", dataIndex: "branch" },
                    { title: "Роль", dataIndex: "role" },
                    { title: "Заказы", dataIndex: "orders", width: 90 },
                    {
                      title: "Выручка",
                      dataIndex: "revenue",
                      render: (v: number) => `${v.toLocaleString()} c`,
                    },
                    {
                      title: "К выплате",
                      dataIndex: "payout",
                      render: (v: number) => (
                        <span
                          className={v >= 0 ? "text-green-600" : "text-red-500"}
                        >
                          {v.toLocaleString()} c
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>
            </div>
          )}
          {activeTab === "6" && (
            <SettingsSection
              user={{
                id: user.id,
                name: user.name,
                role: user.role,
              }}
              sales={sales}
              isAdmin={isAdmin}
              appTheme={appTheme}
              companyForm={companyForm}
              isUploadingCompanyLogo={isUploadingCompanyLogo}
              profileSubmitting={updateProfile.isPending}
              companySubmitting={updateAppSettings.isPending}
              onProfileSubmit={(v) => updateProfile.mutate(v)}
              onCompanySubmit={(v) => updateAppSettings.mutate(v)}
              onThemeChange={(dark) => setAppTheme(dark ? "dark" : "light")}
              onUploadCompanyLogo={uploadCompanyLogo}
              formatDate={formatDate}
              deliveryStatuses={DELIVERY_STATUSES}
            />
          )}
        </Content>
      </Layout>

      {/* Modals */}
      <Modal
        open={isSaleModal}
        title={editingItem ? "Редактировать" : "Новый заказ"}
        footer={null}
        onCancel={() => setSaleModal(false)}
        width={700}
      >
        <SaleForm
          initialValues={editingItem}
          products={products}
          branches={branches}
          managers={managers}
          isAdmin={isAdmin}
          currentUser={user}
          isDark={appTheme === "dark"}
          getAvailableStock={getAvailableStock}
          onSubmit={(vals) => {
            if (editingItem)
              updateSale.mutate({ id: editingItem.id, data: vals });
            else createSale.mutate(vals);
            setSaleModal(false);
          }}
        />
      </Modal>

      {editingProduct ? (
        <ProductModal
          {...productModalProps}
          isEditing
          editingProductId={editingProduct.id}
          onSubmit={(v) => {
            updateProduct.mutate({
              id: editingProduct.id,
              data: toProductPayload(v),
            });
            closeProductModal();
          }}
        />
      ) : (
        <CreateProductModal
          {...productModalProps}
          onCreate={(v) => {
            createProduct.mutate(toProductPayload(v));
            closeProductModal();
          }}
        />
      )}

      <FinanceAccrualModal
        open={isFinanceModal}
        managers={managers}
        managerPayoutMeta={managerPayoutMeta}
        onCancel={() => setFinanceModal(false)}
        onSubmit={(v) => {
          const maxPayable = managerPayoutMeta[v.managerId]?.maxPayable ?? 0;
          if (Number(v.amount || 0) > maxPayable) {
            message.error(
              `Максимально доступно: ${maxPayable.toLocaleString()} c`,
            );
            return;
          }
          const isAdvance = v.type === "advance";
          createTransaction.mutate(
            {
              type: isAdvance ? "expense" : "bonus",
              payload: {
                amount: v.amount,
                managerId: v.managerId,
                reason: v.reason,
                category: isAdvance ? "Аванс" : undefined,
              },
            },
            {
              onSuccess: () => {
                setFinanceModal(false);
              },
            },
          );
        }}
      />

      <ManagerModal
        open={isManagerModal}
        isEditing={!!editingItem}
        form={managerForm}
        branches={branches}
        canAssignAdmin={isSuperAdmin}
        canAssignSuperadmin={isSuperAdmin}
        managerPhotoUrl={toSafeMediaUrl(managerPhotoUrl)}
        isUploadingManagerPhoto={isUploadingManagerPhoto}
        normalizeKgPhone={normalizeKgPhone}
        isValidKgPhone={isValidKgPhone}
        onUploadManagerPhoto={uploadManagerPhoto}
        onCancel={() => {
          setManagerModal(false);
          setEditingItem(null);
        }}
        onSubmit={(v) => {
          const selectedBranch = branches.find((b) => b.id === v.branchId);
          let normalizedRoles = Array.from(
            new Set(
              [...(v.roles || []), v.role].filter((role): role is Role =>
                Boolean(role),
              ),
            ),
          );
          if (!isSuperAdmin) {
            normalizedRoles = normalizedRoles.filter(
              (r) => r !== "admin" && r !== "superadmin",
            );
          }
          const normalizedRole =
            !isSuperAdmin && (v.role === "admin" || v.role === "superadmin")
              ? ("manager" as Role)
              : v.role;
          const salaryType =
            v.salaryType === "fixed" || normalizedRoles.includes("cashier")
              ? ("fixed" as const)
              : ("commission" as const);
          const payload = {
            ...v,
            role: normalizedRole,
            roles: normalizedRoles,
            salaryType,
            fixedMonthlySalary:
              salaryType === "fixed" ? Number(v.fixedMonthlySalary || 0) : 0,
            canManageProducts: normalizedRoles.includes("storekeeper")
              ? !!v.canManageProducts
              : false,
            phone: normalizeKgPhone(v.phone),
            birthDate: v.birthDate
              ? dayjs(v.birthDate).startOf("day").toISOString()
              : undefined,
            branchId: selectedBranch?.id,
            branchName: selectedBranch?.name,
          };
          if (editingItem) {
            updateManager.mutate({ id: editingItem.id, data: payload });
          } else {
            createManager.mutate(payload);
          }
          setManagerModal(false);
          setEditingItem(null);
        }}
      />

      <SupplierModal
        open={isSupplierModal}
        isEditing={!!editingItem}
        form={supplierForm}
        onCancel={() => {
          setSupplierModal(false);
          supplierForm.resetFields();
          setEditingItem(null);
        }}
        onOpenMap={() => setMapAddressModal(true)}
        onSubmit={(v) => {
          if (editingItem) {
            updateSupplier.mutate({ id: editingItem.id, data: v });
          } else {
            createSupplier.mutate(v);
          }
          setSupplierModal(false);
          supplierForm.resetFields();
          setEditingItem(null);
        }}
      />

      <BranchCreateModal
        open={isBranchModal}
        form={branchForm}
        onCancel={() => {
          setBranchModal(false);
          branchForm.resetFields();
        }}
        onSubmit={(v) => {
          createBranch.mutate(v, {
            onSuccess: () => {
              setBranchModal(false);
              branchForm.resetFields();
            },
          });
        }}
      />

      <BranchDetailsModal
        open={!!branchDetails}
        title={
          branchDetails
            ? `Детали филиала: ${branchDetails.name}`
            : "Детали филиала"
        }
        data={branchDetailsData}
        movements={branchMovements}
        onCancel={() => setBranchDetails(null)}
        formatDate={formatDate}
        formatPhone={formatPhone}
        getAvailableStock={getAvailableStock}
        resolveOperationType={(movement) =>
          resolveOperationType(
            movement as InventoryMovement,
            INVENTORY_OPERATION_META,
          )
        }
        inventoryOperationMeta={INVENTORY_OPERATION_META}
        formatMovementQty={formatMovementQty}
      />

      <TargetModal
        open={isTargetModal}
        managers={managers}
        onCancel={() => {
          setTargetModal(false);
          setEditingItem(null);
        }}
        onSubmit={(v) => {
          createTarget.mutate({
            ...v,
            rewardType: v.rewardType || "money",
            reward:
              (v.rewardType || "money") === "money" ? Number(v.reward || 0) : 0,
            rewardText:
              (v.rewardType || "money") === "material"
                ? String(v.rewardText || "").trim()
                : undefined,
            deadline: v.deadline ? dayjs(v.deadline).toISOString() : undefined,
          });
          setTargetModal(false);
          setEditingItem(null);
        }}
      />

      <MaterialModal
        open={isMaterialModal}
        isEditing={!!editingItem}
        form={materialForm}
        folders={materialFolders}
        isUploadingMaterialFile={isUploadingMaterialFile}
        onCancel={() => {
          setMaterialModal(false);
          setEditingItem(null);
          materialForm.resetFields();
        }}
        onUploadMaterialFile={uploadMaterialFile}
        onUploadMaterialThumbnail={uploadMaterialThumbnail}
        onSubmit={(v) => {
          const payload: Partial<TrainingMaterial> = {
            ...v,
            title: String(v.title || "").trim(),
            url: String(v.url || "").trim(),
            createdById: user?.id,
            createdByName: user?.name,
          };
          if (editingItem) {
            updateMaterial.mutate(
              { id: editingItem.id, data: payload },
              {
                onSuccess: () => {
                  setMaterialModal(false);
                  setEditingItem(null);
                  materialForm.resetFields();
                },
              },
            );
          } else {
            createMaterial.mutate(payload, {
              onSuccess: () => {
                setMaterialModal(false);
                materialForm.resetFields();
              },
            });
          }
        }}
      />

      <MaterialFolderModal
        open={isMaterialFolderModal}
        form={materialFolderForm}
        onCancel={() => {
          setMaterialFolderModal(false);
          materialFolderForm.resetFields();
        }}
        onSubmit={(v) => {
          createMaterialFolder.mutate(v, {
            onSuccess: () => {
              setMaterialFolderModal(false);
              materialFolderForm.resetFields();
            },
          });
        }}
      />

      <MaterialPreviewModal
        material={previewMaterial}
        onCancel={() => setPreviewMaterial(null)}
        isDirectVideoFile={isDirectVideoFile}
        toVideoEmbedUrl={toVideoEmbedUrl}
      />

      {/* Expense modal using ExpenseForm */}
      <Modal
        open={isExpenseModal}
        title="Добавить расход"
        footer={null}
        onCancel={() => setExpenseModal(false)}
      >
        <ExpenseForm
          managers={managers}
          categories={EXPENSE_CATEGORIES}
          onFinish={(v: Partial<Expense>) => {
            createTransaction.mutate(
              {
                type: "expense",
                payload: v as Record<string, unknown>,
              },
              {
                onSuccess: () => {
                  setExpenseModal(false);
                },
              },
            );
          }}
        />
      </Modal>

      <ProfileModal
        open={isProfileModal}
        initialValues={
          editingItem
            ? {
                name: (editingItem as Manager).name,
              }
            : undefined
        }
        onCancel={() => setProfileModal(false)}
        onSubmit={(v) => {
          updateProfile.mutate(v);
          setProfileModal(false);
        }}
      />

      <SalaryHistoryModal
        open={!!salaryHistoryManager}
        data={salaryHistory}
        onCancel={() => setSalaryHistoryManager(null)}
        formatDate={formatDate}
      />

      <EmployeeDetailsModal
        open={!!employeeDetailsManager}
        details={employeeDetails}
        onCancel={() => setEmployeeDetailsManager(null)}
        formatDate={formatDate}
        deliveryStatuses={DELIVERY_STATUSES}
      />

      <MapAddressPickerModal
        open={isMapAddressModal}
        onCancel={() => setMapAddressModal(false)}
        onSelect={(address) => {
          supplierForm.setFieldValue("address", address);
          setMapAddressModal(false);
        }}
      />
    </Layout>
  );
};

const App = () => {
  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
