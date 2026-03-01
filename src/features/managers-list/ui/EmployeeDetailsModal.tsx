import {
  Card,
  Col,
  Modal,
  Row,
  Statistic,
  Table,
  Tabs,
  Tag,
} from "antd";

type ManagerSale = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  productName: string;
  clientName: string;
  deliveryStatus: string;
  total: number;
  managerEarnings: number;
};

type FinanceHistoryItem = {
  key: string;
  date: string;
  type: "bonus" | "advance" | "expense";
  label: string;
  amount: number;
};

type EmployeeDetails = {
  managerName: string;
  managerSales: ManagerSale[];
  revenueTotal: number;
  salaryFromSales: number;
  salaryFromKpi?: number;
  fixedBase?: number;
  bonusesTotal: number;
  penaltiesTotal: number;
  advancesTotal: number;
  otherExpensesTotal: number;
  finalPayout: number;
  payoutFromMeta?: number;
  financeHistory: FinanceHistoryItem[];
};

type Props = {
  open: boolean;
  details: EmployeeDetails | null;
  onCancel: () => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  deliveryStatuses: Record<string, { text: string; color: string }>;
};

export const EmployeeDetailsModal = ({
  open,
  details,
  onCancel,
  formatDate,
  deliveryStatuses,
}: Props) => {
  return (
    <Modal
      open={open}
      title={`Детали сотрудника: ${details?.managerName ?? ""}`}
      footer={null}
      onCancel={onCancel}
      width={1100}
    >
      {details && (
        <div className="space-y-4">
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Заказы" value={details.managerSales.length} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Выручка"
                  value={details.revenueTotal}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#1677ff",
                      fontSize: 16,
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="ЗП с продаж"
                  value={details.salaryFromSales}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#52c41a",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Итого к выплате (текущее)"
                  value={details.payoutFromMeta ?? details.finalPayout}
                  suffix="c"
                  styles={{
                    content: {
                      color:
                        (details.payoutFromMeta ?? details.finalPayout) >= 0
                          ? "#3f8600"
                          : "#cf1322",
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Фикс. база"
                  value={details.fixedBase || 0}
                  suffix="c"
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="KPI начисление"
                  value={details.salaryFromKpi || 0}
                  suffix="c"
                />
              </Card>
            </Col>
            <Col xs={12} md={12}>
              <Card size="small">
                <Statistic
                  title="Расчет к выплате (формула)"
                  value={details.finalPayout}
                  suffix="c"
                  styles={{
                    content: {
                      color: details.finalPayout >= 0 ? "#1677ff" : "#cf1322",
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Выплачено ЗП/Бонус"
                  value={details.bonusesTotal}
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
                  title="Штрафы"
                  value={details.penaltiesTotal}
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
                  title="Авансы"
                  value={details.advancesTotal}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#d48806",
                    },
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Другие расходы"
                  value={details.otherExpensesTotal}
                  suffix="c"
                  styles={{
                    content: {
                      color: "#fa8c16",
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Tabs
            defaultActiveKey="orders"
            items={[
              {
                key: "orders",
                label: `Заказы (${details.managerSales.length})`,
                children: (
                  <Table
                    size="small"
                    rowKey="id"
                    dataSource={details.managerSales}
                    scroll={{ x: 980 }}
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: "Дата",
                        render: (_, s: ManagerSale) =>
                          formatDate(s.manualDate || s.createdAt, true),
                      },
                      { title: "Товар", dataIndex: "productName" },
                      { title: "Клиент", dataIndex: "clientName" },
                      {
                        title: "Статус",
                        dataIndex: "deliveryStatus",
                        render: (v: string) => (
                          <Tag color={deliveryStatuses[v]?.color}>
                            {deliveryStatuses[v]?.text}
                          </Tag>
                        ),
                      },
                      {
                        title: "Сумма",
                        dataIndex: "total",
                        render: (v: number) => `${v.toLocaleString()} c`,
                      },
                      {
                        title: "ЗП",
                        dataIndex: "managerEarnings",
                        render: (v: number) => (
                          <span className="text-green-600">
                            {v.toLocaleString()} c
                          </span>
                        ),
                      },
                    ]}
                  />
                ),
              },
              {
                key: "finance",
                label: `Финансы (${details.financeHistory.length})`,
                children: (
                  <Table
                    rowKey="key"
                    size="small"
                    dataSource={details.financeHistory}
                    locale={{ emptyText: "Нет начислений и удержаний" }}
                    pagination={false}
                    columns={[
                      {
                        title: "Тип",
                        render: (_v, item) => (
                          <Tag color={item.type === "bonus" ? "blue" : "orange"}>
                            {item.type === "bonus" ? "Выплата ЗП/Бонус" : "Удержание"}
                          </Tag>
                        ),
                      },
                      { title: "Описание", dataIndex: "label" },
                      {
                        title: "Дата",
                        dataIndex: "date",
                        render: (v) => formatDate(v, true),
                      },
                      {
                        title: "Сумма",
                        align: "right",
                        render: (_v, item) => (
                          <span
                            className="text-orange-600 font-semibold"
                          >
                            -
                            {item.amount.toLocaleString()} c
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
