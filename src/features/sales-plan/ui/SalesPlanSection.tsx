import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useCreateTarget, useDeleteTarget, useUpdateTarget } from "../../../hooks/api/targets";
import { useAiAnalyze } from "../../../hooks/api/ai";
import type { BonusTarget, Branch, Manager, Sale } from "../../../hooks/api/types";

const { Option } = Select;
const { RangePicker } = DatePicker;

type Props = {
  sales: Sale[];
  targets: BonusTarget[];
  managers: Manager[];
  branches: Branch[];
  user: Manager;
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

type PlanFormValues = {
  managerId: string;
  amount: number;
  reward?: number;
  period?: [Dayjs, Dayjs];
};

const hasSalesRole = (manager?: Manager | null) => {
  if (!manager || manager.deleted) return false;
  const tokens = new Set<string>([
    String(manager.role || "")
      .trim()
      .toLowerCase(),
    ...((manager.roles || []) as string[]).map((r) =>
      String(r || "")
        .trim()
        .toLowerCase(),
    ),
  ]);
  return tokens.has("manager");
};

const getPeriodBounds = (
  period: "week" | "month" | "custom",
  periodDate: Dayjs,
  customRange: [Dayjs, Dayjs],
) => {
  if (period === "custom") {
    return {
      start: customRange[0].startOf("day"),
      end: customRange[1].endOf("day"),
    };
  }

  return {
    start: periodDate.startOf(period),
    end: periodDate.endOf(period),
  };
};

const inRange = (date: Dayjs, start: Dayjs, end: Dayjs) =>
  date.isSame(start, "day") ||
  date.isSame(end, "day") ||
  (date.isAfter(start, "day") && date.isBefore(end, "day"));

const buildCoachHint = (params: {
  periodPercent: number;
  weekFact: number;
  weekPlan: number;
  remaining: number;
  forecast: number;
  plan: number;
}) => {
  const { periodPercent, weekFact, weekPlan, remaining, forecast, plan } = params;
  if (periodPercent >= 120) {
    return {
      level: "success" as const,
      text: "Лидер. Дайте роль наставника: 1 разбор звонков в день + передача лучших скриптов команде.",
    };
  }
  if (periodPercent >= 100) {
    return {
      level: "good" as const,
      text: "План выполнен. Фокус на апсейл/кросс-сейл, чтобы создать запас на следующий период.",
    };
  }
  if (periodPercent >= 70) {
    const delta = Math.max(0, plan - forecast);
    return {
      level: "work" as const,
      text:
        delta > 0
          ? `Есть шанс выполнить. Не хватает прогноза ~${Math.round(delta).toLocaleString()} c. Добавьте 30 мин тренировки обработки возражений ежедневно.`
          : "Темп хороший. Поддержите ежедневный контроль воронки и конверсии.",
    };
  }
  if (weekFact < weekPlan) {
    return {
      level: "risk" as const,
      text: `Риск срыва плана. Проведите коучинг по скриптам и квалификации лида. Закрыть разрыв: ${Math.round(remaining).toLocaleString()} c.`,
    };
  }
  return {
    level: "risk" as const,
    text: "Низкий темп. Нужен индивидуальный план развития: скрипт, работа с возражениями, контроль ежедневной активности.",
  };
};

export const SalesPlanSection = ({
  sales,
  targets,
  managers,
  branches,
  user,
  formatDate,
}: Props) => {
  const [createForm] = Form.useForm<PlanFormValues>();
  const [editForm] = Form.useForm<PlanFormValues>();
  const [teamCreateForm] = Form.useForm<Omit<PlanFormValues, "managerId">>();
  const [teamEditForm] = Form.useForm<Omit<PlanFormValues, "managerId">>();

  const isSuperAdmin =
    user.role === "superadmin" || user.roles?.includes("superadmin");
  const hasAdminAccess =
    isSuperAdmin || user.role === "admin" || user.roles?.includes("admin");

  const [period, setPeriod] = useState<"week" | "month" | "custom">("month");
  const [periodDate, setPeriodDate] = useState<Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);
  const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>([]);
  const [editingPlan, setEditingPlan] = useState<BonusTarget | null>(null);
  const [editingTeamPlan, setEditingTeamPlan] = useState<BonusTarget | null>(null);
  const [showAlerts, setShowAlerts] = useState(true);

  const createTarget = useCreateTarget();
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();
  const aiAnalyze = useAiAnalyze();
  const [aiReport, setAiReport] = useState<{
    source: "llm" | "rule-based";
    summary: string;
    risks: string[];
    opportunities: string[];
    recommendations: string[];
  } | null>(null);

  const availableBranchNames = useMemo(() => {
    const set = new Set<string>([
      ...branches.map((b) => b.name),
      ...sales.map((s) => s.branch).filter(Boolean),
      ...managers.map((m) => m.branchName || "").filter(Boolean),
    ]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [branches, sales, managers]);

  const branchFilterSet = useMemo(
    () =>
      isSuperAdmin && selectedBranchNames.length > 0
        ? new Set(selectedBranchNames)
        : null,
    [isSuperAdmin, selectedBranchNames],
  );

  const salesManagers = useMemo(
    () => (managers || []).filter(hasSalesRole),
    [managers],
  );

  const scopedManagers = useMemo(() => {
    return salesManagers.filter((m) => {
      if (branchFilterSet && !branchFilterSet.has(m.branchName || "")) return false;
      if (!hasAdminAccess && user.branchName && m.branchName !== user.branchName) return false;
      return true;
    });
  }, [salesManagers, branchFilterSet, hasAdminAccess, user.branchName]);

  const salesManagerIdSet = useMemo(
    () => new Set(scopedManagers.map((m) => m.id)),
    [scopedManagers],
  );

  const scopedSales = useMemo(() => {
    return (sales || []).filter((s) => {
      if (!salesManagerIdSet.has(String(s.managerId || ""))) return false;
      if (branchFilterSet && !branchFilterSet.has(s.branch || "")) return false;
      if (!hasAdminAccess && user.branchName && s.branch !== user.branchName) return false;
      return true;
    });
  }, [sales, salesManagerIdSet, branchFilterSet, hasAdminAccess, user.branchName]);

  const scopedPlans = useMemo(
    () =>
      (targets || []).filter(
        (t) => t.type === "personal" && !!t.managerId && salesManagerIdSet.has(String(t.managerId)),
      ),
    [targets, salesManagerIdSet],
  );
  const scopedTeamPlans = useMemo(
    () => (targets || []).filter((t) => t.type === "global"),
    [targets],
  );

  const { start: periodStart, end: periodEnd } = useMemo(
    () => getPeriodBounds(period, periodDate, customRange),
    [period, periodDate, customRange],
  );

  const periodSales = useMemo(
    () =>
      scopedSales.filter((s) =>
        inRange(dayjs(s.manualDate || s.createdAt), periodStart, periodEnd),
      ),
    [scopedSales, periodStart, periodEnd],
  );

  const rows = useMemo(() => {
    const totalDays = Math.max(1, periodEnd.diff(periodStart, "day") + 1);
    const elapsedDays = Math.max(
      1,
      Math.min(totalDays, dayjs().endOf("day").diff(periodStart, "day") + 1),
    );

    return scopedPlans
      .map((t) => {
        const manager = scopedManagers.find((m) => m.id === t.managerId);
        const periodPlan = Number(t.amount || 0);
        const periodFact = periodSales
          .filter((s) => s.managerId === t.managerId)
          .reduce((sum, s) => sum + Number(s.total || 0), 0);

        const weekPlan = Math.round(periodPlan / Math.max(1, Math.ceil(totalDays / 7)));
        const monthPlan = periodPlan;

        const weekFact = scopedSales
          .filter((s) => s.managerId === t.managerId)
          .filter((s) => dayjs(s.manualDate || s.createdAt).isSame(dayjs(), "week"))
          .reduce((sum, s) => sum + Number(s.total || 0), 0);

        const monthFact = scopedSales
          .filter((s) => s.managerId === t.managerId)
          .filter((s) => dayjs(s.manualDate || s.createdAt).isSame(dayjs(), "month"))
          .reduce((sum, s) => sum + Number(s.total || 0), 0);

        const periodPercent = periodPlan > 0 ? Math.round((periodFact / periodPlan) * 100) : 0;
        const forecast = (periodFact / elapsedDays) * totalDays;
        const coachHint = buildCoachHint({
          periodPercent,
          weekFact,
          weekPlan,
          remaining: Math.max(0, periodPlan - periodFact),
          forecast,
          plan: periodPlan,
        });

        return {
          key: t.id,
          id: t.id,
          managerName: manager?.name || "Сотрудник",
          branchName: manager?.branchName || "—",
          weekPlan,
          weekFact,
          monthPlan,
          monthFact,
          periodPlan,
          periodFact,
          periodPercent,
          remaining: Math.max(0, periodPlan - periodFact),
          forecast,
          reward: Number(t.reward || 0),
          rewardType: t.rewardType || "money",
          rewardIssued: Boolean((t as BonusTarget & { rewardIssued?: boolean }).rewardIssued),
          startDate: t.startDate,
          deadline: t.deadline,
          coachHint,
        };
      })
      .sort((a, b) => b.periodPercent - a.periodPercent);
  }, [scopedPlans, scopedManagers, periodSales, scopedSales, periodStart, periodEnd]);

  const teamRows = useMemo(() => {
    const salesTotalByRange = (start?: string, end?: string) => {
      if (!start || !end) return 0;
      const startDate = dayjs(start).startOf("day");
      const endDate = dayjs(end).endOf("day");
      return scopedSales
        .filter((s) => inRange(dayjs(s.manualDate || s.createdAt), startDate, endDate))
        .reduce((sum, s) => sum + Number(s.total || 0), 0);
    };

    return scopedTeamPlans
      .map((t) => {
        const plan = Number(t.amount || 0);
        const fact = salesTotalByRange(t.startDate, t.deadline);
        const percent = plan > 0 ? Math.round((fact / plan) * 100) : 0;

        const start = t.startDate ? dayjs(t.startDate).startOf("day") : dayjs().startOf("month");
        const end = t.deadline ? dayjs(t.deadline).endOf("day") : dayjs().endOf("month");
        const totalDays = Math.max(1, end.diff(start, "day") + 1);
        const elapsedDays = Math.max(
          1,
          Math.min(totalDays, dayjs().endOf("day").diff(start, "day") + 1),
        );
        const forecast = (fact / elapsedDays) * totalDays;

        return {
          key: t.id,
          id: t.id,
          plan,
          fact,
          percent,
          remaining: Math.max(0, plan - fact),
          forecast,
          reward: Number(t.reward || 0),
          rewardIssued: Boolean((t as BonusTarget & { rewardIssued?: boolean }).rewardIssued),
          startDate: t.startDate,
          deadline: t.deadline,
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [scopedTeamPlans, scopedSales]);

  const summary = useMemo(() => {
    const personalDone = rows.filter((r) => r.periodPercent >= 100).length;
    const personalRisk = rows.filter((r) => r.periodPercent < 60).length;
    const teamDone = teamRows.filter((r) => r.percent >= 100).length;
    const teamRisk = teamRows.filter((r) => r.percent < 60).length;
    return {
      personalTotal: rows.length,
      personalDone,
      personalRisk,
      teamTotal: teamRows.length,
      teamDone,
      teamRisk,
    };
  }, [rows, teamRows]);

  const coachingQueue = useMemo(
    () =>
      rows
        .filter((r) => r.periodPercent < 100)
        .sort((a, b) => a.periodPercent - b.periodPercent)
        .slice(0, 5),
    [rows],
  );

  const runAiAnalysis = async () => {
    const result = await aiAnalyze.mutateAsync({
      domain: "sales",
      locale: "ru",
      metrics: {
        totalPlans: rows.length,
        doneCount: rows.filter((r) => r.periodPercent >= 100).length,
        riskCount: rows.filter((r) => r.periodPercent < 60).length,
        averagePercent:
          rows.length > 0
            ? Math.round(rows.reduce((sum, r) => sum + Number(r.periodPercent || 0), 0) / rows.length)
            : 0,
        teamPlans: teamRows.length,
      },
    });
    setAiReport(result);
    message.success(result.source === "llm" ? "AI анализ (LLM) готов" : "AI анализ готов");
  };

  const handleCreatePlan = async (values: PlanFormValues) => {
    const periodValue = values.period;
    if (!periodValue?.[0] || !periodValue?.[1]) {
      message.warning("Укажите период плана");
      return;
    }

    await createTarget.mutateAsync({
      type: "personal",
      managerId: values.managerId,
      amount: Number(values.amount || 0),
      rewardType: "money",
      reward: Number(values.reward || 0),
      startDate: periodValue[0].startOf("day").toISOString(),
      deadline: periodValue[1].endOf("day").toISOString(),
    });

    message.success("План менеджера добавлен");
    createForm.resetFields();
    createForm.setFieldsValue({
      reward: 0,
      period: [dayjs().startOf("month"), dayjs().endOf("month")],
    });
  };

  const handleCreateTeamPlan = async (values: Omit<PlanFormValues, "managerId">) => {
    const periodValue = values.period;
    if (!periodValue?.[0] || !periodValue?.[1]) {
      message.warning("Укажите период плана команды");
      return;
    }

    await createTarget.mutateAsync({
      type: "global",
      amount: Number(values.amount || 0),
      rewardType: "money",
      reward: Number(values.reward || 0),
      startDate: periodValue[0].startOf("day").toISOString(),
      deadline: periodValue[1].endOf("day").toISOString(),
    });

    message.success("План команды добавлен");
    teamCreateForm.resetFields();
    teamCreateForm.setFieldsValue({
      reward: 0,
      period: [dayjs().startOf("month"), dayjs().endOf("month")],
    });
  };

  const openEdit = (row: {
    id: string;
    periodPlan: number;
    reward: number;
    startDate?: string;
    deadline?: string;
  }) => {
    const plan = scopedPlans.find((t) => t.id === row.id) || null;
    if (!plan) return;

    setEditingPlan(plan);
    editForm.setFieldsValue({
      managerId: String(plan.managerId || ""),
      amount: Number(plan.amount || 0),
      reward: Number(plan.reward || 0),
      period:
        plan.startDate && plan.deadline
          ? [dayjs(plan.startDate), dayjs(plan.deadline)]
          : [dayjs().startOf("month"), dayjs().endOf("month")],
    });
  };

  const handleUpdatePlan = async (values: PlanFormValues) => {
    if (!editingPlan) return;

    const periodValue = values.period;
    if (!periodValue?.[0] || !periodValue?.[1]) {
      message.warning("Укажите период плана");
      return;
    }

    await updateTarget.mutateAsync({
      id: editingPlan.id,
      data: {
        type: "personal",
        managerId: values.managerId,
        amount: Number(values.amount || 0),
        rewardType: "money",
        reward: Number(values.reward || 0),
        startDate: periodValue[0].startOf("day").toISOString(),
        deadline: periodValue[1].endOf("day").toISOString(),
      },
    });

    message.success("План обновлён");
    setEditingPlan(null);
    editForm.resetFields();
  };

  const openEditTeamPlan = (planId: string) => {
    const plan = scopedTeamPlans.find((t) => t.id === planId) || null;
    if (!plan) return;
    setEditingTeamPlan(plan);
    teamEditForm.setFieldsValue({
      amount: Number(plan.amount || 0),
      reward: Number(plan.reward || 0),
      period:
        plan.startDate && plan.deadline
          ? [dayjs(plan.startDate), dayjs(plan.deadline)]
          : [dayjs().startOf("month"), dayjs().endOf("month")],
    });
  };

  const handleUpdateTeamPlan = async (values: Omit<PlanFormValues, "managerId">) => {
    if (!editingTeamPlan) return;
    const periodValue = values.period;
    if (!periodValue?.[0] || !periodValue?.[1]) {
      message.warning("Укажите период плана команды");
      return;
    }

    await updateTarget.mutateAsync({
      id: editingTeamPlan.id,
      data: {
        type: "global",
        amount: Number(values.amount || 0),
        rewardType: "money",
        reward: Number(values.reward || 0),
        startDate: periodValue[0].startOf("day").toISOString(),
        deadline: periodValue[1].endOf("day").toISOString(),
      },
    });
    message.success("План команды обновлён");
    setEditingTeamPlan(null);
    teamEditForm.resetFields();
  };

  return (
    <div className="animate-fade-in space-y-4">
      <Alert
        type="info"
        showIcon
        message="Панель РОП: зелёный — план выполнен, синий — в работе, золотой/красный — зона риска."
        description="Сначала поставьте план на команду и менеджеров, затем контролируйте выполнение по карточкам и таблицам."
      />

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary">Личные планы</Typography.Text>
            <div className="text-2xl font-semibold">{summary.personalTotal}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary">Личные выполнены</Typography.Text>
            <div className="text-2xl font-semibold text-green-600">{summary.personalDone}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary">Командные планы</Typography.Text>
            <div className="text-2xl font-semibold">{summary.teamTotal}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Typography.Text type="secondary">В зоне риска</Typography.Text>
            <div className="text-2xl font-semibold text-red-500">
              {summary.personalRisk + summary.teamRisk}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title="AI-анализ: рост продаж и обучение"
        extra={
          <Space>
            <Button size="small" onClick={() => setShowAlerts((v) => !v)}>
              {showAlerts ? "Скрыть alerts" : "Показать alerts"}
            </Button>
            <Button size="small" onClick={runAiAnalysis} loading={aiAnalyze.isPending}>
              Проверить ИИ
            </Button>
            <Button size="small" onClick={() => setAiReport(null)} disabled={!aiReport}>
              Очистить
            </Button>
          </Space>
        }
      >
        {showAlerts ? (
          <Alert
            type="info"
            showIcon
            className="mb-2"
            message="Как читать блок"
            description="Сначала смотрите менеджеров в зоне риска, затем запускайте ИИ для детального плана действий."
          />
        ) : null}
        {showAlerts && coachingQueue.length === 0 ? (
          <Alert
            type="success"
            showIcon
            message="Отличная динамика: все менеджеры закрывают план."
            description="Рекомендуется закрепить практику: ежедневные мини-разборы и обмен лучшими кейсами в команде."
          />
        ) : showAlerts ? (
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {coachingQueue.map((row) => (
              <Alert
                key={row.id}
                type={row.periodPercent < 60 ? "warning" : "info"}
                showIcon
                message={`${row.managerName}: ${row.periodPercent}% плана`}
                description={row.coachHint.text}
              />
            ))}
          </Space>
        ) : null}
        <Typography.Text type="secondary" className="mt-2 block">
          Рекомендуемый процесс: 1) создайте задачу в блоке «Задачи», 2) назначьте дедлайн обучения, 3) проверьте факт через 3-5 дней.
        </Typography.Text>
        {aiReport ? (
          <Card size="small" className="mt-3" type="inner" title="Отчёт ИИ">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              <Alert type="info" showIcon message={aiReport.summary} />
              {aiReport.risks.map((item, idx) => (
                <Alert key={`risk-${idx}`} type="warning" showIcon message={item} />
              ))}
              {aiReport.opportunities.map((item, idx) => (
                <Alert key={`opp-${idx}`} type="success" showIcon message={item} />
              ))}
              {aiReport.recommendations.map((item, idx) => (
                <Alert key={`rec-${idx}`} type="info" showIcon message={item} />
              ))}
            </Space>
          </Card>
        ) : null}
      </Card>

      <Card size="small" title="План команды (РОП)">
        {hasAdminAccess && (
          <Card size="small" type="inner" title="Постановка плана команды" className="mb-3">
            <Form
              form={teamCreateForm}
              layout="inline"
              onFinish={handleCreateTeamPlan}
              className="flex flex-wrap gap-y-2"
              initialValues={{
                reward: 0,
                period: [dayjs().startOf("month"), dayjs().endOf("month")],
              }}
            >
              <Form.Item
                name="amount"
                rules={[{ required: true, message: "Укажите сумму" }]}
              >
                <InputNumber min={1} placeholder="План команды, сом" style={{ width: 190 }} />
              </Form.Item>
              <Form.Item name="reward">
                <InputNumber min={0} placeholder="Бонус команды, сом" style={{ width: 190 }} />
              </Form.Item>
              <Form.Item
                name="period"
                rules={[{ required: true, message: "Укажите период" }]}
              >
                <RangePicker allowClear={false} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={createTarget.isPending}
                >
                  Поставить план команды
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        <Table
          size="small"
          rowKey="key"
          dataSource={teamRows}
          pagination={{ pageSize: 6 }}
          scroll={{ x: 1100 }}
          rowClassName={(row) =>
            row.percent >= 100 ? "bg-emerald-50 dark:!bg-emerald-900/20" : row.percent < 60 ? "bg-red-50 dark:!bg-red-900/20" : ""
          }
          columns={[
            {
              title: (
                <Space size={4}>
                  План команды
                  <Tooltip title="Целевая выручка отдела за выбранный период">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              ),
              dataIndex: "plan",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Факт",
              dataIndex: "fact",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Выполнение",
              dataIndex: "percent",
              render: (v: number) => (
                <div className="min-w-[120px]">
                  <Progress
                    percent={Math.max(0, Math.min(200, Number(v || 0)))}
                    size="small"
                    status={v >= 100 ? "success" : "active"}
                  />
                </div>
              ),
            },
            {
              title: "Статус",
              dataIndex: "percent",
              render: (v: number) =>
                v >= 100 ? (
                  <Tag color="green">Выполнен</Tag>
                ) : v >= 60 ? (
                  <Tag color="blue">В работе</Tag>
                ) : (
                  <Tag color="red">Риск</Tag>
                ),
            },
            {
              title: "Осталось",
              dataIndex: "remaining",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Прогноз",
              dataIndex: "forecast",
              render: (v: number, row) => (
                <span className={v >= row.plan ? "text-green-600" : "text-orange-600"}>
                  {Math.round(v).toLocaleString()} c
                </span>
              ),
            },
            {
              title: "Бонус",
              dataIndex: "reward",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Период",
              render: (_: unknown, row) =>
                row.deadline
                  ? row.startDate
                    ? `${formatDate(row.startDate)} - ${formatDate(row.deadline)}`
                    : formatDate(row.deadline)
                  : "—",
            },
            {
              title: "Действия",
              width: 160,
              render: (_: unknown, row) => {
                if (!hasAdminAccess) return "—";
                return (
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditTeamPlan(row.id)}
                      disabled={row.rewardIssued}
                    />
                    <Popconfirm
                      title="Удалить план команды?"
                      okText="Да"
                      cancelText="Нет"
                      onConfirm={() => deleteTarget.mutate(row.id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleteTarget.isPending}
                      />
                    </Popconfirm>
                  </Space>
                );
              },
            },
          ]}
          locale={{
            emptyText: (
              <Empty
                description="Планы команды пока не добавлены."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <Card
        size="small"
        title="План продаж отдела"
        extra={
          <Space>
            <Tag color="blue" icon={<TrophyOutlined />}>
              Режим РОП
            </Tag>
          </Space>
        }
      >
        <div className="flex flex-wrap gap-3 items-center mb-3">
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
            <Radio.Button value="week">Неделя</Radio.Button>
            <Radio.Button value="month">Месяц</Radio.Button>
            <Radio.Button value="custom">Custom</Radio.Button>
          </Radio.Group>
          {period !== "custom" && (
            <DatePicker
              value={periodDate}
              onChange={(v) => setPeriodDate(v || dayjs())}
              picker={period}
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

        {hasAdminAccess && (
          <Card
            size="small"
            type="inner"
            title="Постановка плана менеджеру"
            className="mb-3"
          >
            <Form
              form={createForm}
              layout="inline"
              onFinish={handleCreatePlan}
              className="flex flex-wrap gap-y-2"
              initialValues={{
                reward: 0,
                period: [dayjs().startOf("month"), dayjs().endOf("month")],
              }}
            >
              <Form.Item
                name="managerId"
                rules={[{ required: true, message: "Выберите менеджера" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder="Менеджер"
                  style={{ width: 220 }}
                >
                  {scopedManagers.map((m) => (
                    <Option key={m.id} value={m.id}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="amount"
                rules={[{ required: true, message: "Укажите сумму" }]}
              >
                <InputNumber min={1} placeholder="План, сом" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="reward">
                <InputNumber min={0} placeholder="Бонус, сом" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                name="period"
                rules={[{ required: true, message: "Укажите период" }]}
              >
                <RangePicker allowClear={false} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={createTarget.isPending}
                >
                  Поставить план
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}

        <Table
          size="small"
          rowKey="key"
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1450 }}
          rowClassName={(row) =>
            row.periodPercent >= 100 ? "bg-emerald-50 dark:!bg-emerald-900/20" : row.periodPercent < 60 ? "bg-red-50 dark:!bg-red-900/20" : ""
          }
          columns={[
            { title: "Менеджер", dataIndex: "managerName", width: 180 },
            { title: "Филиал", dataIndex: "branchName", width: 140 },
            {
              title: "План неделя",
              dataIndex: "weekPlan",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Факт неделя",
              dataIndex: "weekFact",
              render: (v: number, row) => (
                <span className={v >= row.weekPlan ? "text-green-600" : "text-blue-600"}>
                  {Number(v || 0).toLocaleString()} c
                </span>
              ),
            },
            {
              title: "План периода",
              dataIndex: "periodPlan",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Факт периода",
              dataIndex: "periodFact",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Выполнение",
              dataIndex: "periodPercent",
              render: (v: number) => (
                <div className="min-w-[120px]">
                  <Progress
                    percent={Math.max(0, Math.min(200, Number(v || 0)))}
                    size="small"
                    status={v >= 100 ? "success" : "active"}
                  />
                </div>
              ),
            },
            {
              title: "Статус",
              dataIndex: "periodPercent",
              render: (v: number) =>
                v >= 100 ? (
                  <Tag color="green">Выполнен</Tag>
                ) : v >= 60 ? (
                  <Tag color="blue">В работе</Tag>
                ) : (
                  <Tag color="red">Риск</Tag>
                ),
            },
            {
              title: "Осталось",
              dataIndex: "remaining",
              render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
            },
            {
              title: "Прогноз",
              dataIndex: "forecast",
              render: (v: number, row) => (
                <span className={v >= row.periodPlan ? "text-green-600" : "text-orange-600"}>
                  {Math.round(v).toLocaleString()} c
                </span>
              ),
            },
            {
              title: "Бонус",
              dataIndex: "reward",
              render: (v: number, row) =>
                row.rewardType === "money"
                  ? `${Number(v || 0).toLocaleString()} c`
                  : "Материальный",
            },
            {
              title: "Период",
              render: (_: unknown, row) =>
                row.deadline
                  ? row.startDate
                    ? `${formatDate(row.startDate)} - ${formatDate(row.deadline)}`
                    : formatDate(row.deadline)
                  : "—",
            },
            {
              title: "Рекомендация",
              width: 420,
              render: (_: unknown, row) => {
                const color =
                  row.coachHint.level === "success"
                    ? "green"
                    : row.coachHint.level === "good"
                      ? "blue"
                      : row.coachHint.level === "work"
                        ? "gold"
                        : "red";
                return (
                  <div>
                    <Tag color={color}>Коучинг</Tag>
                    <span>{row.coachHint.text}</span>
                  </div>
                );
              },
            },
            {
              title: "Действия",
              width: 160,
              render: (_: unknown, row) => {
                if (!hasAdminAccess) return "—";
                return (
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(row)}
                      disabled={row.rewardIssued}
                    />
                    <Popconfirm
                      title="Удалить план?"
                      okText="Да"
                      cancelText="Нет"
                      onConfirm={() => deleteTarget.mutate(row.id)}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleteTarget.isPending}
                      />
                    </Popconfirm>
                  </Space>
                );
              },
            },
          ]}
          locale={{
            emptyText: (
              <Empty
                description="Нет планов продаж. Добавьте первый план для менеджера."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />

        <Typography.Text type="secondary" className="mt-2 block">
          РОП: выставляйте план на период по каждому менеджеру, отслеживайте факт, прогноз и отклонение в одном месте.
        </Typography.Text>
        <div className="mt-2">
          <Space wrap size={[8, 8]}>
            <Tag color="green">Выполнен ≥ 100%</Tag>
            <Tag color="blue">В работе 60-99%</Tag>
            <Tag color="red">Риск &lt; 60%</Tag>
          </Space>
        </div>
      </Card>

      <Modal
        title="Редактирование плана"
        open={!!editingPlan}
        onCancel={() => {
          setEditingPlan(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdatePlan}>
          <Form.Item
            name="managerId"
            label="Менеджер"
            rules={[{ required: true, message: "Выберите менеджера" }]}
          >
            <Select showSearch optionFilterProp="children">
              {scopedManagers.map((m) => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="План, сом"
            rules={[{ required: true, message: "Укажите сумму" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reward" label="Бонус, сом">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="period"
            label="Период"
            rules={[{ required: true, message: "Укажите период" }]}
          >
            <RangePicker style={{ width: "100%" }} allowClear={false} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={updateTarget.isPending}
          >
            Сохранить изменения
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Редактирование плана команды"
        open={!!editingTeamPlan}
        onCancel={() => {
          setEditingTeamPlan(null);
          teamEditForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={teamEditForm} layout="vertical" onFinish={handleUpdateTeamPlan}>
          <Form.Item
            name="amount"
            label="План команды, сом"
            rules={[{ required: true, message: "Укажите сумму" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reward" label="Бонус команды, сом">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="period"
            label="Период"
            rules={[{ required: true, message: "Укажите период" }]}
          >
            <RangePicker style={{ width: "100%" }} allowClear={false} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={updateTarget.isPending}
          >
            Сохранить изменения
          </Button>
        </Form>
      </Modal>
    </div>
  );
};
