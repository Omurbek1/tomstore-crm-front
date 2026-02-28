import { useState, useEffect, useMemo } from "react";
import {
  Layout,
  Menu,
  Button,
  Modal,
  Form,
  message,
} from "antd";
import {
  ShoppingCartOutlined,
  DashboardOutlined,
  TeamOutlined,
  WalletOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  ShopOutlined,
  SolutionOutlined,
  ReadOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ru";
import { api, API_BASE_URL } from "../api/httpClient";
import { useAppStore } from "../store/appStore";
import {
  useAppSettings,
  useBonuses,
  useBranches,
  useCreateBranch,
  useCreateManager,
  useCreateMaterial,
  useCreateMaterialFolder,
  useCreateProduct,
  useCreateProductCategory,
  useCreateSale,
  useCreateSupplier,
  useCreateTarget,
  useCreateTransaction,
  useDeleteBranch,
  useDeleteManager,
  useDeleteMaterial,
  useDeleteMaterialFolder,
  useDeleteSale,
  useDeleteSupplier,
  useDeleteTarget,
  useDeletedManagers,
  useExpenses,
  useImportProducts,
  useIssueTargetReward,
  useManagers,
  useManagersPayoutMeta,
  useMaterialFolders,
  useMaterials,
  useProducts,
  useProductCategories,
  useRestoreManager,
  useSales,
  useSuppliers,
  useTargets,
  useUpdateAppSettings,
  useUpdateManager,
  useUpdateMaterial,
  useUpdateProduct,
  useUpdateProfile,
  useUpdateSale,
  useUpdateSupplier,
} from "../hooks/api";
import { toSafeMediaUrl } from "../security/url";
import { formatBirthDate, formatDate, formatPhone } from "../shared/lib/format";
import { isValidKgPhone, normalizeKgPhone } from "../shared/lib/phone";
import { isDirectVideoFile, toVideoEmbedUrl } from "../shared/lib/media";
import {
  formatMovementQty,
  getAvailableStock,
  resolveOperationType,
} from "../shared/lib/inventory";
import { INVENTORY_OPERATION_META } from "../shared/constants/inventory";
import { DELIVERY_STATUSES } from "../shared/constants/sales";
import {
  EXPENSE_CATEGORIES,
  PRODUCT_CATEGORIES,
} from "../shared/constants/catalog";
import { AppHeader } from "../shared/ui/AppHeader";
import {
  type PaginatedMaterials,
  type TrainingMaterial,
} from "../entities/material/model/types";
import { useMaterialsFilters } from "../features/materials-list/model/useMaterialsFilters";
import { MaterialsPanel } from "../features/materials-list/ui/MaterialsPanel";
import { useSalesFilters } from "../features/sales-list/model/useSalesFilters";
import { SalesTable } from "../features/sales-list/ui/SalesTable";
import { Dashboard } from "../features/dashboard/ui/Dashboard";
import { WarehousePanel } from "../features/warehouse/ui/WarehousePanel";
import { LoginScreen } from "../features/auth/ui/LoginScreen";
import type { InventoryMovement } from "../features/warehouse/model/hooks";
import { ProductModal } from "../features/products-list/ui/ProductModal";
import { CreateProductModal } from "../features/products-list/ui/CreateProductModal";
import { ManagersSection } from "../features/managers-list/ui/ManagersSection";
import { FinanceSection } from "../features/finance/ui/FinanceSection";
import { SettingsSection } from "../features/settings/ui/SettingsSection";
import { FinanceAccrualModal } from "../features/finance/ui/FinanceAccrualModal";
import { BranchCreateModal } from "../features/branches/ui/BranchCreateModal";
import { BranchesSection } from "../features/branches/ui/BranchesSection";
import { useBranchDetailsData } from "../features/branches/model/useBranchDetailsData";
import { ProfileModal } from "../features/profile/ui/ProfileModal";
import { ManagerModal } from "../features/managers-list/ui/ManagerModal";
import { SupplierModal } from "../features/suppliers/ui/SupplierModal";
import { SuppliersSection } from "../features/suppliers/ui/SuppliersSection";
import { TargetModal } from "../features/targets/ui/TargetModal";
import { MaterialModal } from "../features/materials-list/ui/MaterialModal";
import { MaterialFolderModal } from "../features/materials-list/ui/MaterialFolderModal";
import { MaterialPreviewModal } from "../features/materials-list/ui/MaterialPreviewModal";
import { BranchDetailsModal } from "../features/branches/ui/BranchDetailsModal";
import { EmployeeDetailsModal } from "../features/managers-list/ui/EmployeeDetailsModal";
import { SalaryHistoryModal } from "../features/managers-list/ui/SalaryHistoryModal";
import { MapAddressPickerModal } from "../features/suppliers/ui/MapAddressPickerModal";
import { ExpenseForm } from "../features/expenses/ui/ExpenseForm";
import { SaleForm } from "../features/sales-form/ui/SaleForm";
import { OwnerReportSection } from "../features/owner-report/ui/OwnerReportSection";
import { RepairsSection } from "../features/repairs/ui/RepairsSection";

dayjs.locale("ru");

const { Sider, Content } = Layout;

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
  barcode?: string;
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

const AppContent = () => {
  const { user, appTheme, uiMode, setAppTheme, setUiMode, logout } =
    useAppStore();
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

  const uploadProductPhoto = async (options: any) => {
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

  const uploadManagerPhoto = async (options: any) => {
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

  const uploadCompanyLogo = async (options: any) => {
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

  const uploadMaterialFile = async (options: any) => {
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

  const uploadMaterialThumbnail = async (options: any) => {
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
      ownerSelectedBranches.length > 0 ? new Set(ownerSelectedBranches) : null,
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
      const branch = b.managerId
        ? managerBranchById.get(b.managerId)
        : undefined;
      return !!branch && ownerBranchFilterSet.has(branch);
    });
  }, [bonuses, ownerBranchFilterSet, ownerRange, managerBranchById]);

  const ownerFilteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!inOwnerRange(e.createdAt)) return false;
      if (!ownerBranchFilterSet) return true;
      const branch = e.managerId
        ? managerBranchById.get(e.managerId)
        : undefined;
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
          managers
            .filter((m) => (m.branchName || "—") === name)
            .map((m) => m.id),
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
        const salaryFromSales = ms.reduce(
          (sum, s) => sum + s.managerEarnings,
          0,
        );
        const bonusesTotal = mb.reduce((sum, b) => sum + b.amount, 0);
        const deductions = me
          .filter((e) => e.category === "Аванс" || e.category === "Штраф")
          .reduce((sum, e) => sum + e.amount, 0);
        const fixed =
          m.salaryType === "fixed" ? Number(m.fixedMonthlySalary || 0) : 0;
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
  }, [
    managers,
    ownerBranchFilterSet,
    ownerFilteredSales,
    ownerFilteredBonuses,
    ownerFilteredExpenses,
  ]);

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
    rows.push([
      "Сотрудник",
      "Филиал",
      "Роль",
      "Заказы",
      "Выручка",
      "К выплате",
    ]);
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
      key: "11",
      icon: <ToolOutlined />,
      label: (
        <p className={appTheme === "dark" ? "text-white" : "text-gray-800"}>
          Ремонт
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
      lowerCategories.some(
        (c) => c.includes("принтер") || c.includes("printer"),
      ) ||
      lowerName.includes("принтер") ||
      lowerName.includes("printer");
    const inferredManagerEarnings =
      isCombo || isComboByText
        ? 1500
        : isLaptopByText
          ? 1000
          : isPrinterByText
            ? 500
            : undefined;
    const manualManagerEarnings =
      v.managerEarnings !== undefined &&
      v.managerEarnings !== null &&
      String(v.managerEarnings).trim() !== ""
        ? Number(v.managerEarnings)
        : undefined;
    const managerEarnings = inferredManagerEarnings ?? manualManagerEarnings;
    const barcode = String(v.barcode || "")
      .trim()
      .replace(/\s+/g, "");

    return {
      ...v,
      barcode: barcode || undefined,
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
    <Layout className="app-root min-h-screen">
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
          onClick={(e) => {
            if (e.key === "logout") {
              logout();
              return;
            }
            setActiveTab(e.key);
          }}
          items={[
            ...menuItems,
            {
              key: "logout",
              icon: <LogoutOutlined />,
              label: "Выйти",
              danger: true,
            },
          ]}
        />
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
        <Content
          className={`app-main-content p-4  overflow-y-auto overflow-x-auto h-[calc(100vh-64px)] transition-colors duration-300 ${
            appTheme === "dark" ? "is-dark" : "is-light"
          }`}
        >
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
            <OwnerReportSection
              ownerAvailableBranches={ownerAvailableBranches}
              ownerSelectedBranches={ownerSelectedBranches}
              ownerRange={ownerRange}
              ownerStats={ownerStats}
              ownerBranchRows={ownerBranchRows}
              ownerManagerRows={ownerManagerRows}
              onOwnerBranchesChange={setOwnerSelectedBranches}
              onOwnerRangeChange={setOwnerRange}
              onExportCsv={downloadOwnerCsv}
            />
          )}
          {activeTab === "11" && (
            <RepairsSection
              currentUserName={user.name}
              branches={branches}
              products={products}
              formatDate={formatDate}
            />
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
              uiMode={uiMode}
              companyForm={companyForm}
              isUploadingCompanyLogo={isUploadingCompanyLogo}
              profileSubmitting={updateProfile.isPending}
              companySubmitting={updateAppSettings.isPending}
              onProfileSubmit={(v) => updateProfile.mutate(v)}
              onCompanySubmit={(v) => updateAppSettings.mutate(v)}
              onThemeChange={(dark) => setAppTheme(dark ? "dark" : "light")}
              onUiModeChange={setUiMode}
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


export { AppContent };
