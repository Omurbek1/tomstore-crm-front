import {
  Avatar,
  Card,
  Col,
  Modal,
  Row,
  Statistic,
  Table,
  Tabs,
  Tag,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { toSafeMediaUrl } from "../../../security/url";

type ManagerItem = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  branchName?: string;
  photoUrl?: string;
};

type ProductItem = {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
};

type SaleItem = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  clientName: string;
  productName: string;
  quantity: number;
  total: number;
  managerName: string;
};

type ExpenseItem = {
  id: string;
  createdAt: string;
  category: string;
  comment?: string;
  managerName?: string;
  amount: number;
};

type BonusItem = {
  id: string;
  createdAt: string;
  managerName: string;
  reason: string;
  amount: number;
};

type BranchDetailsData = {
  branchName: string;
  branchSales: SaleItem[];
  branchManagers: ManagerItem[];
  branchProducts: ProductItem[];
  branchExpenses: ExpenseItem[];
  branchBonuses: BonusItem[];
  revenue: number;
  net: number;
  expensesTotal: number;
  bonusesTotal: number;
  lowStockCount: number;
};

type OperationMeta = {
  label: string;
  color: string;
};

type Props = {
  open: boolean;
  title: string;
  data: BranchDetailsData | null;
  movements: any[];
  onCancel: () => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  formatPhone: (value?: string | null) => string;
  getAvailableStock: (product: any, products: any[]) => number;
  resolveOperationType: (movement: any) => string;
  inventoryOperationMeta: Record<string, OperationMeta>;
  formatMovementQty: (movement: any) => string;
};

