import { create } from "zustand";

type ThemeMode = "light" | "dark";
type UiMode = "default" | "comfort";
type Role = "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";

type StoreUser = {
  id: string;
  createdAt: string;
  updatedAt: string;
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
  theme?: ThemeMode;
  canManageProducts?: boolean;
  deleted?: boolean;
};

interface AppStore {
  user: StoreUser | null;
  appTheme: ThemeMode;
  uiMode: UiMode;
  setUser: (user: StoreUser | null) => void;
  setAppTheme: (mode: ThemeMode) => void;
  setUiMode: (mode: UiMode) => void;
  logout: () => void;
}

const applyUiToDom = (themeMode: ThemeMode, uiMode: UiMode) => {
  const body = document.body;
  const html = document.documentElement;
  html.setAttribute("data-theme", themeMode);
  html.setAttribute("data-ui-mode", uiMode);
  if (themeMode === "dark") {
    html.classList.add("dark");
    body.classList.add("bg-gray-900");
  } else {
    html.classList.remove("dark");
    body.classList.remove("bg-gray-900");
  }
};

export const useAppStore = create<AppStore>((set) => ({
  user: JSON.parse(localStorage.getItem("tomstore_user") || "null"),
  appTheme: (localStorage.getItem("tomstore_theme") as ThemeMode) || "light",
  uiMode: (localStorage.getItem("tomstore_ui_mode") as UiMode) || "default",

  setUser: (user) => {
    if (user) localStorage.setItem("tomstore_user", JSON.stringify(user));
    else localStorage.removeItem("tomstore_user");
    set({ user });
  },

  setAppTheme: (mode) => {
    const uiMode =
      (localStorage.getItem("tomstore_ui_mode") as UiMode) || "default";
    localStorage.setItem("tomstore_theme", mode);
    set({ appTheme: mode });
    applyUiToDom(mode, uiMode);
  },

  setUiMode: (mode) => {
    const themeMode =
      (localStorage.getItem("tomstore_theme") as ThemeMode) || "light";
    localStorage.setItem("tomstore_ui_mode", mode);
    set({ uiMode: mode });
    applyUiToDom(themeMode, mode);
  },

  logout: () => {
    localStorage.removeItem("tomstore_user");
    localStorage.removeItem("token");
    set({ user: null });
  },
}));

if (typeof window !== "undefined") {
  const themeMode =
    (localStorage.getItem("tomstore_theme") as ThemeMode) || "light";
  const uiMode =
    (localStorage.getItem("tomstore_ui_mode") as UiMode) || "default";
  applyUiToDom(themeMode, uiMode);
}
