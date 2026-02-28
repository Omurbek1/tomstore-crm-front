import { Button, Card, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag } from "antd";
import type { FormInstance } from "antd/es/form";
import type { ColumnsType } from "antd/es/table";

type InventoryType = "in" | "out" | "adjustment";
type InventoryOperationType =
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

type InventoryMovementLike = {
  id: string;
  createdAt: string;
  productName: string;
  type: InventoryType;
  quantity: number;
  stockAfter: number;
  reason?: string;
  actorName?: string;
  operationType?: InventoryOperationType;
};

type ProductLike = {
  id: string;
  name: string;
};

type OperationMeta = {
  label: string;
  color: string;
  defaultType: InventoryType;
};

type Props = {
  inventoryMovements: InventoryMovementLike[];
  inventoryProducts: ProductLike[];
  movementOpen: boolean;
  movementForm: FormInstance;
  selectedOperationType?: InventoryOperationType;
  submitLoading?: boolean;
  operationMeta: Record<InventoryOperationType, OperationMeta>;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  resolveOperationType: (movement: InventoryMovementLike) => InventoryOperationType;
  formatMovementQty: (movement: InventoryMovementLike) => string;
  getAvailableStock: (product: ProductLike, products: ProductLike[]) => number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    productId: string;
    type: InventoryType;
    operationType: InventoryOperationType;
    quantity: number;
    reason?: string;
  }) => void;
  onOperationTypeChange: (value: InventoryOperationType) => void;
};

export const WarehouseMovementsSection = ({
  inventoryMovements,
  inventoryProducts,
  movementOpen,
  movementForm,
  selectedOperationType,
  submitLoading,
  operationMeta,
  formatDate,
  resolveOperationType,
  formatMovementQty,
  getAvailableStock,
  onOpenChange,
  onSubmit,
  onOperationTypeChange,
}: Props) => {
  const movementColumns: ColumnsType<InventoryMovementLike> = [
    {
      title: "Дата",
      dataIndex: "createdAt",
      width: 130,
      render: (v) => formatDate(v, true),
    },
    {
      title: "Товар",
      dataIndex: "productName",
      ellipsis: true,
    },
    {
      title: "Направление",
      dataIndex: "type",
      width: 130,
      render: (v: InventoryType) => (
        <Tag color={v === "in" ? "green" : v === "out" ? "red" : "blue"}>
          {v === "in" ? "Приход" : v === "out" ? "Расход" : "Корректировка"}
        </Tag>
      ),
    },
    {
      title: "Операция",
      width: 170,
      render: (_v, r) => {
        const operationType = resolveOperationType(r);
        const meta = operationMeta[operationType];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Кол-во",
      dataIndex: "quantity",
      align: "right",
      render: (_v, r) => (
        <span
          className={
            r.type === "in"
              ? "text-green-600"
              : r.type === "out"
                ? "text-red-500"
                : "text-blue-600"
          }
        >
          {formatMovementQty(r)}
        </span>
      ),
    },
    {
      title: "Остаток",
      dataIndex: "stockAfter",
      align: "right",
      render: (v) => `${v} шт`,
    },
    {
      title: "Причина",
      dataIndex: "reason",
      render: (v) => v || "—",
    },
    {
      title: "Ответственный",
      dataIndex: "actorName",
      render: (v) => v || "—",
    },
  ];

  return (
    <>
      <Card size="small" title="История движений">
        <Table
          rowKey="id"
          size="small"
          dataSource={inventoryMovements}
          columns={movementColumns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        open={movementOpen}
        title="Движение товара"
        footer={null}
        onCancel={() => onOpenChange(false)}
      >
        <Form
          form={movementForm}
          layout="vertical"
          initialValues={{ type: "in", operationType: "purchase", quantity: 1 }}
          onFinish={onSubmit}
        >
          <Form.Item
            name="productId"
            label="Товар"
            rules={[{ required: true, message: "Выберите товар" }]}
          >
            <Select showSearch optionFilterProp="children">
              {inventoryProducts.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} · ост: {getAvailableStock(p, inventoryProducts)} шт
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="operationType" label="Операция">
            <Select onChange={onOperationTypeChange}>
              {Object.entries(operationMeta).map(([key, meta]) => (
                <Select.Option key={key} value={key}>
                  {meta.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="Направление">
            <Radio.Group>
              <Radio.Button value="in">Приход</Radio.Button>
              <Radio.Button value="out">Расход</Radio.Button>
              <Radio.Button value="adjustment">Инвентаризация</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {selectedOperationType && (
            <div className="text-xs text-gray-500 -mt-2 mb-3">
              Тип операции: {operationMeta[selectedOperationType]?.label}
            </div>
          )}
          <Form.Item
            name="quantity"
            label="Количество"
            rules={[{ required: true, message: "Укажите количество" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label="Причина / комментарий">
            <Input placeholder="Например: приход от поставщика №123" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitLoading}>
              Сохранить
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

