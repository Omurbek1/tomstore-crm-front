import { useMemo } from "react";
import { getAvailableStock } from "../../../shared/lib/inventory";
import { useInventoryMovements } from "../../warehouse/model/hooks";

type BranchLike = {
  name: string;
};

type SaleLike = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  clientName: string;
  productName: string;
  managerName: string;
  branch: string;
  total: number;
  quantity: number;
  costPriceSnapshot: number;
  managerEarnings: number;
  deliveryCost?: number;
};

type ManagerLike = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  branchName?: string;
  photoUrl?: string;
};

type ProductLike = {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  branchName?: string;
  stockQty?: number;
  isCombo?: boolean;
  comboItems?: { productId: string; quantity: number }[] | null;
};

type ExpenseLike = {
  id: string;
  createdAt: string;
  category: string;
  comment?: string;
  amount: number;
  managerId?: string;
  managerName?: string;
};

type BonusLike = {
  id: string;
  createdAt: string;
  reason: string;
  amount: number;
  managerId?: string;
  managerName: string;
};

type Params = {
  branch: BranchLike | null;
  sales: SaleLike[];
  managers: ManagerLike[];
  products: ProductLike[];
  expenses: ExpenseLike[];
  bonuses: BonusLike[];
};

export const useBranchDetailsData = ({
  branch,
  sales,
  managers,
  products,
  expenses,
  bonuses,
}: Params) => {
  const { data: movements = [] } = useInventoryMovements(undefined, branch?.name);

  const data = useMemo(() => {
    if (!branch) return null;
    const branchName = branch.name;
    const branchSales = sales
      .filter((s) => s.branch === branchName)
      .sort(
        (a, b) =>
          new Date(b.manualDate || b.createdAt).getTime() -
          new Date(a.manualDate || a.createdAt).getTime(),
      );
    const branchManagers = managers.filter((m) => m.branchName === branchName);
    const branchProducts = products.filter(
      (p) => (p.branchName || "Центральный") === branchName,
    );

    const managerIds = new Set(branchManagers.map((m) => m.id));
    const managerNames = new Set(branchManagers.map((m) => m.name));
    const branchExpenses = expenses.filter(
      (e) =>
        (!!e.managerId && managerIds.has(e.managerId)) ||
        (!!e.managerName && managerNames.has(e.managerName)),
    );
    const branchBonuses = bonuses.filter(
      (b) =>
        (!!b.managerId && managerIds.has(b.managerId)) ||
        (!!b.managerName && managerNames.has(b.managerName)),
    );

    const revenue = branchSales.reduce((sum, s) => sum + s.total, 0);
    const profit = branchSales.reduce(
      (sum, s) =>
        sum +
        (s.total -
          s.costPriceSnapshot * s.quantity -
          s.managerEarnings -
          (s.deliveryCost || 0)),
      0,
    );
    const directExpensesTotal = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
    const bonusesTotal = branchBonuses.reduce((sum, b) => sum + b.amount, 0);
    const expensesTotal = directExpensesTotal + bonusesTotal;
    const net = profit - expensesTotal;
    const lowStockCount = branchProducts.filter(
      (p) => getAvailableStock(p, branchProducts) <= 3,
    ).length;

    return {
      branchName,
      branchSales,
      branchManagers,
      branchProducts,
      branchExpenses,
      branchBonuses,
      revenue,
      profit,
      expensesTotal,
      bonusesTotal,
      net,
      lowStockCount,
    };
  }, [branch, sales, managers, products, expenses, bonuses]);

  return { data, movements };
};
