import { useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Avatar,
  Badge,
  Card,
  Col,
  Divider,
  Progress,
  Radio,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  DatePicker,
  Timeline,
  Tooltip,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import type {
  Bonus,
  BonusTarget,
  Branch,
  Expense,
  Manager,
  Sale,
} from "../../../hooks/api/types";
import { formatDate } from "../../../shared/lib/format";
import { useAppStore } from "../../../store/appStore";
import { AnalyticsChart } from "./AnalyticsChart";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export const Dashboard = ({
  sales,
  expenses,
  bonuses,
  managers,
  branches,
  targets,
  user,
}: {
  sales: Sale[];
  expenses: Expense[];
  bonuses: Bonus[];
  managers: Manager[];
  branches: Branch[];
  targets: BonusTarget[];
  user: Manager;
}) => {
  const { appTheme } = useAppStore();
  const isDark = appTheme === "dark";
  const isSuperAdmin =
    user.role === "superadmin" || user.roles?.includes("superadmin");
  const hasAdminAccess =
    isSuperAdmin || user.role === "admin" || user.roles?.includes("admin");
  const isManager = !hasAdminAccess;

  const [period, setPeriod] = useState<
    "day" | "week" | "month" | "custom" | "all"
  >("month");
  const [periodDate, setPeriodDate] = useState<Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("all");

  const availableBranchNames = useMemo(() => {
    const set = new Set<string>([
      ...branches.map((b) => b.name),
      ...sales.map((s) => s.branch).filter(Boolean),
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [branches, sales]);

  const branchFilterSet = useMemo(
    () =>
      isSuperAdmin && selectedBranchNames.length > 0
        ? new Set(selectedBranchNames)
        : null,
    [isSuperAdmin, selectedBranchNames],
  );

  const isWithinPeriod = (dateValue?: string | null) => {
    if (!dateValue) return false;
    const date = dayjs(dateValue);
    if (period === "all") return true;
    if (period === "day") return date.isSame(periodDate, "day");
    if (period === "week") return date.isSame(periodDate, "week");
    if (period === "month") return date.isSame(periodDate, "month");
    if (period === "custom") {
      const [start, end] = customRange;
      return (
        date.isSame(start, "day") ||
        date.isSame(end, "day") ||
        (date.isAfter(start, "day") && date.isBefore(end, "day"))
      );
    }
    return true;
  };

  const filteredSales = useMemo(() => {
    return (sales || []).filter((s) => {
      const byPeriod = isWithinPeriod(s.manualDate || s.createdAt);
      if (!byPeriod) return false;
      if (branchFilterSet) {
        return branchFilterSet.has(s.branch || "");
      }
      if (!hasAdminAccess && user.branchName) {
        return s.branch === user.branchName;
      }
      return true;
    });
  }, [
    sales,
    period,
    periodDate,
    customRange,
    branchFilterSet,
    hasAdminAccess,
    user.branchName,
  ]);

  const filteredExpenses = useMemo(() => {
    const managerSet = branchFilterSet
      ? new Set(
          managers
            .filter((m) => branchFilterSet.has(m.branchName || ""))
            .map((m) => m.id),
        )
      : null;
    return (expenses || []).filter((e) => {
      if (!isWithinPeriod(e.createdAt)) return false;
      if (!managerSet) return true;
      return !!e.managerId && managerSet.has(e.managerId);
    });
  }, [expenses, managers, period, periodDate, customRange, branchFilterSet]);

  const filteredBonuses = useMemo(() => {
    const managerSet = branchFilterSet
      ? new Set(
          managers
            .filter((m) => branchFilterSet.has(m.branchName || ""))
            .map((m) => m.id),
        )
      : null;
    return (bonuses || []).filter((b) => {
      if (!isWithinPeriod(b.createdAt)) return false;
      if (!managerSet) return true;
      return !!b.managerId && managerSet.has(b.managerId);
    });
  }, [bonuses, managers, period, periodDate, customRange, branchFilterSet]);

  const stats = useMemo(() => {
    const totalRev = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const regularExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const bonusesAsExpense = filteredBonuses.reduce((acc, b) => acc + b.amount, 0);
    const totalExp = regularExpenses + bonusesAsExpense;
    const mySales = filteredSales.filter((s) => s.managerId === user.id);
    const myRev = mySales.reduce((acc, s) => acc + s.total, 0);
    const myEarnings = mySales.reduce((acc, s) => acc + s.managerEarnings, 0);
    const netProfit =
      filteredSales.reduce((acc, s) => {
        return (
          acc +
          (s.total -
            s.costPriceSnapshot * s.quantity -
            s.managerEarnings -
            (s.deliveryCost || 0))
        );
      }, 0) - totalExp;
    const avgCheck = filteredSales.length > 0 ? totalRev / filteredSales.length : 0;
    return {
      totalRev,
      totalExp,
      myRev,
      netProfit,
      count: filteredSales.length,
      avgCheck,
      myEarnings,
    };
  }, [filteredSales, filteredExpenses, filteredBonuses, user]);

  const chartData = useMemo(() => {
    const days =
      period === "day"
        ? 1
        : period === "week"
          ? 7
          : period === "custom"
            ? Math.max(1, customRange[1].diff(customRange[0], "day") + 1)
            : 30;
    const chartEnd = period === "custom" ? customRange[1] : periodDate;
    const map: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = (period === "all" ? dayjs() : chartEnd)
        .subtract(i, "day")
        .format("DD.MM");
      map[d] = 0;
    }
    filteredSales.forEach((s) => {
      const d = dayjs(s.manualDate || s.createdAt).format("DD.MM");
      if (d in map) map[d] += s.total;
    });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [filteredSales, period, periodDate, customRange]);

  const managerStats = useMemo(() => {
    const sourceManagers = branchFilterSet
      ? (managers || []).filter((m) => branchFilterSet.has(m.branchName || ""))
      : managers || [];
    return sourceManagers
      .map((m) => {
        const ms = filteredSales.filter((s) => s.managerId === m.id);
        const mb = filteredBonuses.filter(
          (b) => b.managerId === m.id || b.managerName === m.name,
        );
        const me = filteredExpenses.filter(
          (e) =>
            (e.category === "Аванс" || e.category === "Штраф") &&
            (e.managerId === m.id || e.managerName === m.name),
        );
        const earnings = ms.reduce((a, s) => a + s.managerEarnings, 0);
        const bonusesTotal = mb.reduce((a, b) => a + b.amount, 0);
        const advancesTotal = me.reduce((a, e) => a + e.amount, 0);
        return {
          ...m,
          count: ms.length,
          rev: ms.reduce((a, s) => a + s.total, 0),
          earnings,
          bonusesTotal,
          advancesTotal,
          totalSalary: earnings + bonusesTotal - advancesTotal,
          avgCheck:
            ms.length > 0
              ? Math.round(ms.reduce((a, s) => a + s.total, 0) / ms.length)
              : 0,
        };
      })
      .sort((a, b) => b.rev - a.rev);
  }, [managers, filteredSales, filteredBonuses, filteredExpenses, branchFilterSet]);

  const managerReportData = useMemo(() => {
    if (selectedManagerId === "all") return managerStats;
    return managerStats.filter((m) => m.id === selectedManagerId);
  }, [managerStats, selectedManagerId]);

  const branchReportData = useMemo(() => {
    const branchNames = new Set<string>([
      ...branches.map((b) => b.name),
      ...filteredSales.map((s) => s.branch || "—"),
    ]);
    return Array.from(branchNames)
      .map((name) => {
        const bs = filteredSales.filter((s) => (s.branch || "—") === name);
        const revenue = bs.reduce((sum, s) => sum + s.total, 0);
        const profit = bs.reduce(
          (sum, s) =>
            sum +
            (s.total -
              s.costPriceSnapshot * s.quantity -
              s.managerEarnings -
              (s.deliveryCost || 0)),
          0,
        );
        return {
          key: name,
          branch: name,
          count: bs.length,
          revenue,
          profit,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [branches, filteredSales]);

  const globalTargets = (targets || []).filter((t) => t.type === "global");
  const personalTargets = (targets || []).filter((t) => t.type === "personal");
  const totalRevAll = (sales || []).reduce((a, s) => a + s.total, 0);

  const recentActivity = useMemo(() => {
    const bonusItems = (bonuses || []).slice(0, 3).map((b) => ({
      key: `b-${b.id}`,
      color: "green" as const,
      date: b.createdAt,
      content: (
        <div>
          <span className="font-semibold">{b.managerName}</span> — бонус {b.amount} c
          <div className="text-xs text-gray-400">{formatDate(b.createdAt, true)}</div>
        </div>
      ),
    }));

    const saleItems = filteredSales.slice(0, 3).map((s) => ({
      key: `s-${s.id}`,
      color: "blue" as const,
      date: s.manualDate || s.createdAt,
      content: (
        <div>
          <span className="font-semibold">{s.managerName}</span> — {s.productName}{" "}
          {s.total.toLocaleString()} c
          <div className="text-xs text-gray-400">{formatDate(s.manualDate || s.createdAt, true)}</div>
        </div>
      ),
    }));

    return [...bonusItems, ...saleItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map(({ key, color, content }) => ({ key, color, content }));
  }, [bonuses, filteredSales]);

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap gap-3 items-center">
        {isSuperAdmin && (
          <Select
            mode="multiple"
            allowClear
            placeholder="Филиалы (все)"
            style={{ minWidth: 260 }}
            value={selectedBranchNames}
            onChange={setSelectedBranchNames}
            maxTagCount="responsive"
          >
            {availableBranchNames.map((name) => (
              <Option key={name} value={name}>
                {name}
              </Option>
            ))}
          </Select>
        )}
        <Radio.Group
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="day">День</Radio.Button>
          <Radio.Button value="week">Неделя</Radio.Button>
          <Radio.Button value="month">Месяц</Radio.Button>
          <Radio.Button value="custom">Custom</Radio.Button>
          <Radio.Button value="all">Всё время</Radio.Button>
        </Radio.Group>
        {period !== "all" && period !== "custom" && (
          <DatePicker
            value={periodDate}
            onChange={(v) => setPeriodDate(v || dayjs())}
            picker={period === "day" ? "date" : period}
            allowClear={false}
          />
        )}
        {period === "custom" && (
          <RangePicker
            value={customRange}
            onChange={(v) => {
              if (v?.[0] && v?.[1]) setCustomRange([v[0], v[1]]);
            }}
            allowClear={false}
          />
        )}
      </div>

      <Row gutter={[16, 16]}>
        {[
          {
            title: "Выручка",
            value: stats.totalRev,
            color: "#3f8600",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Расходы",
            value: stats.totalExp,
            color: "#cf1322",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Чистая прибыль",
            value: stats.netProfit,
            color: stats.netProfit >= 0 ? "#3f8600" : "#cf1322",
            suffix: "c",
            hideForManager: true,
          },
          {
            title: "Мои продажи",
            value: stats.myRev,
            color: "#1890ff",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Моя ЗП",
            value: stats.myEarnings,
            color: "#722ed1",
            suffix: "c",
            hideForManager: false,
          },
          {
            title: "Средний чек",
            value: Math.round(stats.avgCheck),
            color: "#fa8c16",
            suffix: "c",
            hideForManager: false,
          },
        ]
          .filter((item) => !(isManager && item.hideForManager))
          .map(({ title, value, color, suffix }) => (
            <Col xs={12} sm={8} lg={4} key={title}>
              <Card size="small" className="text-center">
                <Statistic
                  title={title}
                  value={value}
                  suffix={suffix}
                  styles={{
                    content: {
                      color,
                      fontSize: 18,
                    },
                  }}
                />
              </Card>
            </Col>
          ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={`Выручка по дням`} size="small">
            <AnalyticsChart data={chartData} period={period} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Топ менеджеры" size="small">
            <div className="space-y-3">
              {managerStats.slice(0, 5).map((m, idx) => (
                <div key={m.id} className="border-b border-gray-100 pb-2 last:border-0">
                  <div className="flex items-center gap-2 w-full">
                    <Badge
                      count={idx + 1}
                      style={{
                        backgroundColor:
                          idx === 0 ? "#faad14" : idx === 1 ? "#bfbfbf" : "#d46b08",
                      }}
                    />
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span className="flex-1 truncate">{m.name}</span>
                    <Tooltip title={`${m.count} продаж`}>
                      <Tag color="blue">{m.rev.toLocaleString()} c</Tag>
                    </Tooltip>
                  </div>
                  <Progress
                    percent={
                      managerStats[0]?.rev
                        ? Math.round((m.rev / managerStats[0].rev) * 100)
                        : 0
                    }
                    showInfo={false}
                    size="small"
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {targets.length > 0 && (
          <Col xs={24} lg={12}>
            <Card title="Цели" size="small">
              {globalTargets.map((t) => {
                const pct = Math.min(100, Math.round((totalRevAll / t.amount) * 100));
                const daysLeft =
                  t.deadline !== undefined
                    ? dayjs(t.deadline).endOf("day").diff(dayjs(), "day")
                    : null;
                return (
                  <div key={t.id} className="mb-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm mb-1">
                      <span>
                        Выручка: {totalRevAll.toLocaleString()} / {t.amount.toLocaleString()} c
                      </span>
                      <Tag color="gold">Бонус: {t.reward} c</Tag>
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-gray-400 mb-1">
                        до {formatDate(t.deadline)} ·{" "}
                        {daysLeft !== null && daysLeft >= 0
                          ? `осталось ${daysLeft} дн`
                          : `просрочено на ${Math.abs(daysLeft ?? 0)} дн`}
                      </div>
                    )}
                    <Progress percent={pct} status={pct >= 100 ? "success" : "active"} />
                  </div>
                );
              })}
              {personalTargets.map((t) => {
                const managerName = managers.find((m) => m.id === t.managerId)?.name || "Сотрудник";
                const personalIncome = (sales || [])
                  .filter((s) => s.managerId === t.managerId)
                  .reduce((sum, s) => sum + s.total, 0);
                const pct = Math.min(100, Math.round((personalIncome / t.amount) * 100));
                const daysLeft =
                  t.deadline !== undefined
                    ? dayjs(t.deadline).endOf("day").diff(dayjs(), "day")
                    : null;
                return (
                  <div key={t.id} className="mb-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm mb-1">
                      <span>
                        {managerName}: {personalIncome.toLocaleString()} / {t.amount.toLocaleString()} c
                      </span>
                      <Tag color="purple">Личная</Tag>
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-gray-400 mb-1">
                        до {formatDate(t.deadline)} ·{" "}
                        {daysLeft !== null && daysLeft >= 0
                          ? `осталось ${daysLeft} дн`
                          : `просрочено на ${Math.abs(daysLeft ?? 0)} дн`}
                      </div>
                    )}
                    <Progress percent={pct} status={pct >= 100 ? "success" : "active"} />
                  </div>
                );
              })}
            </Card>
          </Col>
        )}
        <Col xs={24} lg={targets.length > 0 ? 12 : 24}>
          <Card title="Последние события" size="small">
            <Timeline items={recentActivity} />
          </Card>
        </Col>
      </Row>

      {!isManager && (
        <Card title="ЗП сотрудников за период" size="small">
          <Row gutter={[12, 12]}>
            {managerStats.map((m) => (
              <Col xs={12} sm={8} md={6} key={m.id}>
                <Card
                  size="small"
                  className={`text-center ${isDark ? "bg-gray-800" : "bg-gray-50"}`}
                >
                  <Avatar icon={<UserOutlined />} className="mb-2" />
                  <div className="font-semibold truncate">{m.name}</div>
                  <Divider style={{ margin: "8px 0" }} />
                  <div className="text-xs text-gray-400">{m.count} продаж</div>
                  <div className="text-green-600 font-bold">{m.totalSalary.toLocaleString()} c</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    ЗП: {m.earnings.toLocaleString()} · Бонус: +{m.bonusesTotal.toLocaleString()} ·
                    Аванс/Штраф: -{m.advancesTotal.toLocaleString()}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {!isManager && (
        <Card title="Отчеты по менеджерам" size="small">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <Select value={selectedManagerId} onChange={setSelectedManagerId} style={{ minWidth: 240 }}>
              <Option value="all">Все менеджеры</Option>
              {managers.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
            <Text type="secondary">
              Период:{" "}
              {period === "custom"
                ? `${customRange[0].format("DD.MM.YYYY")} - ${customRange[1].format("DD.MM.YYYY")}`
                : period === "all"
                  ? "всё время"
                  : period === "day"
                    ? `день (${periodDate.format("DD.MM.YYYY")})`
                    : period === "week"
                      ? `неделя (${periodDate.format("DD.MM.YYYY")})`
                      : `месяц (${periodDate.format("MM.YYYY")})`}
            </Text>
          </div>
          <Table
            size="small"
            rowKey="id"
            dataSource={managerReportData}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
            columns={[
              { title: "Менеджер", dataIndex: "name" },
              { title: "Продаж", dataIndex: "count", width: 90 },
              {
                title: "Выручка",
                dataIndex: "rev",
                render: (v: number) => (
                  <span className="text-blue-600 font-semibold">{v.toLocaleString()} c</span>
                ),
              },
              {
                title: "Средний чек",
                dataIndex: "avgCheck",
                render: (v: number) => `${v.toLocaleString()} c`,
              },
              {
                title: "ЗП от продаж",
                dataIndex: "earnings",
                render: (v: number) => `${v.toLocaleString()} c`,
              },
              {
                title: "Бонусы",
                dataIndex: "bonusesTotal",
                render: (v: number) => <span className="text-green-600">+{v.toLocaleString()} c</span>,
              },
              {
                title: "Аванс/Штраф",
                dataIndex: "advancesTotal",
                render: (v: number) => <span className="text-orange-600">-{v.toLocaleString()} c</span>,
              },
              {
                title: "Итого ЗП",
                dataIndex: "totalSalary",
                render: (v: number) => (
                  <span className={`font-bold ${v >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {v.toLocaleString()} c
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {!isManager && (
        <Card title="Отчеты по филиалам" size="small">
          <Table
            size="small"
            rowKey="key"
            dataSource={branchReportData}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: "Филиал", dataIndex: "branch" },
              { title: "Продаж", dataIndex: "count", width: 90 },
              {
                title: "Выручка",
                dataIndex: "revenue",
                render: (v: number) => (
                  <span className="text-blue-600 font-semibold">{v.toLocaleString()} c</span>
                ),
              },
              {
                title: "Прибыль",
                dataIndex: "profit",
                render: (v: number) => (
                  <span className={v >= 0 ? "text-green-600" : "text-red-500"}>
                    {v.toLocaleString()} c
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};
