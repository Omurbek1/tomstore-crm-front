import { Avatar, Button, Card, Col, Popconfirm, Progress, Row, Statistic, Table, Tabs, Tag } from "antd";
import { DeleteOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

type SaleLike = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  total: number;
  productName: string;
  managerId?: string;
  managerName: string;
  clientName: string;
};

type ExpenseLike = {
  id: string;
  createdAt: string;
  amount: number;
  category: string;
  comment?: string;
  managerName?: string;
};

type BonusLike = {
  id: string;
  createdAt: string;
  amount: number;
  reason: string;
  managerName: string;
};

type PayoutLike = {
  id: string;
  date: string;
  isExpense: boolean;
  amount: number;
  managerName?: string;
  managerId?: string;
  reason: string;
};

type TargetLike = {
  id: string;
  type: "global" | "personal";
  managerId?: string;
  amount: number;
  reward: number;
  rewardType?: "money" | "material";
  rewardText?: string | null;
  deadline?: string;
  rewardIssued?: boolean;
  rewardIssuedAt?: string | null;
  rewardApprovedBy?: string | null;
};

type ManagerLike = {
  id: string;
  name: string;
};

type Props = {
  sales: SaleLike[];
  expenses: ExpenseLike[];
  bonuses: BonusLike[];
  targets: TargetLike[];
  managers: ManagerLike[];
  combinedPayouts: PayoutLike[];
  onOpenExpense: () => void;
  onOpenFinance: () => void;
  onOpenTarget: () => void;
  onDeleteTarget: (id: string) => void;
  onIssueTargetReward: (target: TargetLike) => void;
  issuingTargetReward?: boolean;
  canApproveTargetReward?: boolean;
  onOpenSalaryHistory: (payload: { id?: string; name?: string }) => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

export const FinanceSection = ({
  sales,
  expenses,
  bonuses,
  targets,
  managers,
  combinedPayouts,
  onOpenExpense,
  onOpenFinance,
  onOpenTarget,
  onDeleteTarget,
  onIssueTargetReward,
  issuingTargetReward,
  canApproveTargetReward,
  onOpenSalaryHistory,
  formatDate,
}: Props) => {
  const totalIncome = sales.reduce((a, s) => a + s.total, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const totalBonuses = bonuses.reduce((a, b) => a + b.amount, 0);
  const totalExpensesIncludingBonuses = totalExpenses + totalBonuses;
  const totalSalariesPaid = expenses
    .filter((e) => e.category === "Аванс" || e.category === "Штраф")
    .reduce((a, e) => a + e.amount, 0);
  const netCash = totalIncome - totalExpensesIncludingBonuses;

  type Movement = {
    key: string;
    date: string;
    type: "income" | "expense" | "bonus";
    label: string;
    sub: string;
    amount: number;
  };
  const movementRowClassByType: Record<Movement["type"], string> = {
    income: "finance-movement-row finance-movement-row--income",
    bonus: "finance-movement-row finance-movement-row--bonus",
    expense: "finance-movement-row finance-movement-row--expense",
  };
  const allMovements: Movement[] = [
    ...sales.map((s) => ({
      key: `s-${s.id}`,
      date: s.manualDate || s.createdAt,
      type: "income" as const,
      label: `Продажа: ${s.productName}`,
      sub: `${s.managerName} · ${s.clientName}`,
      amount: s.total,
    })),
    ...expenses.map((e) => ({
      key: `e-${e.id}`,
      date: e.createdAt,
      type: "expense" as const,
      label: `Расход: ${e.category}`,
      sub: e.comment || e.managerName || "",
      amount: e.amount,
    })),
    ...bonuses.map((b) => ({
      key: `b-${b.id}`,
      date: b.createdAt,
      type: "bonus" as const,
      label: `Выплата: ${b.reason}`,
      sub: b.managerName,
      amount: b.amount,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const movementColumns: ColumnsType<Movement> = [
    {
      title: "Дата",
      dataIndex: "date",
      width: 110,
      render: (d) => formatDate(d, true),
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 100,
      render: (t) => (
        <Tag color={t === "income" ? "green" : t === "bonus" ? "orange" : "red"}>
          {t === "income" ? "Приход" : t === "bonus" ? "Выплата" : "Расход"}
        </Tag>
      ),
    },
    { title: "Описание", dataIndex: "label" },
    {
      title: "Детали",
      dataIndex: "sub",
      render: (v) => <span className="text-gray-400 text-xs">{v}</span>,
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      align: "right",
      render: (v, r) => (
        <span className={`font-bold ${r.type === "income" ? "text-green-600" : "text-red-500"}`}>
          {r.type === "income" ? "+" : "-"}
          {v.toLocaleString()} c
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        {[
          { label: "Общая выручка", value: totalIncome, color: "#3f8600" },
          { label: "Все расходы (с бонусами)", value: totalExpensesIncludingBonuses, color: "#cf1322" },
          { label: "Выплаты бонусов", value: totalBonuses, color: "#fa8c16" },
          { label: "Авансы/Штрафы", value: totalSalariesPaid, color: "#d46b08" },
          {
            label: "Чистый остаток",
            value: netCash,
            color: netCash >= 0 ? "#3f8600" : "#cf1322",
          },
        ].map(({ label, value, color }) => (
          <Col xs={12} sm={8} lg={24 / 5} key={label}>
            <Card size="small">
              <Statistic title={label} value={value} suffix="c" 
              styles={{
                content:{
                  color,
                  fontSize: 16,
                }
              }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs
        defaultActiveKey="movements"
        items={[
          {
            key: "movements",
            label: "Все движения",
            children: (
              <Table
                dataSource={allMovements}
                columns={movementColumns}
                rowKey="key"
                size="small"
                pagination={{ pageSize: 15 }}
                scroll={{ x: 700 }}
                rowClassName={(r) => movementRowClassByType[r.type]}
              />
            ),
          },
          {
            key: "expenses",
            label: `Расходы (${expenses.length})`,
            children: (
              <div>
                <div className="flex justify-end mb-3">
                  <Button type="primary" icon={<PlusOutlined />} onClick={onOpenExpense}>
                    Добавить расход
                  </Button>
                </div>
                <Table
                  dataSource={[...expenses].sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  )}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 12 }}
                  scroll={{ x: 760 }}
                  columns={[
                    {
                      title: "Дата",
                      dataIndex: "createdAt",
                      width: 110,
                      render: (d) => formatDate(d, true),
                    },
                    {
                      title: "Категория",
                      dataIndex: "category",
                      render: (c) => <Tag>{c}</Tag>,
                    },
                    { title: "Комментарий", dataIndex: "comment" },
                    {
                      title: "Сотрудник",
                      dataIndex: "managerName",
                      render: (v) => v || "—",
                    },
                    {
                      title: "Сумма",
                      dataIndex: "amount",
                      align: "right",
                      render: (v) => <span className="text-red-500 font-bold">-{v.toLocaleString()} c</span>,
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: "salaries",
            label: `Выплаты (${combinedPayouts.length})`,
            children: (
              <div>
                <div className="flex justify-end mb-3">
                  <Button type="primary" icon={<PlusOutlined />} onClick={onOpenFinance}>
                    Начислить
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={combinedPayouts}
                  pagination={{ pageSize: 12 }}
                  columns={[
                    {
                      title: "Сотрудник",
                      render: (_v, item) => (
                        <div className="flex items-center gap-2">
                          <Avatar icon={<UserOutlined />} />
                          <Button
                            type="link"
                            className="p-0 h-auto"
                            onClick={() =>
                              onOpenSalaryHistory({
                                id: item.managerId,
                                name: item.managerName,
                              })
                            }
                          >
                            {item.managerName || item.managerId}
                          </Button>
                        </div>
                      ),
                    },
                    {
                      title: "Тип",
                      render: (_v, item) => (
                        <Tag color={item.isExpense ? "orange" : "green"}>
                          {item.isExpense ? "Аванс/Штраф" : "Бонус/ЗП"}
                        </Tag>
                      ),
                    },
                    { title: "Причина", dataIndex: "reason" },
                    {
                      title: "Дата",
                      dataIndex: "date",
                      render: (v) => formatDate(v, true),
                    },
                    {
                      title: "Сумма",
                      align: "right",
                      render: (_v, item) => (
                        <div className={`font-bold text-lg ${item.isExpense ? "text-orange-500" : "text-green-600"}`}>
                          {item.isExpense ? "-" : "+"}
                          {item.amount.toLocaleString()} c
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
          {
            key: "targets",
            label: "Цели",
            children: (
              <div>
                <div className="flex justify-end mb-3">
                  <Button icon={<PlusOutlined />} onClick={onOpenTarget}>
                    Добавить цель
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={targets}
                  pagination={false}
                  columns={[
                    {
                      title: "Цель",
                      render: (_v, t) => {
                        const managerName =
                          t.type === "personal"
                            ? managers.find((m) => m.id === t.managerId)?.name || "Сотрудник"
                            : null;
                        const daysLeft =
                          t.deadline !== undefined
                            ? dayjs(t.deadline).endOf("day").diff(dayjs(), "day")
                            : null;
                        return (
                          <span>
                            <Tag color={t.type === "global" ? "blue" : "purple"}>
                              {t.type === "global" ? "Общая" : "Личная"}
                            </Tag>
                            {t.amount.toLocaleString()} c
                            {managerName && <span className="ml-2">{managerName}</span>}
                            {t.deadline && (
                              <span className="text-xs text-gray-400 ml-2">
                                до {formatDate(t.deadline)} ·{" "}
                                {daysLeft !== null && daysLeft >= 0
                                  ? `осталось ${daysLeft} дн`
                                  : `просрочено на ${Math.abs(daysLeft ?? 0)} дн`}
                              </span>
                            )}
                          </span>
                        );
                      },
                    },
                    {
                      title: "Прогресс",
                      render: (_v, t) => {
                        const currentIncome =
                          t.type === "personal"
                            ? sales
                                .filter((s) => s.managerId === t.managerId)
                                .reduce((sum, s) => sum + s.total, 0)
                            : totalIncome;
                        const pct = Math.min(100, Math.round((currentIncome / t.amount) * 100));
                        return (
                          <div className="w-full max-w-[24rem]">
                            <div className="flex justify-between text-xs mb-1">
                              <span>
                                {currentIncome.toLocaleString()} / {t.amount.toLocaleString()} c
                              </span>
                              {t.rewardType === "material" ? (
                                <Tag color="purple">
                                  Награда: {t.rewardText || "Материальная"}
                                </Tag>
                              ) : (
                                <Tag color="gold">
                                  Бонус: {Number(t.reward || 0).toLocaleString()} c
                                </Tag>
                              )}
                            </div>
                            <Progress
                              percent={pct}
                              status={pct >= 100 ? "success" : "active"}
                              size="small"
                            />
                          </div>
                        );
                      },
                    },
                    {
                      title: "Действие",
                      width: 260,
                      render: (_v, t) => (
                        <div className="flex items-center gap-2 justify-end">
                          {t.rewardIssued ? (
                            <Tag color="green">
                              Выдано {t.rewardIssuedAt ? `(${formatDate(t.rewardIssuedAt, true)})` : ""}
                            </Tag>
                          ) : null}
                          {canApproveTargetReward ? (
                            (() => {
                              const currentIncome =
                                t.type === "personal"
                                  ? sales
                                      .filter((s) => s.managerId === t.managerId)
                                      .reduce((sum, s) => sum + s.total, 0)
                                  : totalIncome;
                              const achieved = currentIncome >= Number(t.amount || 0);
                              return (
                                <Popconfirm
                                  title={
                                    t.rewardType === "material"
                                      ? "Подтвердить выдачу награды?"
                                      : "Подтвердить выплату бонуса?"
                                  }
                                  description={
                                    t.rewardType === "material"
                                      ? `Выдать: ${t.rewardText || "Материальная награда"}`
                                      : `Выдать ${Number(t.reward || 0).toLocaleString()} c за выполненную цель`
                                  }
                                  okText="Подтвердить"
                                  cancelText="Отмена"
                                  onConfirm={() => onIssueTargetReward(t)}
                                  disabled={!achieved || !!t.rewardIssued}
                                >
                                  <Button
                                    size="small"
                                    type="primary"
                                    loading={issuingTargetReward}
                                    disabled={!achieved || !!t.rewardIssued}
                                  >
                                    {t.rewardType === "material"
                                      ? "Выдать награду"
                                      : "Выдать бонус"}
                                  </Button>
                                </Popconfirm>
                              );
                            })()
                          ) : null}
                          <Popconfirm title="Удалить цель?" onConfirm={() => onDeleteTarget(t.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
