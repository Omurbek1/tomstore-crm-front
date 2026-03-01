import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

type SaleLike = {
  id: string;
  createdAt: string;
  manualDate?: string | null;
  total: number;
  quantity?: number;
  paymentType?: string;
  branch?: string;
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
  startDate?: string;
  deadline?: string;
  rewardIssued?: boolean;
  rewardIssuedAt?: string | null;
  rewardApprovedBy?: string | null;
};

type ManagerLike = {
  id: string;
  name: string;
};

type MarketingKpiLike = {
  id: string;
  managerId: string;
  managerName: string;
  managerRole?: string;
  month: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  salaryBonus: number;
  salaryTotal: number;
};

type Props = {
  sales: SaleLike[];
  expenses: ExpenseLike[];
  bonuses: BonusLike[];
  targets: TargetLike[];
  managers: ManagerLike[];
  marketingKpis?: MarketingKpiLike[];
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
  canUploadSalesReport?: boolean;
};

export const FinanceSection = ({
  sales,
  expenses,
  bonuses,
  targets,
  managers,
  marketingKpis = [],
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
  canUploadSalesReport,
}: Props) => {
  const isKpiAccrualEligibleRole = (role?: string | null) => {
    const normalized = String(role || "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    return (
      normalized !== "manager" &&
      normalized !== "cashier" &&
      normalized !== "storekeeper"
    );
  };

  const [reportRange, setReportRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [reportBranch, setReportBranch] = useState<string>("all");
  const [reportManager, setReportManager] = useState<string>("all");
  const [reportPayment, setReportPayment] = useState<string>("all");
  const [reportSearch, setReportSearch] = useState("");

  const reportBranches = useMemo(() => {
    const values = new Set<string>();
    sales.forEach((s) => {
      const branch = String(s.branch || "").trim();
      if (branch) values.add(branch);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ru"));
  }, [sales]);

  const reportManagers = useMemo(() => {
    const values = new Set<string>();
    sales.forEach((s) => {
      const manager = String(s.managerName || "").trim();
      if (manager) values.add(manager);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ru"));
  }, [sales]);

  const reportPaymentTypes = useMemo(() => {
    const values = new Set<string>();
    sales.forEach((s) => {
      const paymentType = String(s.paymentType || "").trim();
      if (paymentType) values.add(paymentType);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "ru"));
  }, [sales]);

  const filteredReportSales = useMemo(() => {
    const [from, to] = reportRange;
    const q = reportSearch.trim().toLowerCase();
    return sales.filter((s) => {
      const date = dayjs(s.manualDate || s.createdAt);
      const inRange =
        date.isAfter(from.startOf("day")) && date.isBefore(to.endOf("day"));
      if (!inRange) return false;
      if (reportBranch !== "all" && (s.branch || "") !== reportBranch) return false;
      if (reportManager !== "all" && (s.managerName || "") !== reportManager) return false;
      if (reportPayment !== "all" && (s.paymentType || "") !== reportPayment) return false;
      if (!q) return true;
      const source = `${s.productName} ${s.clientName} ${s.managerName} ${s.branch || ""}`.toLowerCase();
      return source.includes(q);
    });
  }, [sales, reportRange, reportBranch, reportManager, reportPayment, reportSearch]);

  const reportSummary = useMemo(() => {
    const totalRevenue = filteredReportSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalQty = filteredReportSales.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
    const returns = filteredReportSales.filter((s) => Number(s.total || 0) < 0).length;
    const managerByName = new Map(
      managers.map((m) => [String(m.name || "").trim(), m.id]),
    );
    const from = reportRange[0].startOf("day");
    const to = reportRange[1].endOf("day");
    const isInRange = (value: Dayjs) =>
      value.isSame(from, "day") ||
      value.isSame(to, "day") ||
      (value.isAfter(from, "day") && value.isBefore(to, "day"));
    const kpiSalaryAccrued = marketingKpis.reduce((sum, k) => {
      if (!isKpiAccrualEligibleRole(k.managerRole)) return sum;
      const effectiveDate = dayjs(k.periodEnd || k.periodStart || `${k.month}-01`).endOf("day");
      if (!isInRange(effectiveDate)) return sum;
      if (reportManager !== "all") {
        const managerIdByName = managerByName.get(reportManager);
        if (k.managerId !== managerIdByName && k.managerName !== reportManager) return sum;
      }
      return sum + Number(k.salaryTotal || 0);
    }, 0);
    const kpiAutoBonuses = marketingKpis.reduce((sum, k) => {
      if (!isKpiAccrualEligibleRole(k.managerRole)) return sum;
      const effectiveDate = dayjs(k.periodEnd || k.periodStart || `${k.month}-01`).endOf("day");
      if (!isInRange(effectiveDate)) return sum;
      if (reportManager !== "all") {
        const managerIdByName = managerByName.get(reportManager);
        if (k.managerId !== managerIdByName && k.managerName !== reportManager) return sum;
      }
      return sum + Math.max(0, Number(k.salaryBonus || 0));
    }, 0);
    return {
      totalRevenue,
      totalQty,
      totalOrders: filteredReportSales.length,
      returns,
      kpiSalaryAccrued,
      kpiAutoBonuses,
    };
  }, [filteredReportSales, marketingKpis, reportManager, managers, reportRange]);

  const escapeCsvCell = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes('"') || text.includes(",") || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportSalesRowsCsv = () => {
    if (!filteredReportSales.length) {
      message.warning("Нет данных по выбранным фильтрам");
      return;
    }
    const rows: string[][] = [
      ["date", "productName", "managerName", "clientName", "quantity", "total", "branch", "paymentType"],
      ...filteredReportSales.map((s) => [
        formatDate(s.manualDate || s.createdAt, true),
        s.productName,
        s.managerName,
        s.clientName,
        String(Number(s.quantity || 1)),
        String(Number(s.total || 0)),
        String(s.branch || ""),
        String(s.paymentType || ""),
      ]),
    ];
    downloadCsv(
      `sales-report-${reportRange[0].format("YYYYMMDD")}-${reportRange[1].format("YYYYMMDD")}.csv`,
      rows,
    );
    message.success("Отчет продаж выгружен");
  };

  const exportSalesSummaryCsv = () => {
    if (!filteredReportSales.length) {
      message.warning("Нет данных по выбранным фильтрам");
      return;
    }
    const byManager = new Map<string, { orders: number; qty: number; revenue: number }>();
    filteredReportSales.forEach((s) => {
      const name = s.managerName || "Не указан";
      const cur = byManager.get(name) || { orders: 0, qty: 0, revenue: 0 };
      cur.orders += 1;
      cur.qty += Number(s.quantity || 1);
      cur.revenue += Number(s.total || 0);
      byManager.set(name, cur);
    });
    const from = reportRange[0].startOf("day");
    const to = reportRange[1].endOf("day");
    const isInRange = (value: Dayjs) =>
      value.isSame(from, "day") ||
      value.isSame(to, "day") ||
      (value.isAfter(from, "day") && value.isBefore(to, "day"));
    marketingKpis.forEach((k) => {
      if (!isKpiAccrualEligibleRole(k.managerRole)) return;
      const effectiveDate = dayjs(k.periodEnd || k.periodStart || `${k.month}-01`).endOf("day");
      if (!isInRange(effectiveDate)) return;
      const name = k.managerName || "Не указан";
      const cur = byManager.get(name) || { orders: 0, qty: 0, revenue: 0 };
      cur.revenue += Number(k.salaryTotal || 0);
      byManager.set(name, cur);
    });
    const rows: string[][] = [
      ["managerName", "orders", "quantity", "revenue"],
      ...Array.from(byManager.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([manager, v]) => [
          manager,
          String(v.orders),
          String(v.qty),
          String(v.revenue),
        ]),
    ];
    downloadCsv(
      `sales-summary-${reportRange[0].format("YYYYMMDD")}-${reportRange[1].format("YYYYMMDD")}.csv`,
      rows,
    );
    message.success("Сводный отчет выгружен");
  };

  const totalIncome = sales.reduce((a, s) => a + s.total, 0);
  const isManagerLinkedExpense = (expense: ExpenseLike) =>
    Boolean(expense.managerName);
  const totalExpenses = expenses
    .filter((e) => !isManagerLinkedExpense(e))
    .reduce((a, e) => a + e.amount, 0);
  const totalBonuses = bonuses.reduce((a, b) => a + b.amount, 0);
  const totalExpensesIncludingBonuses = totalExpenses + totalBonuses;
  const totalSalariesPaid = expenses
    .filter((e) => e.category === "Аванс" || e.category === "Штраф")
    .reduce((a, e) => a + e.amount, 0);
  const netCash = totalIncome - totalExpensesIncludingBonuses;

  type Movement = {
    key: string;
    date: string;
    type: "income" | "expense" | "bonus" | "refund";
    label: string;
    sub: string;
    amount: number;
  };
  const movementRowClassByType: Record<Movement["type"], string> = {
    income: "finance-movement-row finance-movement-row--income",
    bonus: "finance-movement-row finance-movement-row--bonus",
    expense: "finance-movement-row finance-movement-row--expense",
    refund: "finance-movement-row finance-movement-row--expense",
  };
  const allMovements: Movement[] = [
    ...sales.map((s) => ({
      key: `s-${s.id}`,
      date: s.manualDate || s.createdAt,
      type: s.total >= 0 ? ("income" as const) : ("refund" as const),
      label: s.total >= 0 ? `Продажа: ${s.productName}` : `Возврат: ${s.productName}`,
      sub: `${s.managerName} · ${s.clientName}`,
      amount: Math.abs(s.total),
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
          {t === "income"
            ? "Приход"
            : t === "bonus"
              ? "Выплата"
              : t === "refund"
                ? "Возврат"
                : "Расход"}
        </Tag>
      ),
    },
    { title: "Описание", dataIndex: "label" },
    {
      title: "Детали",
      dataIndex: "sub",
      render: (v) => <span className="text-slate-500 dark:text-slate-300 text-xs">{v}</span>,
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      align: "right",
      render: (v, r) => (
        <span className={`font-bold ${r.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
                pagination={{ pageSize: 10 }}
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
                  pagination={{ pageSize: 10 }}
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
                      render: (v) => <span className="text-rose-600 dark:text-rose-400 font-bold">-{v.toLocaleString()} c</span>,
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
                  pagination={{ pageSize: 10 }}
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
                        <Tag color={item.isExpense ? "orange" : "blue"}>
                          {item.isExpense ? "Аванс/Штраф" : "ЗП/Бонус (выплата)"}
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
                        <div className="font-bold text-lg text-rose-600 dark:text-rose-400">
                          -
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
                              <span className="text-xs text-slate-500 dark:text-slate-300 ml-2">
                                {t.startDate
                                  ? `с ${formatDate(t.startDate)} до ${formatDate(t.deadline)}`
                                  : `до ${formatDate(t.deadline)}`}{" "}
                                ·{" "}
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
          ...(canUploadSalesReport
            ? [
                {
                  key: "sales-upload-analysis",
                  label: "Выгрузка отчета продаж",
                  children: (
                    <div className="space-y-4">
                      <Card
                        size="small"
                        title="Экспорт отчета продаж"
                        extra={
                          <Space>
                            <Button type="primary" onClick={exportSalesRowsCsv}>
                              Детальный CSV
                            </Button>
                            <Button onClick={exportSalesSummaryCsv}>
                              Сводка CSV
                            </Button>
                          </Space>
                        }
                      >
                        <Row gutter={[8, 8]}>
                          <Col xs={24} md={10}>
                            <RangePicker
                              className="w-full"
                              value={reportRange}
                              onChange={(value) => {
                                if (value?.[0] && value?.[1]) {
                                  setReportRange([value[0], value[1]]);
                                }
                              }}
                              allowClear={false}
                            />
                          </Col>
                          <Col xs={24} md={5}>
                            <Select
                              className="w-full"
                              value={reportBranch}
                              onChange={setReportBranch}
                              options={[
                                { value: "all", label: "Все филиалы" },
                                ...reportBranches.map((b) => ({ value: b, label: b })),
                              ]}
                            />
                          </Col>
                          <Col xs={24} md={5}>
                            <Select
                              className="w-full"
                              value={reportManager}
                              onChange={setReportManager}
                              options={[
                                { value: "all", label: "Все менеджеры" },
                                ...reportManagers.map((m) => ({ value: m, label: m })),
                              ]}
                            />
                          </Col>
                          <Col xs={24} md={4}>
                            <Select
                              className="w-full"
                              value={reportPayment}
                              onChange={setReportPayment}
                              options={[
                                { value: "all", label: "Все оплаты" },
                                ...reportPaymentTypes.map((p) => ({ value: p, label: p })),
                              ]}
                            />
                          </Col>
                          <Col xs={24}>
                            <Input
                              value={reportSearch}
                              onChange={(e) => setReportSearch(e.target.value)}
                              placeholder="Поиск: товар, клиент, менеджер"
                              allowClear
                            />
                          </Col>
                        </Row>
                      </Card>

                      <Row gutter={[12, 12]}>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic title="Заказов" value={reportSummary.totalOrders} />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic title="Возвраты" value={reportSummary.returns} />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic title="Кол-во позиций" value={reportSummary.totalQty} />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic
                              title="Авто начислено (KPI)"
                              value={reportSummary.kpiSalaryAccrued}
                              suffix="c"
                            />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic
                              title="Авто KPI бонус"
                              value={reportSummary.kpiAutoBonuses}
                              suffix="c"
                            />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic
                              title="Выручка"
                              value={reportSummary.totalRevenue}
                              suffix="c"
                              styles={{
                                content: {
                                  color: reportSummary.totalRevenue >= 0 ? "#3f8600" : "#cf1322",
                                },
                              }}
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Card size="small" title="Предпросмотр (последние 20 строк)">
                        <Table
                          size="small"
                          rowKey={(row) => row.id}
                          dataSource={filteredReportSales.slice(0, 20)}
                          pagination={false}
                          scroll={{ x: 900 }}
                          locale={{ emptyText: "Нет данных по выбранным фильтрам" }}
                          columns={[
                            {
                              title: "Дата",
                              dataIndex: "createdAt",
                              width: 160,
                              render: (_v, row) => formatDate(row.manualDate || row.createdAt, true),
                            },
                            { title: "Товар", dataIndex: "productName" },
                            { title: "Клиент", dataIndex: "clientName" },
                            { title: "Менеджер", dataIndex: "managerName", width: 160 },
                            {
                              title: "Кол-во",
                              dataIndex: "quantity",
                              width: 90,
                              align: "right",
                              render: (v: number) => Number(v || 1).toLocaleString(),
                            },
                            { title: "Филиал", dataIndex: "branch", width: 130 },
                            { title: "Оплата", dataIndex: "paymentType", width: 120 },
                            {
                              title: "Сумма",
                              dataIndex: "total",
                              width: 120,
                              align: "right",
                              render: (v: number) => (
                                <Typography.Text
                                  strong
                                  type={Number(v || 0) >= 0 ? "success" : "danger"}
                                >
                                  {Number(v || 0).toLocaleString()} c
                                </Typography.Text>
                              ),
                            },
                          ]}
                        />
                      </Card>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
};
