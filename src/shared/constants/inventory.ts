export type InventoryType = "in" | "out" | "adjustment";

export type InventoryOperationType =
  | "sale"
  | "purchase"
  | "writeoff"
  | "return_in"
  | "return_out"
  | "transfer_in"
  | "transfer_out"
  | "adjustment"
  | "manual_in"
  | "manual_out"
  | "other";

export const INVENTORY_OPERATION_META: Record<
  InventoryOperationType,
  { label: string; color: string; defaultType: InventoryType }
> = {
  sale: { label: "Продажа", color: "volcano", defaultType: "out" },
  purchase: { label: "Приход поставки", color: "green", defaultType: "in" },
  writeoff: { label: "Списание", color: "red", defaultType: "out" },
  return_in: { label: "Возврат на склад", color: "cyan", defaultType: "in" },
  return_out: {
    label: "Возврат поставщику",
    color: "orange",
    defaultType: "out",
  },
  transfer_in: { label: "Перемещение (вход)", color: "blue", defaultType: "in" },
  transfer_out: {
    label: "Перемещение (выход)",
    color: "geekblue",
    defaultType: "out",
  },
  adjustment: {
    label: "Инвентаризация",
    color: "purple",
    defaultType: "adjustment",
  },
  manual_in: { label: "Ручной приход", color: "green", defaultType: "in" },
  manual_out: { label: "Ручной расход", color: "red", defaultType: "out" },
  other: { label: "Другое", color: "default", defaultType: "adjustment" },
};
