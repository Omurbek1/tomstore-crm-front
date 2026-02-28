import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  HistoryOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import type { BranchLike, CartItem, CurrentUserLike, ProductLike } from "../model/types";
import { PrintReceipt } from "./components/PrintReceipt";
import {
  usePosController,
  type DiscountType,
} from "../model/usePosController";

type Props = {
  products: ProductLike[];
  sales: {
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
  }[];
  branches: BranchLike[];
  currentUser: CurrentUserLike;
  isAdmin?: boolean;
  manualPaymentTypes?: string[];
  getAvailableStock: (product: ProductLike, products: ProductLike[]) => number;
  onCreateSale: (payload: Record<string, unknown>) => Promise<unknown>;
  submitting?: boolean;
};

export const CashierModeSection = ({
  products,
  sales,
  branches,
  currentUser,
  isAdmin,
  manualPaymentTypes = [],
  getAvailableStock,
  onCreateSale,
  submitting,
}: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const getModalContainer = () => rootRef.current || document.body;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [historySearch, setHistorySearch] = useState("");

  const isFullMode = isImmersive || isFullscreen;

  const toggleFullscreen = async () => {
    try {
      if (isFullMode) {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsImmersive(false);
        return;
      }
      setIsImmersive(true);
      if (document.fullscreenEnabled) {
        await (rootRef.current || document.documentElement).requestFullscreen();
      }
    } catch {
      // Fallback to immersive mode when Fullscreen API is unavailable.
      setIsImmersive(true);
    }
  };

  const scrollInputIntoView = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return;
    window.setTimeout(() => {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }, 120);
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    if (isFullMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevBodyOverflow;
    }
    return () => {
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isFullMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullMode) {
        setIsImmersive(false);
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullMode]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewportResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset > 40 ? offset : 0);
    };
    vv.addEventListener("resize", onViewportResize);
    vv.addEventListener("scroll", onViewportResize);
    onViewportResize();
    return () => {
      vv.removeEventListener("resize", onViewportResize);
      vv.removeEventListener("scroll", onViewportResize);
    };
  }, []);

  const {
    userId,
    userName,
    searchRef,
    printRef,
    online,
    now,
    branch,
    searchInput,
    setSearchInput,
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
    lastReceiptNo,
    historyOpen,
    setHistoryOpen,
    completedReceipts,
    mobileTab,
    setMobileTab,
    openShift,
    closeShift,
    closeCurrentShift,
    currentShift,
    productsByBranch,
    filteredProducts,
    quickProducts,
    searchOptions,
    canPay,
    total,
    change,
    payBlockReason,
    appendProductToCart,
    onScanSubmit,
    changeActiveQty,
    deleteActive,
    openDiscountModal,
    applyDiscount,
    handlePrint,
    submitPayment,
    calcItemTotal,
  } = usePosController({
    products,
    branches,
    currentUser,
    manualPaymentTypes,
    salesHistory: sales,
    onCreateSale,
    getAvailableStock,
  });

  const historyRows = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return completedReceipts;
    return completedReceipts.filter((row) =>
      [
        row.id,
        row.clientName,
        row.cashierName,
        row.branchName,
        row.paymentMethod,
        row.productName || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [completedReceipts, historySearch]);

  const historyStats = useMemo(() => {
    const salesCount = historyRows.filter((x) => Number(x.total || 0) >= 0).length;
    const refundsCount = historyRows.filter((x) => Number(x.total || 0) < 0).length;
    const net = historyRows.reduce((sum, x) => sum + Number(x.total || 0), 0);
    return {
      salesCount,
      refundsCount,
      net,
    };
  }, [historyRows]);
  const desktopMain = (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="basis-[70%] min-h-0 p-2">
        <Card size="small" className="h-full" title="Чек">
          <Table
            rowKey="key"
            size="middle"
            dataSource={cart}
            pagination={false}
            sticky
            virtual
            scroll={{ y: "calc(70vh - 170px)", x: 1100 }}
            rowClassName={(row) => (row.key === activeKey ? "!bg-blue-50 dark:!bg-blue-900/30" : "")}
            onRow={(record) => ({ onClick: () => setActiveKey(record.key) })}
            columns={[
              {
                title: "Наименование",
                dataIndex: "productName",
                render: (v: string, row: CartItem) => (
                  <div>
                    <div>{v}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{row.sku || "—"}</div>
                    {row.requiresSerial ? (
                      <Input
                        size="small"
                        value={row.serialNumber || ""}
                        placeholder="Serial / IMEI"
                        onFocus={(e) => scrollInputIntoView(e.target)}
                        onChange={(e) => {
                          const serial = e.target.value;
                          setCart((prev) => prev.map((x) => (x.key === row.key ? { ...x, serialNumber: serial } : x)));
                        }}
                      />
                    ) : null}
                  </div>
                ),
              },
              {
                title: "Цена",
                dataIndex: "price",
                width: 120,
                align: "right",
                render: (v: number) => `${v.toLocaleString()} c`,
              },
              {
                title: "Кол-во",
                width: 180,
                render: (_: unknown, row: CartItem) => (
                  <Space>
                    <Button size="small" icon={<MinusOutlined />} onClick={() => {
                      setActiveKey(row.key);
                      changeActiveQty(-1);
                    }} />
                    <span>{row.quantity}</span>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => {
                      setActiveKey(row.key);
                      changeActiveQty(1);
                    }} />
                  </Space>
                ),
              },
              {
                title: "Скидка",
                width: 220,
                render: (_: unknown, row: CartItem) => (
                  <Space>
                    <Segmented
                      size="small"
                      value={row.discountType || "amount"}
                      options={[
                        { label: "%", value: "percent" },
                        { label: "сом", value: "amount" },
                      ]}
                      onChange={(v) => {
                        setCart((prev) => prev.map((x) => (x.key === row.key ? { ...x, discountType: v as DiscountType } : x)));
                      }}
                    />
                    <InputNumber
                      min={0}
                      value={row.discount}
                      onChange={(n) => {
                        const next = Number(n || 0);
                        setCart((prev) => prev.map((x) => (x.key === row.key ? { ...x, discount: next } : x)));
                      }}
                    />
                  </Space>
                ),
              },
              {
                title: "Сумма",
                width: 140,
                align: "right",
                render: (_: unknown, row: CartItem) => `${calcItemTotal(row).toLocaleString()} c`,
              },
            ]}
          />
        </Card>
      </div>

      <div className="basis-[30%] min-h-0 p-2 pt-0">
        <Row gutter={[12, 12]} className="h-full">
          <Col xs={24} md={10} className="h-full">
            <Card size="small" className="h-full" title="ИТОГО">
              <div className="flex h-full flex-col justify-center gap-2">
                <div className="text-5xl font-bold leading-none text-blue-600">{total.toLocaleString()} c</div>
                <InputNumber
                  min={0}
                  value={received}
                  onChange={(v) => setReceived(Number(v || 0))}
                  onFocus={(e) => scrollInputIntoView(e.target)}
                  size="large"
                  style={{ width: "100%" }}
                  placeholder="Получено"
                />
                <div className="text-xl font-semibold text-emerald-600">Сдача: {change.toLocaleString()} c</div>
                <InputNumber
                  min={0}
                  value={checkDiscount}
                  onChange={(v) => setCheckDiscount(Number(v || 0))}
                  onFocus={(e) => scrollInputIntoView(e.target)}
                  size="large"
                  style={{ width: "100%" }}
                  placeholder="Скидка на чек"
                />
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={(e) => scrollInputIntoView(e.target)}
                  placeholder="Комментарий"
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} md={14} className="h-full">
            <Card size="small" className="h-full" title="Действия">
              <div className="h-full flex gap-2">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button size="large" className="!h-14" onClick={() => setQuickProductsOpen(true)}>
                    Быстрые товары
                  </Button>
                  <Button size="large" className="!h-14" onClick={openDiscountModal}>
                    Скидка
                  </Button>
                  <Button
                    size="large"
                    className={`!h-14 ${returnMode ? "!bg-orange-500 !text-white" : ""}`}
                    onClick={() => setReturnMode((v) => !v)}
                  >
                    Возврат
                  </Button>
                  <Button size="large" danger className="!h-14" onClick={deleteActive} icon={<DeleteOutlined />}>
                    Удалить
                  </Button>
                  <Button
                    size="large"
                    className={`!h-14 ${paymentMethod === "cash" ? "!border-green-500 !text-green-600" : ""}`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    Наличные
                  </Button>
                  {manualPaymentOptions.slice(0, 3).map((method) => (
                    <Button
                      key={method}
                      size="large"
                      className={`!h-14 ${paymentMethod === method ? "!border-blue-500 !text-blue-600" : ""}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </Button>
                  ))}
                  <Button
                    type="primary"
                    size="large"
                    className="!h-14 !bg-green-600 col-span-2 md:col-span-1"
                    loading={submitting}
                    disabled={!canPay}
                    onClick={submitPayment}
                  >
                    Оплата
                  </Button>
                </div>

                <div className="w-16 flex flex-col gap-2">
                  <Button size="large" className="!h-[48%]" icon={<PlusOutlined />} onClick={() => changeActiveQty(1)} />
                  <Button size="large" className="!h-[48%]" icon={<MinusOutlined />} onClick={() => changeActiveQty(-1)} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );

  const mobileMain = (
    <div className="flex-1 min-h-0 overflow-hidden">
      <Tabs
        activeKey={mobileTab}
        onChange={setMobileTab}
        items={[
          {
            key: "products",
            label: "Товары",
            children: (
              <div className="h-[calc(100vh-190px)] overflow-auto p-2 grid grid-cols-1 gap-2">
                {filteredProducts.slice(0, 80).map((p) => (
                  <Button
                    key={p.id}
                    block
                    className="!h-14 flex !justify-between"
                    onClick={() => appendProductToCart(p)}
                    disabled={getAvailableStock(p, products) <= 0}
                  >
                    <span>{p.name}</span>
                    <span>{Number(p.sellingPrice || 0).toLocaleString()} c</span>
                  </Button>
                ))}
              </div>
            ),
          },
          {
            key: "check",
            label: "Чек",
            children: (
              <div className="h-[calc(100vh-190px)] overflow-auto p-2">
                <Table
                  rowKey="key"
                  size="small"
                  dataSource={cart}
                  pagination={false}
                  virtual
                  onRow={(record) => ({ onClick: () => setActiveKey(record.key) })}
                  columns={[
                    { title: "Товар", dataIndex: "productName" },
                    { title: "Кол", dataIndex: "quantity", width: 60 },
                    {
                      title: "Сумма",
                      width: 120,
                      align: "right",
                      render: (_: unknown, row: CartItem) => `${calcItemTotal(row).toLocaleString()} c`,
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white dark:bg-slate-900 p-2">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-xs text-slate-500 dark:text-slate-300">ИТОГО</div>
            <div className="text-2xl font-bold">{total.toLocaleString()} c</div>
          </div>
          <Button
            type="primary"
            size="large"
            className="!bg-green-600 !h-12"
            loading={submitting}
            disabled={!canPay}
            onClick={submitPayment}
          >
            Оплатить
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`cashier-fullmode h-screen overflow-hidden ${isFullMode ? "cashier-fullmode--active" : ""}`}
      style={keyboardOffset ? { paddingBottom: `${keyboardOffset}px` } : undefined}
    >
      <div className="cashier-fullmode__header h-14 border-b px-2 md:px-3 flex items-center justify-between gap-2">
        <AutoComplete
          className="!max-w-[540px] w-full"
          options={searchOptions}
          value={searchInput}
          onChange={setSearchInput}
          onSelect={(productId) => {
            const product = productsByBranch.find((p) => p.id === productId);
            if (product) {
              appendProductToCart(product);
              setSearchInput("");
            }
          }}
          filterOption={false}
        >
          <Input
            ref={searchRef as never}
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={onScanSubmit}
            onFocus={(e) => scrollInputIntoView(e.target)}
            placeholder="Сканируйте штрихкод или ищите товар"
            prefix={<SearchOutlined />}
          />
        </AutoComplete>

        <Space wrap size={8}>
          <Badge color={online ? "green" : "red"} text={online ? "Online" : "Offline"} />
          <Tag color={isFullMode ? "gold" : "default"}>{isFullMode ? "FULL MODE" : "Стандарт"}</Tag>
          <Tag>{userName}</Tag>
          <Tag color="blue">{branch}</Tag>
          {currentShift && Number(currentShift.debtBefore || 0) > 0 ? (
            <Tag color="red">
              Долг: {Number(currentShift.debtBefore || 0).toLocaleString()} c
            </Tag>
          ) : null}
          {isAdmin ? <Tag color="purple">Админ</Tag> : null}
          <Tag>{now.toLocaleTimeString()}</Tag>
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
            История продаж
          </Button>
          <Button
            icon={isFullMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          >
            {isFullMode ? "Выйти из full mode" : "Full mode"}
          </Button>
          {!currentShift ? (
            <Space>
              <InputNumber
                min={0}
                value={openingCash}
                onChange={(v) => setOpeningCash(Number(v || 0))}
                onFocus={(e) => scrollInputIntoView(e.target)}
                placeholder="Старт"
              />
              <Button
                type="primary"
                loading={openShift.isPending}
                onClick={() => {
                  if (!userId) return;
                  openShift.mutate({
                    cashierId: userId,
                    cashierName: userName,
                    branchName: branch,
                    openingCash: Number(openingCash || 0),
                  });
                }}
              >
                Открыть смену
              </Button>
            </Space>
          ) : (
            <Space>
              <Tag color="green">Смена открыта</Tag>
              <InputNumber
                min={0}
                value={closingCash}
                onChange={(v) => setClosingCash(Number(v || 0))}
                onFocus={(e) => scrollInputIntoView(e.target)}
                placeholder="Факт кассы"
              />
              <Button danger loading={closeShift.isPending} onClick={closeCurrentShift}>
                Закрыть смену
              </Button>
            </Space>
          )}
        </Space>
      </div>

      {!currentShift ? (
        <div className="p-2">
          <Alert type="warning" showIcon message="Сначала откройте смену" />
        </div>
      ) : null}

      {currentShift ? (
        <div className="px-2 pt-2 shrink-0">
          <Alert
            type={payBlockReason ? "warning" : "success"}
            showIcon
            message={
              payBlockReason
                ? `Оплата недоступна: ${payBlockReason}`
                : "Касса готова к оплате"
            }
          />
        </div>
      ) : null}

      {currentShift && Number(currentShift.debtBefore || 0) > 0 ? (
        <div className="px-2 pt-2 shrink-0">
          <Alert
            type="error"
            showIcon
            message={`Накопленный долг кассира: ${Number(currentShift.debtBefore || 0).toLocaleString()} c`}
            description="Если при закрытии смены будет недостача, долг увеличится автоматически."
          />
        </div>
      ) : null}

      <div className="hidden md:flex flex-1 min-h-0">{desktopMain}</div>
      <div className="md:hidden flex-1 min-h-0">{mobileMain}</div>

      <Modal
        open={quickProductsOpen}
        title="Быстрые товары"
        footer={null}
        onCancel={() => setQuickProductsOpen(false)}
        width={900}
        zIndex={1800}
        getContainer={getModalContainer}
      >
        {quickProducts.length === 0 ? (
          <Alert
            type="info"
            showIcon
            message="Нет доступных товаров"
            description="Проверьте филиал кассира и остаток товара (остаток должен быть > 0)."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[65vh] overflow-auto">
            {quickProducts.map((p) => (
              <Button
                key={p.id}
                className="!h-14 flex !justify-between"
                onClick={() => {
                  appendProductToCart(p);
                  setQuickProductsOpen(false);
                }}
              >
                <span>{p.name}</span>
                <span>{Number(p.sellingPrice || 0).toLocaleString()} c</span>
              </Button>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={discountModalOpen}
        title="Скидка"
        onCancel={() => setDiscountModalOpen(false)}
        onOk={applyDiscount}
        zIndex={1800}
        getContainer={getModalContainer}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Segmented
            block
            value={discountType}
            onChange={(v) => setDiscountType(v as DiscountType)}
            options={[
              { value: "amount", label: "Сумма" },
              { value: "percent", label: "Процент" },
            ]}
          />
          <InputNumber
            min={0}
            max={discountType === "percent" ? 100 : undefined}
            value={discountValue}
            onChange={(v) => setDiscountValue(Number(v || 0))}
            onFocus={(e) => scrollInputIntoView(e.target)}
            style={{ width: "100%" }}
          />
        </Space>
      </Modal>

      <Modal
        open={successModalOpen}
        title="Чек успешно создан"
        onCancel={() => setSuccessModalOpen(false)}
        zIndex={1800}
        getContainer={getModalContainer}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint}>
            Печать
          </Button>,
          <Button key="ok" type="primary" onClick={() => setSuccessModalOpen(false)}>
            OK
          </Button>,
        ]}
      >
        <div>Оплата проведена успешно.</div>
        <div className="mt-2">Итого: {Number(lastReceipt?.total || 0).toLocaleString()} c</div>
      </Modal>

      <Modal
        open={historyOpen}
        title="История продаж"
        footer={null}
        onCancel={() => setHistoryOpen(false)}
        width={860}
        zIndex={1800}
        getContainer={getModalContainer}
      >
        <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            className="md:col-span-2"
            placeholder="Поиск: товар, клиент, чек..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            allowClear
          />
          <Tag color="green" className="!m-0 flex items-center justify-center">
            Продаж: {historyStats.salesCount}
          </Tag>
          <Tag color="red" className="!m-0 flex items-center justify-center">
            Возвратов: {historyStats.refundsCount}
          </Tag>
        </div>
        <div className="mb-3">
          <Alert
            type={historyStats.net >= 0 ? "success" : "warning"}
            showIcon
            message={`Итог по истории: ${historyStats.net.toLocaleString()} c`}
          />
        </div>
        <Table
          rowKey="id"
          size="small"
          dataSource={historyRows}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Продаж пока нет" }}
          columns={[
            { title: "№", dataIndex: "id", width: 120 },
            {
              title: "Дата",
              dataIndex: "createdAt",
              width: 180,
              render: (v: string) => new Date(v).toLocaleString(),
            },
            { title: "Товар", dataIndex: "productName" },
            { title: "Кол-во", dataIndex: "quantity", width: 90 },
            { title: "Клиент", dataIndex: "clientName" },
            { title: "Кассир", dataIndex: "cashierName", width: 140 },
            { title: "Филиал", dataIndex: "branchName", width: 140 },
            {
              title: "Оплата",
              dataIndex: "paymentMethod",
              width: 120,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: "Сумма",
              dataIndex: "total",
              align: "right",
              width: 130,
              render: (v: number) => (
                <span className={v >= 0 ? "text-green-600" : "text-red-500"}>
                  {v.toLocaleString()} c
                </span>
              ),
            },
          ]}
        />
      </Modal>

      <div ref={printRef} className="hidden">
        <PrintReceipt receipt={lastReceipt} receiptNo={lastReceiptNo} paymentMethod={paymentMethod} />
      </div>

      {!canPay && cart.length > 0 ? (
        <div className="fixed bottom-2 right-2 z-50">
          <Alert
            type="warning"
            showIcon
            message={payBlockReason || "Нельзя оплатить чек"}
            className="shadow"
          />
        </div>
      ) : null}

      <div className="fixed top-16 left-2 z-40 hidden md:block">
        <Tag icon={<ShoppingCartOutlined />} color={returnMode ? "orange" : "blue"}>
          {returnMode ? "Режим возврата" : "Обычная продажа"}
        </Tag>
      </div>
    </div>
  );
};
