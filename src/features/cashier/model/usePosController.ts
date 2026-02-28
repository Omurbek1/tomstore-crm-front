import { useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import type { InputRef } from "antd";
import { useCloseCashShift, useCurrentCashShift, useOpenCashShift } from "../../../hooks/api";
import { useBarcodeScanner } from "../../../shared/lib/useBarcodeScanner";
import type { BranchLike, CartItem, CurrentUserLike, ProductLike, ReceiptSnapshot } from "./types";

export type PaymentMethod = string;
export type DiscountType = "amount" | "percent";
export type CompletedReceipt = {
  id: string;
  createdAt: string;
  clientName: string;
  cashierName: string;
  branchName: string;
  total: number;
  paymentMethod: string;
  productName?: string;
  quantity?: number;
};

type SaleHistoryLike = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  clientName?: string;
  productName: string;
  quantity: number;
  total: number;
  paymentType?: string;
  paymentLabel?: string;
  managerId?: string;
  branch?: string;
  shiftId?: string;
};

const isLikelySerialProduct = (product: ProductLike) => {
  if (product.requiresSerial) return true;
  const value = `${product.name} ${product.category || ""}`.toLowerCase();
  return /ноут|телефон|iphone|samsung|xiaomi|macbook|смартфон/.test(value);
};

const calcItemDiscount = (item: CartItem) => {
  const gross = item.price * item.quantity;
  if (item.discountType === "percent") {
    const percent = Math.max(0, Math.min(100, Number(item.discount || 0)));
    return (gross * percent) / 100;
  }
  return Math.max(0, Number(item.discount || 0));
};

const calcItemTotal = (item: CartItem) => {
  const gross = item.price * item.quantity;
  return Math.max(0, gross - calcItemDiscount(item));
};

const roundMoney = (value: number) => Math.round(Number(value || 0));

