type MovementLike = {
  operationType?: string;
  reason?: string;
  type?: "in" | "out" | "adjustment" | string;
  quantity?: number;
};

type ProductLike = {
  id: string;
  stockQty?: number;
  isCombo?: boolean;
  comboItems?: { productId: string; quantity: number }[] | null;
};

export const resolveOperationType = (
  movement: MovementLike,
  operationMeta: Record<string, unknown>,
) => {
  if (movement.operationType && operationMeta[movement.operationType]) {
    return movement.operationType;
  }
  const reason = String(movement.reason || "").toLowerCase();
  if (reason.startsWith("продажа")) return "sale";
  if (movement.type === "in") return "manual_in";
  if (movement.type === "out") return "manual_out";
  return "adjustment";
};

export const formatMovementQty = (movement: MovementLike) => {
  const sign =
    movement.type === "in" ? "+" : movement.type === "out" ? "-" : "±";
  return `${sign}${Number(movement.quantity || 0).toLocaleString()} шт`;
};

export const getAvailableStock = (
  product: ProductLike,
  products: ProductLike[],
) => {
  if (!product.isCombo || !product.comboItems?.length) {
    return Number(product.stockQty || 0);
  }
  const stockById = new Map(products.map((p) => [p.id, Number(p.stockQty || 0)]));
  const maxCombos = product.comboItems.map((item) => {
    const componentStock = stockById.get(item.productId) ?? 0;
    const perCombo = Number(item.quantity || 0);
    if (perCombo <= 0) return 0;
    return Math.floor(componentStock / perCombo);
  });
  if (maxCombos.length === 0) return 0;
  return Math.max(0, Math.min(...maxCombos));
};
