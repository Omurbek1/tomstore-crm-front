import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  message,
} from "antd";
import { EnvironmentOutlined, PhoneOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useBarcodeScanner } from "../../../shared/lib/useBarcodeScanner";
import {
  INSTALLMENT_PROVIDER_OPTIONS,
  buildInstallmentValue,
  parseInstallmentValue,
} from "../model/installment";

type Props = {
  initialValues?: any;
  products: any[];
  branches: any[];
  managers: any[];
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
  isAdmin,
  currentUser,
  isDark,
  manualPaymentTypes = [],
  getAvailableStock,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm();
  const [includeDeliveryOverride, setIncludeDelivery] = useState<boolean | null>(null);
  const saleType = Form.useWatch("saleType", form);
  const productId = Form.useWatch("productId", form);
  const managerId = Form.useWatch("managerId", form);
  const selectedBranch = Form.useWatch("branch", form);
  const paymentType = Form.useWatch("paymentType", form);
  const installmentPlan = Form.useWatch("installmentPlan", form);

  const includeDelivery = useMemo(() => {
    if (includeDeliveryOverride !== null) return includeDeliveryOverride;
    if (initialValues) {
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

  const onFinish = (values: any) => {
    const product = products.find((p) => p.id === values.productId);
    const quantity = values.quantity;
    const discount = Number(values.discount || 0);
    const selectedInstallment = parseInstallmentValue(values.installmentPlan);

    let deliveryCost = 0;
    let total = Math.max(0, values.price * quantity - discount);

    if (values.saleType === "delivery") {
      deliveryCost = values.deliveryCost || 0;
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
        if (values.saleType === "office") earnings = earnings / 2;
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

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="saleType" className="mb-4">
        <Radio.Group buttonStyle="solid" className="w-full flex">
          <Radio.Button value="office" className="flex-1 text-center">
            Офис
          </Radio.Button>
          <Radio.Button value="delivery" className="flex-1 text-center">
            Доставка
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="manualDate" label="Дата">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="clientName" label="Клиент" rules={[{ required: true }]}> 
            <Input />
          </Form.Item>
        </Col>
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
      </Row>

      {saleType === "delivery" && (
        <div className={`p-3 rounded mb-4 border ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="clientPhone" label="Телефон">
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientAddress" label="Адрес">
                <Input prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12} align="middle">
            <Col span={12}>
              <Form.Item name="deliveryCost" label="Стоимость доставки">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label=" " colon={false}>
                <Checkbox checked={includeDelivery} onChange={(e) => setIncludeDelivery(e.target.checked)}>
                  Включить в чек
                </Checkbox>
              </Form.Item>
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