export const usePosController = ({
  products,
  branches,
  currentUser,
  manualPaymentTypes,
  salesHistory,
  onCreateSale,
  getAvailableStock,
}: {
  products: ProductLike[];
  branches: BranchLike[];
  currentUser: CurrentUserLike;
  manualPaymentTypes?: string[];
  salesHistory: SaleHistoryLike[];
  onCreateSale: (payload: Record<string, unknown>) => Promise<unknown>;
  getAvailableStock: (product: ProductLike, products: ProductLike[]) => number;
}) => {
  const userId = currentUser.id;
  const userName = currentUser.name || "Кассир";
  const searchRef = useRef<InputRef>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [now, setNow] = useState(new Date());

  const [branch] = useState(currentUser.branchName || branches[0]?.name || "Центральный");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const clientName = "Розничный клиент";
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [openingCash, setOpeningCash] = useState(0);
  const [closingCash, setClosingCash] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [checkDiscount, setCheckDiscount] = useState(0);
  const [received, setReceived] = useState(0);
  const [comment, setComment] = useState("");
  const [returnMode, setReturnMode] = useState(false);

  const [quickProductsOpen, setQuickProductsOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [discountValue, setDiscountValue] = useState(0);

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptSnapshot | null>(null);
  const [lastReceiptNo, setLastReceiptNo] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);

  const [mobileTab, setMobileTab] = useState("products");

  const manualPaymentOptions = useMemo(() => {
    const blocked = new Set(["hybrid", "гибрид", "cash", "наличные"]);
    const values = (manualPaymentTypes || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item) => !blocked.has(item.toLowerCase()));
    return Array.from(new Set(values));
  }, [manualPaymentTypes]);

  useEffect(() => {
    if (paymentMethod === "cash") return;
    if (!manualPaymentOptions.includes(paymentMethod)) {
      setPaymentMethod("cash");
    }
  }, [manualPaymentOptions, paymentMethod]);

  const currentShiftQuery = useCurrentCashShift(userId);
  const openShift = useOpenCashShift();
  const closeShift = useCloseCashShift();
  const currentShift = currentShiftQuery.data || null;

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, []);

  const closeCurrentShift = () => {
    if (!currentShift?.id) return;
    closeShift.mutate({
      id: currentShift.id,
      payload: { closingCash: Number(closingCash || 0) },
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const inputEl = (searchRef.current as unknown as { input?: HTMLInputElement } | null)?.input;
    if (!inputEl) return;
    if (document.activeElement !== inputEl) inputEl.focus();
  }, []);

  const normalizedBranch = useMemo(
    () => String(branch || "").trim().toLowerCase(),
    [branch],
  );
  const productsByBranch = useMemo(() => {
    if (!normalizedBranch) return products;
    return products.filter((p) => {
      const productBranch = String(p.branchName || "").trim().toLowerCase();
      if (!productBranch) return true;
      return productBranch === normalizedBranch;
    });
  }, [products, normalizedBranch]);
  const barcodeIndex = useMemo(() => {
    const map = new Map<string, ProductLike>();
    productsByBranch.forEach((p) => {
      const barcode = String(p.barcode || "").trim();
      if (barcode) map.set(barcode, p);
    });
    return map;
  }, [productsByBranch]);
  const nameExactIndex = useMemo(() => {
    const map = new Map<string, ProductLike>();
    productsByBranch.forEach((p) => {
      map.set(p.name.toLowerCase(), p);
    });
    return map;
  }, [productsByBranch]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch) return productsByBranch;
    const q = debouncedSearch.toLowerCase();
    return productsByBranch.filter((p) => {
      const v = `${p.name} ${p.barcode || ""} ${p.sku || ""} ${p.characteristics || ""}`.toLowerCase();
      return v.includes(q);
    });
  }, [productsByBranch, debouncedSearch]);

  const quickProducts = useMemo(
    () => filteredProducts.filter((p) => getAvailableStock(p, products) > 0).slice(0, 24),
    [filteredProducts, products],
  );
  const searchOptions = useMemo(
    () =>
      filteredProducts.slice(0, 20).map((p) => ({
        value: p.id,
        label: `${p.name} · ${Number(p.sellingPrice || 0).toLocaleString()} c`,
      })),
    [filteredProducts],
  );

  const activeItem = useMemo(() => cart.find((x) => x.key === activeKey) || null, [cart, activeKey]);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + calcItemTotal(item), 0), [cart]);
  const total = useMemo(() => Math.max(0, subtotal - Number(checkDiscount || 0)), [subtotal, checkDiscount]);
  const change = useMemo(() => Math.max(0, Number(received || 0) - total), [received, total]);

  const payBlockReason = useMemo(() => {
    if (!currentShift) return "Сначала откройте смену";
    if (cart.length === 0) return "Добавьте товары в чек";
    const hasUnfilledSerial = cart.some(
      (x) => x.requiresSerial && !String(x.serialNumber || "").trim(),
    );
    if (hasUnfilledSerial) return "Заполните Serial/IMEI для серийных товаров";
    if (!returnMode && paymentMethod === "cash" && Number(received || 0) < total) {
      return "Сумма получено меньше итога";
    }
    if (total <= 0) return "Итоговая сумма должна быть больше 0";
    return null;
  }, [cart, currentShift, paymentMethod, received, returnMode, total]);

  const canPay = !payBlockReason;

  const completedReceipts = useMemo(() => {
    const rows = salesHistory
      .filter((sale) => {
        const byCashier = userId ? sale.managerId === userId : true;
        const byBranch = branch ? sale.branch === branch : true;
        if (!byCashier || !byBranch) return false;
        if (currentShift?.id) return sale.shiftId === currentShift.id;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.manualDate || a.createdAt).getTime();
        const db = new Date(b.manualDate || b.createdAt).getTime();
        return db - da;
      })
      .map((sale) => {
        const method = String(sale.paymentLabel || sale.paymentType || "manual");
        return {
          id: sale.id,
          createdAt: sale.manualDate || sale.createdAt,
          clientName: sale.clientName || "Розничный клиент",
          cashierName: userName,
          branchName: sale.branch || branch,
          total: Number(sale.total || 0),
          paymentMethod: method as PaymentMethod,
          productName: sale.productName,
          quantity: Number(sale.quantity || 0),
        };
      });
    return rows;
  }, [salesHistory, userId, branch, currentShift?.id, userName]);

  const appendProductToCart = (product: ProductLike, serialNumber?: string) => {
    const available = getAvailableStock(product, products);
    if (!returnMode && available <= 0) {
      message.warning("Товара нет в наличии");
      return;
    }

    const serialRequired = isLikelySerialProduct(product);
    if (serialRequired) {
      const serial = String(serialNumber || "").trim();
      setCart((prev) => {
        const idx = prev.findIndex((x) => {
          if (x.productId !== product.id || !x.requiresSerial) return false;
          if (serial) return String(x.serialNumber || "") === serial;
          return !String(x.serialNumber || "").trim();
        });

        if (idx >= 0) {
          const next = [...prev];
          const nextQty = next[idx].quantity + 1;
          if (!returnMode && nextQty > available) {
            message.warning(`Доступно только ${available} шт`);
            return prev;
          }
          next[idx] = { ...next[idx], quantity: nextQty };
          setActiveKey(next[idx].key);
          return next;
        }

        const newItem: CartItem = {
          key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: Number(product.sellingPrice || 0),
          quantity: 1,
          discount: 0,
          discountType: "amount",
          serialNumber: serial || "",
          requiresSerial: true,
          costPriceSnapshot: Number(product.costPrice || 0),
        };
        setActiveKey(newItem.key);
        return [newItem, ...prev];
      });
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === product.id && !x.requiresSerial);
      if (idx < 0) {
        const newItem: CartItem = {
          key: `${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: Number(product.sellingPrice || 0),
          quantity: 1,
          discount: 0,
          discountType: "amount",
          requiresSerial: false,
          costPriceSnapshot: Number(product.costPrice || 0),
        };
        setActiveKey(newItem.key);
        return [newItem, ...prev];
      }
      const next = [...prev];
      const nextQty = next[idx].quantity + 1;
      if (!returnMode && nextQty > available) {
        message.warning(`Доступно только ${available} шт`);
        return prev;
      }
      next[idx] = { ...next[idx], quantity: nextQty };
      setActiveKey(next[idx].key);
      return next;
    });
  };

  const onScanSubmit = () => {
    const value = String(searchInput || "").trim();
    if (!value) return;
    const normalized = value.toLowerCase();
    const byBarcode = barcodeIndex.get(value);
    if (byBarcode) {
      appendProductToCart(byBarcode);
      setSearchInput("");
      return;
    }

    const byExactName = nameExactIndex.get(normalized);
    if (byExactName) {
      appendProductToCart(byExactName);
      setSearchInput("");
      return;
    }

    const byName = productsByBranch.filter((p) => p.name.toLowerCase().includes(normalized));
    if (byName.length === 1) {
      appendProductToCart(byName[0]);
      setSearchInput("");
      return;
    }

    setDebouncedSearch(value);
    message.info("Показаны результаты поиска по названию");
  };

  useBarcodeScanner({
    enabled: true,
    minLength: 5,
    onScan: (code) => {
      setSearchInput(code);
      const product = barcodeIndex.get(String(code).trim());
      if (product) {
        appendProductToCart(product);
        setSearchInput("");
      } else {
        setDebouncedSearch(String(code).trim());
        message.info("Товар не найден");
      }
    },
  });

  const selectByOffset = (offset: number) => {
    if (!cart.length) return;
    const currentIndex = Math.max(0, cart.findIndex((x) => x.key === activeKey));
    const nextIndex = Math.min(cart.length - 1, Math.max(0, currentIndex + offset));
    setActiveKey(cart[nextIndex].key);
  };

  const changeActiveQty = (delta: number) => {
    if (!activeItem) return;
    const product = products.find((p) => p.id === activeItem.productId);
    if (!product) return;
    const available = getAvailableStock(product, products);
    const nextQty = activeItem.quantity + delta;
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((x) => x.key !== activeItem.key));
      setActiveKey(null);
      return;
    }
    if (!returnMode && nextQty > available) {
      message.warning(`Доступно только ${available} шт`);
      return;
    }
    setCart((prev) => prev.map((x) => (x.key === activeItem.key ? { ...x, quantity: nextQty } : x)));
  };

  const deleteActive = () => {
    if (!activeItem) return;
    setCart((prev) => prev.filter((x) => x.key !== activeItem.key));
    setActiveKey(null);
  };

  const openDiscountModal = () => {
    if (!activeItem) {
      message.warning("Выберите позицию для скидки");
      return;
    }
    setDiscountType(activeItem.discountType || "amount");
    setDiscountValue(Number(activeItem.discount || 0));
    setDiscountModalOpen(true);
  };

  const applyDiscount = () => {
    if (!activeItem) return;
    setCart((prev) =>
      prev.map((x) =>
        x.key === activeItem.key
          ? {
              ...x,
              discountType,
              discount:
                discountType === "percent"
                  ? Math.max(0, Math.min(100, Number(discountValue || 0)))
                  : Math.max(0, Number(discountValue || 0)),
            }
          : x,
      ),
    );
    setDiscountModalOpen(false);
  };

  const handlePrint = () => {
    if (!printRef.current || !lastReceipt) {
      message.warning("Нет чека для печати");
      return;
    }
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) {
      message.warning("Разрешите всплывающие окна для печати");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Печать чека</title>
          <style>body { font-family: Arial, sans-serif; margin: 0; padding: 8px; }</style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const submitPayment = async () => {
    if (!currentShift?.id) {
      message.warning("Сначала откройте смену");
      return;
    }
    if (!canPay) {
      message.warning("Заполните обязательные поля и серийные номера");
      return;
    }

    try {
      const lineTotals = cart.map((item) => calcItemTotal(item));
      const subtotalBeforeCheckDiscount = lineTotals.reduce((sum, v) => sum + v, 0);
      const normalizedCheckDiscount = Math.max(
        0,
        Math.min(Number(checkDiscount || 0), subtotalBeforeCheckDiscount),
      );
      let distributedDiscountLeft = normalizedCheckDiscount;

      for (let index = 0; index < cart.length; index += 1) {
        const item = cart[index];
        const lineTotal = lineTotals[index];
        const isLast = index === cart.length - 1;
        const distributedDiscount = isLast
          ? distributedDiscountLeft
          : roundMoney(
              subtotalBeforeCheckDiscount > 0
                ? (normalizedCheckDiscount * lineTotal) / subtotalBeforeCheckDiscount
                : 0,
            );
        distributedDiscountLeft = Math.max(0, distributedDiscountLeft - distributedDiscount);
        const netLineTotal = Math.max(0, lineTotal - distributedDiscount);

        const signedQty = returnMode ? -Math.abs(item.quantity) : item.quantity;
        const signedTotal = returnMode ? -Math.abs(netLineTotal) : netLineTotal;

        await onCreateSale({
          clientName: clientName.trim() || "Розничный клиент",
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: signedQty,
          discount: Number(item.discount || 0),
          discountType: item.discountType || "amount",
          checkDiscount: index === 0 ? normalizedCheckDiscount : 0,
          serialNumber: item.serialNumber,
          sku: item.sku,
          costPriceSnapshot: item.costPriceSnapshot,
          total: signedTotal,
          branch: branch || currentUser.branchName || "Центральный",
          shiftId: currentShift.id,
          paymentType: paymentMethod,
          paymentLabel: paymentMethod,
          managerId: currentUser.id,
          managerName: currentUser.name || "Кассир",
          managerEarnings: 0,
          saleType: "office",
          deliveryStatus: "delivered",
          comment,
          isReturn: returnMode,
        });
      }

      const receipt: ReceiptSnapshot = {
        items: cart,
        clientName: clientName.trim() || "Розничный клиент",
        paymentType: paymentMethod === "cash" ? "cash" : "manual",
        paymentLabel: paymentMethod,
        hybridCash: 0,
        hybridCard: 0,
        hybridTransfer: 0,
        total,
        cashierName: userName,
        branchName: branch,
        createdAt: new Date().toLocaleString(),
      };

      const receiptNo = `R-${Date.now().toString().slice(-8)}`;
      setLastReceipt(receipt);
      setLastReceiptNo(receiptNo);
      setCart([]);
      setActiveKey(null);
      setReceived(0);
      setCheckDiscount(0);
      setComment("");
      setSearchInput("");
      setReturnMode(false);
      setSuccessModalOpen(true);
      message.success(`Чек ${receiptNo} успешно создан`);
    } catch (error: unknown) {
      const text =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response!.data!.message!
          : "Не удалось завершить оплату";
      message.error(text);
    }
  };

  const submitPaymentRef = useRef(submitPayment);
  const openDiscountModalRef = useRef(openDiscountModal);
  const selectByOffsetRef = useRef(selectByOffset);
  const changeActiveQtyRef = useRef(changeActiveQty);
  const deleteActiveRef = useRef(deleteActive);
  useEffect(() => {
    submitPaymentRef.current = submitPayment;
    openDiscountModalRef.current = openDiscountModal;
    selectByOffsetRef.current = selectByOffset;
    changeActiveQtyRef.current = changeActiveQty;
    deleteActiveRef.current = deleteActive;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        const inputEl = (searchRef.current as unknown as { input?: HTMLInputElement } | null)?.input;
        inputEl?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        setQuickProductsOpen(true);
      }
      if (event.key === "F6") {
        event.preventDefault();
        openDiscountModalRef.current();
      }
      if (event.key === "F8") {
        event.preventDefault();
        setPaymentMethod("cash");
      }
      if (event.key === "F9") {
        event.preventDefault();
        if (manualPaymentOptions.length > 0) {
          setPaymentMethod(manualPaymentOptions[0]);
        }
      }
      if (event.key === "F10") {
        event.preventDefault();
        void submitPaymentRef.current();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setQuickProductsOpen(false);
        setDiscountModalOpen(false);
        setSuccessModalOpen(false);
        setReturnMode(false);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectByOffsetRef.current(-1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectByOffsetRef.current(1);
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeActiveQtyRef.current(1);
      }
      if (event.key === "-") {
        event.preventDefault();
        changeActiveQtyRef.current(-1);
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        const tag = (target?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        event.preventDefault();
        deleteActiveRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [manualPaymentOptions]);

  return {
    userId,
    userName,
    searchRef,
    printRef,
    online,
    now,
    branch,
    searchInput,
    setSearchInput,
    debouncedSearch,
    clientName,
    paymentMethod,
    setPaymentMethod,
    manualPaymentOptions,
    openingCash,
    setOpeningCash,
    closingCash,
    setClosingCash,
    cart,
    setCart,
    activeKey,
    setActiveKey,
    checkDiscount,
    setCheckDiscount,
    received,
    setReceived,
    comment,
    setComment,
    returnMode,
    setReturnMode,
    quickProductsOpen,
    setQuickProductsOpen,
    discountModalOpen,
    setDiscountModalOpen,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    successModalOpen,
    setSuccessModalOpen,
    lastReceipt,
    setLastReceipt,
    lastReceiptNo,
    setLastReceiptNo,
    historyOpen,
    setHistoryOpen,
    completedReceipts,
    mobileTab,
    setMobileTab,
    currentShiftQuery,
    openShift,
    closeShift,
    closeCurrentShift,
    currentShift,
    productsByBranch,
    filteredProducts,
    quickProducts,
    searchOptions,
    activeItem,
    subtotal,
    total,
    change,
    payBlockReason,
    canPay,
    appendProductToCart,
    onScanSubmit,
    selectByOffset,
    changeActiveQty,
    deleteActive,
    openDiscountModal,
    applyDiscount,
    handlePrint,
    submitPayment,
    calcItemTotal,
  };
};
