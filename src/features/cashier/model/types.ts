export type ProductLike = {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice?: number;
  category?: string;
  sku?: string;
  serialNumber?: string;
  requiresSerial?: boolean;
  stockQty?: number;
  branchName?: string;
  barcode?: string;
  photoUrl?: string;
  photoUrls?: string[] | null;
  characteristics?: string;
};

export type BranchLike = {
  id: string;
  name: string;
};

export type CurrentUserLike = {
  id?: string;
  name?: string;
  branchName?: string;
};

export type CartItem = {
  key: string;
  productId: string;
  productName: string;
  sku?: string;
  price: number;
  quantity: number;
  discount: number;
  discountType?: "amount" | "percent";
  serialNumber?: string;
  requiresSerial?: boolean;
  costPriceSnapshot: number;
};

export type ReceiptSnapshot = {
  items: CartItem[];
  clientName: string;
  paymentType: "cash" | "manual" | "hybrid";
  paymentLabel?: string;
  hybridCash: number;
  hybridCard: number;
  hybridTransfer: number;
  total: number;
  cashierName: string;
  branchName: string;
  createdAt: string;
};

export type CashierRecentSale = {
  id: string;
  createdAt: string;
  productName: string;
  clientName?: string;
  paymentType: string;
  paymentLabel?: string;
  total: number;
};
