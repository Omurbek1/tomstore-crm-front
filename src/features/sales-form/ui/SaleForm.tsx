import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Tag,
  message,
} from "antd";
import { EnvironmentOutlined, PhoneOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { normalizeIntlPhone } from "../../../shared/lib/phone";
import { useBarcodeScanner } from "../../../shared/lib/useBarcodeScanner";
import {
  INSTALLMENT_PROVIDER_OPTIONS,
  buildInstallmentValue,
  parseInstallmentValue,
} from "../model/installment";
import { useAiOrderDraft } from "../../../hooks/api";

type Props = {
  initialValues?: any;
  products: any[];
  branches: any[];
  managers: any[];
  clients?: any[];
  isAdmin: boolean;
  currentUser?: { id?: string; name?: string; branchName?: string } | null;
  isDark: boolean;
  manualPaymentTypes?: string[];
  getAvailableStock: (product: any, products: any[]) => number;
  onSubmit: (vals: any) => void;
};

type ManagerInfo = {
  id?: string;
  name?: string;
  role?: "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";
  roles?: string[];
  salaryType?: "commission" | "fixed";
  branchName?: string;
};

const { Option } = Select;

export const SaleForm = ({
  initialValues,
  products,
  branches,
  managers,
  clients = [],
  isAdmin,
  currentUser,
  isDark,
  manualPaymentTypes = [],
  getAvailableStock,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const [aiText, setAiText] = useState("");
  const [includeDeliveryOverride, setIncludeDelivery] = useState<boolean | null>(null);
  const aiOrderDraft = useAiOrderDraft();
  const saleType = Form.useWatch("saleType", form);
  const productId = Form.useWatch("productId", form);
  const managerId = Form.useWatch("managerId", form);
  const clientId = Form.useWatch("clientId", form);
  const selectedBranch = Form.useWatch("branch", form);
  const paymentType = Form.useWatch("paymentType", form);
  const installmentPlan = Form.useWatch("installmentPlan", form);

  const includeDelivery = useMemo(() => {
    if (includeDeliveryOverride !== null) return includeDeliveryOverride;
    if (initialValues) {
      if (typeof initialValues.deliveryPaidByCompany === "boolean") {
        return !initialValues.deliveryPaidByCompany;
      }
      return !!(
        initialValues.saleType === "delivery" &&
        initialValues.deliveryCost &&
        initialValues.total > initialValues.price * initialValues.quantity
      );
    }
    return false;
  }, [includeDeliveryOverride, initialValues]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const selectedManager = useMemo<ManagerInfo | undefined>(
    () => managers.find((m) => m.id === (managerId || currentUser?.id)),
    [managers, managerId, currentUser],
  );
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId],
  );
  const selectedManagerIsFixed = useMemo(() => {
    const selectedRoles = (selectedManager?.roles || []).map((x) => String(x));
    return (
      selectedManager?.salaryType === "fixed" ||
      selectedManager?.role === "cashier" ||
      selectedManager?.role === "storekeeper" ||
      selectedRoles.includes("cashier") ||
      selectedRoles.includes("storekeeper")
    );
  }, [selectedManager]);
  const productsByBranch = useMemo(() => {
    if (!selectedBranch) return products;
    return products.filter((p) => !p.branchName || p.branchName === selectedBranch);
  }, [products, selectedBranch]);
  const availableQty = useMemo(
    () => (selectedProduct ? getAvailableStock(selectedProduct, products) : 0),
    [selectedProduct, products, getAvailableStock],
  );

  useEffect(() => {
    if (initialValues) {
      const vals = { ...initialValues };
      if (vals.paymentType === "installment" && vals.installmentMonths) {
        const provider = vals.paymentLabel || "Рассрочка";
        vals.installmentPlan = buildInstallmentValue(provider, Number(vals.installmentMonths));
      }
      if (vals.manualDate) vals.manualDate = dayjs(vals.manualDate);
      if (vals.bookingDeadline) vals.bookingDeadline = dayjs(vals.bookingDeadline);
      form.setFieldsValue(vals);
    } else {
      form.resetFields();
      form.setFieldsValue({
        quantity: 1,
        discount: 0,
        saleType: "office",
        paymentType: "cash",
        installmentPlan: undefined,
        bookingDeposit: 0,
        bookingBuyout: 0,
        hybridCash: 0,
        hybridCard: 0,
        hybridTransfer: 0,
        branch: !isAdmin ? currentUser?.branchName || "Центральный" : undefined,
        manualDate: dayjs(),
      });
    }
  }, [initialValues, isAdmin, currentUser, form, buildInstallmentValue]);

  useEffect(() => {
    if (!isAdmin) {
      form.setFieldValue("branch", currentUser?.branchName || "Центральный");
      return;
    }
    if (managerId) {
      const m = managers.find((x) => x.id === managerId);
      if (m?.branchName) {
        form.setFieldValue("branch", m.branchName);
      }
    }
  }, [isAdmin, currentUser, managerId, managers, form]);

  useEffect(() => {
    if (productId && !initialValues) {
      const p = products.find((x) => x.id === productId);
      if (p) form.setFieldsValue({ price: p.sellingPrice });
    }
  }, [form, initialValues, productId, products]);

  useEffect(() => {
    if (!productId || !selectedBranch) return;
    const p = products.find((x) => x.id === productId);
    if (p && p.branchName && p.branchName !== selectedBranch) {
      form.setFieldValue("productId", undefined);
      message.warning("Выбранный товар не относится к этому филиалу");
    }
  }, [productId, selectedBranch, products, form]);

  useEffect(() => {
    if (!clientId) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    if (!form.getFieldValue("clientName")) form.setFieldValue("clientName", client.fullName);
    if (!form.getFieldValue("clientPhone") && client.phone) {
      form.setFieldValue("clientPhone", normalizeIntlPhone(client.phone));
    }
  }, [clientId, clients, form]);

  const onFinish = (values: any) => {
    const product = products.find((p) => p.id === values.productId);
    const quantity = values.quantity;
    const discount = Number(values.discount || 0);
    const selectedInstallment = parseInstallmentValue(values.installmentPlan);

    let deliveryCost = 0;
    let total = Math.max(0, values.price * quantity - discount);

    if (values.saleType === "delivery") {
      deliveryCost = values.deliveryCost || 0;
      if (deliveryCost < 0) {
        message.error("Стоимость доставки не может быть отрицательной");
        return;
      }
      if (includeDelivery) total += deliveryCost;
    }

    if (values.paymentType === "hybrid") {
      const hybridTotal =
        Number(values.hybridCash || 0) +
        Number(values.hybridCard || 0) +
        Number(values.hybridTransfer || 0);
      if (Math.abs(hybridTotal - total) > 0.01) {
        message.error(`Сумма гибридной оплаты (${hybridTotal}) должна быть равна чеку (${total})`);
        return;
      }
    }
    if (values.paymentType === "booking") {
      const deposit = Number(values.bookingDeposit || 0);
      const buyout = Number(values.bookingBuyout || 0);
      if (deposit < 0 || buyout < 0) {
        message.error("Для брони сумма предоплаты и выкупа должна быть >= 0");
        return;
      }
      if (values.saleType === "delivery" && Math.abs(deposit + buyout - total) > 0.01) {
        message.error(
          `Для региональной брони предоплата + выкуп (${deposit + buyout}) должны быть равны чеку (${total})`,
        );
        return;
      }
    }

    const fixedSalaryEmployee = selectedManagerIsFixed;

    let earnings = 0;
    if (!isAdmin || values.managerEarningsOverride === undefined) {
      if (!fixedSalaryEmployee) {
        earnings = (product?.managerEarnings || 0) * quantity;
      } else {
        earnings = 0;
      }
    } else {
      earnings = fixedSalaryEmployee ? 0 : values.managerEarningsOverride;
    }

    const payload = {
      ...values,
      manualDate: values.manualDate?.toISOString(),
      bookingDeadline: values.bookingDeadline?.toISOString(),
      productName: product?.name,
      costPriceSnapshot: product?.costPrice,
      total,
      discount,
      paymentLabel:
        values.paymentType === "installment"
          ? selectedInstallment?.provider
          : values.paymentLabel,
      installmentMonths:
        values.paymentType === "installment"
          ? selectedInstallment?.months
          : values.installmentMonths,
      hybridCash: Number(values.hybridCash || 0),
      hybridCard: Number(values.hybridCard || 0),
      hybridTransfer: Number(values.hybridTransfer || 0),
      bookingDeposit:
        values.paymentType === "booking" ? Number(values.bookingDeposit || 0) : null,
      bookingBuyout:
        values.paymentType === "booking" ? Number(values.bookingBuyout || 0) : null,
      deliveryCost,
      deliveryPaidByCompany:
        values.saleType === "delivery" ? !includeDelivery : false,
      cashbackToUse: Number(values.cashbackToUse || 0),
      managerEarnings: earnings,
      managerId: values.managerId || currentUser?.id,
      managerName:
        managers.find((m) => m.id === values.managerId)?.name || currentUser?.name || "Unknown",
    };
    onSubmit(payload);
  };

  const applyBarcodeProduct = (raw: string) => {
    const code = String(raw || "")
      .trim()
      .replace(/\s+/g, "");
    if (!code) return;
    const product =
      productsByBranch.find((p) => String(p.barcode || "") === code) ||
      products.find((p) => String(p.barcode || "") === code);
    if (!product) {
      message.warning("Товар по этому штрихкоду не найден");
      return;
    }
    const available = getAvailableStock(product, products);
    if (available <= 0) {
      message.warning("Товар найден, но сейчас нет в наличии");
      return;
    }
    form.setFieldsValue({
      productId: product.id,
      price: product.sellingPrice,
    });
    message.success(`Выбран товар: ${product.name}`);
  };

  useBarcodeScanner({
    enabled: true,
    minLength: 5,
    onScan: applyBarcodeProduct,
  });

  const normalizeByName = (value?: string) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const applyAiDraft = (draft: {
    clientName?: string;
    clientPhone?: string;
    clientAddress?: string;
    branchName?: string;
    productName?: string;
    quantity?: number;
    price?: number;
    saleType?: "office" | "delivery";
    paymentType?: "cash" | "installment" | "hybrid" | "booking" | "manual";
    paymentLabel?: string;
    installmentMonths?: number;
    deliveryCost?: number;
    clientPaysDelivery?: boolean;
    bookingDeposit?: number;
    bookingBuyout?: number;
    managerName?: string;
    comment?: string;
  }) => {
    const draftProductName = normalizeByName(draft.productName);
    const draftBranchName = normalizeByName(draft.branchName);
    const draftManagerName = normalizeByName(draft.managerName);

    const product =
      products.find((p) => normalizeByName(p.name) === draftProductName) ||
      products.find((p) => draftProductName && normalizeByName(p.name).includes(draftProductName));
    const branch =
      branches.find((b) => normalizeByName(b.name) === draftBranchName) ||
      branches.find((b) => draftBranchName && normalizeByName(b.name).includes(draftBranchName));
    const manager =
      managers.find((m) => normalizeByName(m.name) === draftManagerName) ||
      managers.find((m) => draftManagerName && normalizeByName(m.name).includes(draftManagerName));

    const values: Record<string, unknown> = {};
    if (draft.clientName) values.clientName = draft.clientName;
    if (draft.clientPhone) values.clientPhone = normalizeIntlPhone(draft.clientPhone);
    if (draft.clientAddress) values.clientAddress = draft.clientAddress;
    if (draft.comment) values.comment = draft.comment;
    if (branch?.name) values.branch = branch.name;
    if (manager?.id) values.managerId = manager.id;
    if (draft.saleType) values.saleType = draft.saleType;
    if (draft.paymentType) values.paymentType = draft.paymentType;
    if (draft.paymentLabel) values.paymentLabel = draft.paymentLabel;
    if (draft.quantity && Number(draft.quantity) > 0) {
      values.quantity = Math.max(1, Math.round(Number(draft.quantity)));
    }
    if (Number.isFinite(Number(draft.price)) && Number(draft.price) > 0) {
      values.price = Number(draft.price);
    }
    if (product?.id) {
      values.productId = product.id;
      if (values.price === undefined) values.price = Number(product.sellingPrice || 0);
    }
    if (Number.isFinite(Number(draft.deliveryCost)) && Number(draft.deliveryCost) >= 0) {
      values.deliveryCost = Number(draft.deliveryCost);
    }
    if (draft.paymentType === "booking") {
      if (Number.isFinite(Number(draft.bookingDeposit))) {
        values.bookingDeposit = Math.max(0, Number(draft.bookingDeposit));
      }
      if (Number.isFinite(Number(draft.bookingBuyout))) {
        values.bookingBuyout = Math.max(0, Number(draft.bookingBuyout));
      }
    }
    if (
      draft.paymentType === "installment" &&
      Number(draft.installmentMonths || 0) > 0
    ) {
      const provider = String(draft.paymentLabel || "").trim() || "Рассрочка";
      values.installmentPlan = buildInstallmentValue(
        provider,
        Number(draft.installmentMonths),
      );
    }
    if (draft.saleType === "delivery" && typeof draft.clientPaysDelivery === "boolean") {
      setIncludeDelivery(draft.clientPaysDelivery);
      if (draft.clientPaysDelivery) values.deliveryCost = 0;
    }

    form.setFieldsValue(values);

    const hints: string[] = [];
    if (draft.productName && !product) hints.push("товар не найден точно");
    if (draft.branchName && !branch) hints.push("филиал не найден точно");
    if (draft.managerName && !manager) hints.push("менеджер не найден точно");
    if (hints.length > 0) message.warning(`Проверьте: ${hints.join(", ")}`);
    else message.success("Черновик заказа заполнен через ИИ");
  };


  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item label="ИИ автозаполнение">
        <Input.TextArea
          rows={2}
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="Например: Айжан, iPhone 15 Pro 2 шт, доставка в Ош, наличные, клиент оплачивает доставку"
        />
        <div className="mt-2">
          <Button
            loading={aiOrderDraft.isPending}
            onClick={() => {
              const text = aiText.trim();
              if (!text) {
                message.warning("Введите текст заказа");
                return;
              }
              aiOrderDraft.mutate(
                {
                  text,
                  locale: "ru",
                  branches: branches.map((b) => b.name),
                  products: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.sellingPrice || 0),
                  })),
                  managers: managers.map((m) => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                  })),
                  manualPaymentTypes,
                },
                {
                  onSuccess: (res) => {
                    applyAiDraft(res.draft);
                    setAiText("");
                  },
                },
              );
            }}
          >
            Заполнить через ИИ
          </Button>
        </div>
      </Form.Item>

      <Form.Item
        name="saleType"
        label="Тип заказа"
        rules={[{ required: true, message: "Выберите тип заказа" }]}
      >
        <Select>
          <Option value="office">Офис</Option>
          <Option value="delivery">Доставка</Option>
        </Select>
      </Form.Item>
      <Form.Item name="manualDate" label="Дата">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="clientId" label="Клиент из базы">
            <Select
              allowClear
              showSearch
              optionFilterProp="children"
              placeholder="Выберите клиента (необязательно)"
            >
              {clients.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.fullName}
                  {c.phone ? ` · ${c.phone}` : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {selectedClient ? (
            <div className="text-xs -mt-3 mb-2">
              <Tag color={selectedClient.level === "vip" ? "purple" : selectedClient.level === "gold" ? "gold" : "default"}>
                {String(selectedClient.level || "silver").toUpperCase()}
              </Tag>
              <Tag color="blue">Скидка: {Number(selectedClient.discountPercent || 0)}%</Tag>
              <Tag color="gold">
                ДР +{Number(selectedClient.birthdayDiscountPercent || 0)}%
              </Tag>
              <Tag color="green">Кэшбек: {Number(selectedClient.cashbackBalance || 0).toLocaleString()} c</Tag>
              {selectedClient.bonusesBlocked ? <Tag color="red">Кэшбек заблокирован</Tag> : null}
            </div>
          ) : null}
        </Col>
        <Col span={12}>
          <Form.Item name="clientName" label="Клиент" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="branch" label="Филиал" rules={[{ required: true }]}>
            <Select disabled={!isAdmin}>
              {branches.map((b) => (
                <Option key={b.id} value={b.name}>
                  {b.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="cashbackToUse"
            label="Списать кэшбек"
            tooltip="Списание кэшбека уменьшает сумму чека"
          >
            <InputNumber
              min={0}
              max={
                selectedClient && !selectedClient.bonusesBlocked
                  ? Number(selectedClient.cashbackBalance || 0)
                  : 0
              }
              disabled={!selectedClient || !!selectedClient.bonusesBlocked}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="clientPhone"
            label="Телефон клиента"
            normalize={(value) => normalizeIntlPhone(value)}
            rules={[
              {
                validator: (_rule, value) => {
                  const needPhone = form.getFieldValue("saleType") === "office";
                  if (needPhone && !String(value || "").trim()) {
                    return Promise.reject(
                      new Error("Для офисного заказа укажите телефон клиента"),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              saleType === "office"
                ? "Обязательно для проверки клиента в amoCRM"
                : "Рекомендуется для связи"
            }
          >
            <Input prefix={<PhoneOutlined />} placeholder="+996 XXX XXX XXX" />
          </Form.Item>
        </Col>
      </Row>

      {saleType === "delivery" && (
        <div className={`p-3 rounded mb-4 border ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="clientAddress" label="Адрес">
                <Input prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12} align="middle">
            <Col span={12}>
              <Form.Item name="deliveryCost" label="Стоимость доставки">
                <InputNumber
                  style={{ width: "100%" }}
                  disabled={includeDelivery}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label=" " colon={false}>
                <Checkbox
                  checked={includeDelivery}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIncludeDelivery(next);
                    if (next) {
                      form.setFieldValue("deliveryCost", 0);
                    }
                  }}
                >
                  Клиент оплачивает доставку (добавить в чек)
                </Checkbox>
              </Form.Item>
              <div className="text-xs text-gray-500 -mt-1">
                Если выключено: доставка за счет компании (будет минус в прибыли).
              </div>
            </Col>
          </Row>
        </div>
      )}

      <Row gutter={12}>
        <Col span={16}>
          <Form.Item name="productId" label="Товар" rules={[{ required: true }]}> 
            <Select
              showSearch
              optionFilterProp="children"
              onChange={(id) => {
                const selected = products.find((p) => p.id === id);
                if (!selected) return;
                const available = getAvailableStock(selected, products);
                if (available <= 0) message.warning("Этот товар закончился на складе");
              }}
            >
              {productsByBranch.map((p) => (
                <Option key={p.id} value={p.id} disabled={getAvailableStock(p, products) <= 0}>
                  {p.name}
                  {p.isCombo ? " [комбо]" : ""} ({p.sellingPrice}) · ост: {getAvailableStock(p, products)}
                  {getAvailableStock(p, products) <= 0 ? " · нет в наличии" : ""}
                </Option>
              ))}
            </Select>
          </Form.Item>
          {productId && availableQty <= 0 && (
            <div className="text-xs text-red-500 -mt-3 mb-2">Товар закончился на складе. Выберите другой товар.</div>
          )}
        </Col>
        <Col span={8}>
          <Form.Item
            name="quantity"
            label="Кол-во"
            rules={[
              { required: true },
              {
                validator: (_rule, value) => {
                  if (initialValues) return Promise.resolve();
                  const qty = Number(value || 0);
                  if (!productId || qty <= 0) return Promise.resolve();
                  if (qty > availableQty) {
                    return Promise.reject(new Error(`Доступно только ${availableQty} шт`));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              productId
                ? `Доступно: ${availableQty} шт${selectedProduct?.isCombo ? " (комбо)" : ""}`
                : undefined
            }
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="paymentType" label="Оплата">
            <Select>
              <Option value="cash">Наличные</Option>
              <Option value="installment">Рассрочка</Option>
              <Option value="hybrid">Гибрид</Option>
              <Option value="manual">Ручной тип</Option>
              <Option value="booking">Бронь</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="price" label="Цена продажи" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      {paymentType === "installment" && (
        <Row gutter={12}>
          <Col span={24}>
            <Form.Item
              name="installmentPlan"
              label="Провайдер и срок рассрочки"
              rules={[{ required: true, message: "Выберите вариант рассрочки" }]}
            >
              <Select placeholder="Выберите рассрочку">
                {INSTALLMENT_PROVIDER_OPTIONS.map((option) => (
                  <Option key={option.key} value={buildInstallmentValue(option.provider, option.months)}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            {installmentPlan && (
              <div className="text-xs text-gray-500 -mt-2 mb-2">
                Выбрано: {(() => {
                  const parsed = parseInstallmentValue(installmentPlan);
                  return parsed ? `${parsed.provider}, ${parsed.months} мес` : "—";
                })()}
              </div>
            )}
          </Col>
        </Row>
      )}

      {paymentType === "manual" && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="paymentLabel"
              label="Тип оплаты (ручной)"
              rules={[{ required: true, message: "Выберите тип оплаты" }]}
            >
              <Select
                showSearch
                optionFilterProp="children"
                placeholder={
                  manualPaymentTypes.length > 0
                    ? "Выберите тип оплаты"
                    : "Нет доступных ручных типов"
                }
                disabled={manualPaymentTypes.length === 0}
              >
                {manualPaymentTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            {manualPaymentTypes.length === 0 ? (
              <div className="text-xs text-gray-500 -mt-2">
                Ручные типы оплаты добавляет только admin/superadmin в Настройках.
              </div>
            ) : null}
          </Col>
        </Row>
      )}

      {isAdmin && paymentType !== "hybrid" && paymentType !== "manual" && paymentType !== "installment" && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="paymentLabel"
              label="Канал оплаты (админ)"
              tooltip="Например: MBank, O!Деньги, терминал, касса"
            >
              <Input placeholder="Необязательно" />
            </Form.Item>
          </Col>
        </Row>
      )}

      <Row gutter={12}>
        <Col span={24}>
          <Form.Item
            name="comment"
            label="Комментарий"
            tooltip="Можно указать детали по оплате и другие примечания"
          >
            <Input.TextArea
              rows={2}
              placeholder="Например: оплата через MBank, клиент просил созвониться вечером..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Col>
      </Row>

      {paymentType === "booking" && (
        <div className={`p-3 rounded mb-4 border ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="bookingDeposit" label="Предоплата" rules={[{ required: true, message: "Укажите предоплату" }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="bookingBuyout"
                label="Выкуп"
                rules={saleType === "delivery" ? [{ required: true, message: "Для региона укажите выкуп" }] : undefined}
                extra={saleType === "delivery" ? "Для регионального заказа предоплата + выкуп = сумма чека" : undefined}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bookingDeadline" label="Дедлайн выкупа">
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      )}

      {paymentType === "hybrid" && (
        <div className={`p-3 rounded mb-4 border ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="hybridCash" label="Наличные" rules={[{ required: true, message: "Укажите сумму" }]}> 
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hybridCard" label="Карта" rules={[{ required: true, message: "Укажите сумму" }]}> 
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hybridTransfer" label="Перевод" rules={[{ required: true, message: "Укажите сумму" }]}> 
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <div className="text-xs text-gray-500">Для гибридной оплаты сумма трех полей должна быть равна сумме чека.</div>
        </div>
      )}

      {isAdmin && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="discount" label="Скидка">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      )}

      {isAdmin && (
        <div className="p-3 border rounded mb-4">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="managerEarningsOverride" label="ЗП (ручн)">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={
                    selectedManagerIsFixed ? "Для фикс-оклада всегда 0" : "Авто"
                  }
                  disabled={selectedManagerIsFixed}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="managerId" label="Продавец">
                <Select allowClear>
                  {managers.map((m) => (
                    <Option key={m.id} value={m.id}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      )}

      <Button type="primary" htmlType="submit" block size="large">
        Сохранить
      </Button>
    </Form>
  );
};
