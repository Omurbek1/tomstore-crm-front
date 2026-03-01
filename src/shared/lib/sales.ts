type SaleDeliveryLike = {
  saleType?: "office" | "delivery" | string;
  total?: number;
  price?: number;
  quantity?: number;
  discount?: number;
  deliveryCost?: number;
  deliveryPaidByCompany?: boolean;
};

export const isDeliveryPaidByCompany = (sale: SaleDeliveryLike) => {
  if (sale.saleType !== "delivery") return false;
  const deliveryCost = Number(sale.deliveryCost || 0);
  if (deliveryCost <= 0) return false;
  if (typeof sale.deliveryPaidByCompany === "boolean") {
    return sale.deliveryPaidByCompany;
  }
  const baseTotal = Math.max(
    0,
    Number(sale.price || 0) * Number(sale.quantity || 0) - Number(sale.discount || 0),
  );
  const total = Number(sale.total || 0);
  return !(total > baseTotal + 0.01);
};

export const deliveryCostExpense = (sale: SaleDeliveryLike) =>
  isDeliveryPaidByCompany(sale) ? Number(sale.deliveryCost || 0) : 0;