export const BranchDetailsModal = ({
  open,
  title,
  data,
  movements,
  onCancel,
  formatDate,
  formatPhone,
  getAvailableStock,
  resolveOperationType,
  inventoryOperationMeta,
  formatMovementQty,
}: Props) => {
  return (
    <Modal
      open={open}
      title={title}
      footer={null}
      width={980}
      onCancel={onCancel}
    >
      {data && (
        <div className="space-y-4">
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Продаж" value={data.branchSales.length} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Выручка"
                  value={data.revenue}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#1677ff",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Чистый результат"
                  value={data.net}
                  suffix="c"
                  styles={{
                    content: {
                      color: data.net >= 0 ? "#3f8600" : "#cf1322",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Низкий остаток"
                  value={data.lowStockCount}
                  styles={{
                    content: {
                      color: data.lowStockCount > 0 ? "#faad14" : "#3f8600",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Расходы филиала (с бонусами)"
                  value={data.expensesTotal}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#cf1322",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Бонусы филиала"
                  value={data.bonusesTotal}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#fa8c16",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Менеджеры"
                  value={data.branchManagers.length}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Товары" value={data.branchProducts.length} />
              </Card>
            </Col>
          </Row>

          <Tabs
            items={[
              {
                key: "managers",
                label: `Менеджеры (${data.branchManagers.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={data.branchManagers}
                    locale={{ emptyText: "Нет сотрудников" }}
                    pagination={false}
                    columns={[
                      {
                        title: "Сотрудник",
                        render: (_v, m: any) => (
                          <div className="flex items-center gap-2">
                            <Avatar src={toSafeMediaUrl(m.photoUrl)} icon={<UserOutlined />} />
                            <span>{m.name}</span>
                          </div>
                        ),
                      },
                      {
                        title: "Данные",
                        render: (_v, m: any) =>
                          `${m.role} · ${formatPhone(m.phone)} · ${m.branchName || "—"}`,
                      },
                    ]}
                  />
                ),
              },
              {
                key: "products",
                label: `Товары (${data.branchProducts.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={data.branchProducts}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      { title: "Товар", dataIndex: "name" },
                      {
                        title: "Категория",
                        dataIndex: "category",
                        render: (v) => <Tag>{v}</Tag>,
                      },
                      {
                        title: "Остаток",
                        render: (_v, r: any) =>
                          `${getAvailableStock(r, data.branchProducts)} шт`,
                      },
                      {
                        title: "Цена",
                        dataIndex: "sellingPrice",
                        render: (v) => `${Number(v).toLocaleString()} c`,
                      },
                    ]}
                  />
                ),
              },
              {
                key: "sales",
                label: `Продажи (${data.branchSales.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={data.branchSales}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 760 }}
                    columns={[
                      {
                        title: "Дата",
                        render: (_v, r: any) =>
                          formatDate(r.manualDate || r.createdAt, true),
                      },
                      { title: "Клиент", dataIndex: "clientName" },
                      { title: "Товар", dataIndex: "productName" },
                      {
                        title: "Кол-во",
                        dataIndex: "quantity",
                        render: (v) => `${v} шт`,
                      },
                      {
                        title: "Сумма",
                        dataIndex: "total",
                        render: (v) => `${Number(v).toLocaleString()} c`,
                      },
                      { title: "Менеджер", dataIndex: "managerName" },
                    ]}
                  />
                ),
              },
              {
                key: "moves",
                label: `Движения (${movements.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={movements}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "Дата",
                        dataIndex: "createdAt",
                        render: (v) => formatDate(v, true),
                      },
                      { title: "Товар", dataIndex: "productName" },
                      {
                        title: "Тип",
                        dataIndex: "type",
                        render: (v) => (
                          <Tag
                            color={
                              v === "in"
                                ? "green"
                                : v === "out"
                                  ? "red"
                                  : "blue"
                            }
                          >
                            {v === "in"
                              ? "Приход"
                              : v === "out"
                                ? "Расход"
                                : "Корректировка"}
                          </Tag>
                        ),
                      },
                      {
                        title: "Операция",
                        render: (_v, r: any) => {
                          const operationType = resolveOperationType(r);
                          const meta = inventoryOperationMeta[operationType];
                          return (
                            <Tag color={meta?.color}>{meta?.label || "—"}</Tag>
                          );
                        },
                      },
                      {
                        title: "Кол-во",
                        dataIndex: "quantity",
                        render: (_v, r: any) => formatMovementQty(r),
                      },
                      { title: "Остаток", dataIndex: "stockAfter" },
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
                    ]}
                  />
                ),
              },
              {
                key: "expenses",
                label: `Расходы (${data.branchExpenses.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={data.branchExpenses}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "Дата",
                        dataIndex: "createdAt",
                        render: (v) => formatDate(v, true),
                      },
                      {
                        title: "Категория",
                        dataIndex: "category",
                        render: (v) => <Tag>{v}</Tag>,
                      },
                      { title: "Комментарий", dataIndex: "comment" },
                      {
                        title: "Менеджер",
                        dataIndex: "managerName",
                        render: (v) => v || "—",
                      },
                      {
                        title: "Сумма",
                        dataIndex: "amount",
                        render: (v) => (
                          <span className="text-red-500 font-semibold">
                            -{Number(v).toLocaleString()} c
                          </span>
                        ),
                      },
                    ]}
                  />
                ),
              },
              {
                key: "bonuses",
                label: `Бонусы (${data.branchBonuses.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={data.branchBonuses}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "Дата",
                        dataIndex: "createdAt",
                        render: (v) => formatDate(v, true),
                      },
                      { title: "Менеджер", dataIndex: "managerName" },
                      { title: "Причина", dataIndex: "reason" },
                      {
                        title: "Сумма",
                        dataIndex: "amount",
                        render: (v) => (
                          <span className="text-green-600 font-semibold">
                            +{Number(v).toLocaleString()} c
                          </span>
                        ),
                      },
                    ]}
                  />
                ),
              },
              {
                key: "money",
                label: "Деньги",
                children: (
                  <Table
                    size="small"
                    rowKey="key"
                    pagination={{ pageSize: 12 }}
                    dataSource={[
                      ...data.branchSales.map((s) => ({
                        key: `s-${s.id}`,
                        date: s.manualDate || s.createdAt,
                        type: "income" as const,
                        title: `Продажа: ${s.productName}`,
                        subtitle: `${s.managerName} · ${s.clientName}`,
                        amount: s.total,
                      })),
                      ...data.branchExpenses.map((e) => ({
                        key: `e-${e.id}`,
                        date: e.createdAt,
                        type: "expense" as const,
                        title: `Расход: ${e.category}`,
                        subtitle: e.comment || e.managerName || "",
                        amount: e.amount,
                      })),
                      ...data.branchBonuses.map((b) => ({
                        key: `b-${b.id}`,
                        date: b.createdAt,
                        type: "bonus" as const,
                        title: `Бонус: ${b.reason}`,
                        subtitle: b.managerName,
                        amount: b.amount,
                      })),
                    ].sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )}
                    columns={[
                      {
                        title: "Дата",
                        dataIndex: "date",
                        render: (v) => formatDate(v, true),
                      },
                      {
                        title: "Тип",
                        dataIndex: "type",
                        render: (v) => (
                          <Tag
                            color={
                              v === "income"
                                ? "green"
                                : v === "bonus"
                                  ? "orange"
                                  : "red"
                            }
                          >
                            {v === "income"
                              ? "Приход"
                              : v === "bonus"
                                ? "Бонус"
                                : "Расход"}
                          </Tag>
                        ),
                      },
                      { title: "Операция", dataIndex: "title" },
                      { title: "Детали", dataIndex: "subtitle" },
                      {
                        title: "Сумма",
                        dataIndex: "amount",
                        render: (v, r) => (
                          <span
                            className={
                              r.type === "income"
                                ? "text-green-600 font-semibold"
                                : "text-red-500 font-semibold"
                            }
                          >
                            {r.type === "income" ? "+" : "-"}
                            {Number(v).toLocaleString()} c
                          </span>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
};
