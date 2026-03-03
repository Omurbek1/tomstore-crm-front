import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  useCreateMarketingKpi,
  useAiAnalyze,
  useAiMarketingPlanDraft,
  useMarketingKpi,
  useMarketingKpiInsights,
  useUpdateMarketingKpi,
  type Manager,
  type MarketingKpi,
} from "../../../hooks/api";

const { RangePicker } = DatePicker;

type Props = {
  managers: Manager[];
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

type KpiFormValues = {
  managerId: string;
  externalManagerName?: string;
  externalManagerRole?: string;
  month: Dayjs;
  planMode: "week" | "month";
  period?: [Dayjs, Dayjs];
  plannedPosts?: number;
  plannedReels?: number;
  publishedPosts?: number;
  publishedReels?: number;
  reach?: number;
  engagements?: number;
  followersGrowth?: number;
  salaryBase?: number;
  note?: string;
  planItems?: Array<{
    id?: string;
    date?: Dayjs;
    type?: "post" | "reels" | "story" | "other";
    title?: string;
    done?: boolean;
  }>;
};

const PLAN_ITEM_TYPES = [
  { label: "Пост", value: "post" },
  { label: "Рилс", value: "reels" },
  { label: "Сторис", value: "story" },
  { label: "Другое", value: "other" },
] as const;

const hasMarketingRole = (manager: Manager) => {
  const textIndex = `${manager.name || ""} ${manager.role || ""}`.toLowerCase();
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
  return (
    tokens.has("smm") ||
    tokens.has("смм") ||
    textIndex.includes("smm") ||
    textIndex.includes("смм")
  );
};

export const MarketingKpiSection = ({ managers, formatDate }: Props) => {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [search, setSearch] = useState("");
  const [performerSource, setPerformerSource] = useState<"all" | "system" | "external">("all");
  const [showKpiGuide, setShowKpiGuide] = useState(false);
  const [showKpiSalaryCard, setShowKpiSalaryCard] = useState(true);
  const [showAiPlanImportCard, setShowAiPlanImportCard] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingKpi | null>(null);
  const [aiPlanText, setAiPlanText] = useState("");
  const [form] = Form.useForm<KpiFormValues>();
  const formValues = Form.useWatch([], form);

  const kpiQuery = useMarketingKpi({ month, q: search, limit: 200, offset: 0 });
  const insightsQuery = useMarketingKpiInsights({ month, q: search });
  const createKpi = useCreateMarketingKpi();
  const updateKpi = useUpdateMarketingKpi();
  const aiAnalyze = useAiAnalyze();
  const aiMarketingPlanDraft = useAiMarketingPlanDraft();
  const [aiReport, setAiReport] = useState<{
    source: "llm";
    summary: string;
    risks: string[];
    opportunities: string[];
    recommendations: string[];
  } | null>(null);
  const marketingManagers = useMemo(() => managers.filter(hasMarketingRole), [managers]);

  const managerOptions = useMemo(
    () =>
      [
        ...marketingManagers.map((m) => ({
          value: m.id,
          label: `${m.name}${m.role ? ` (${m.role})` : ""}`,
        })),
        { value: "__external__", label: "Внешний исполнитель (вручную)" },
      ],
    [marketingManagers],
  );

  const filteredRows = useMemo(() => {
    const rows = kpiQuery.data?.items || [];
    if (performerSource === "all") return rows;
    return rows.filter((r) => {
      const isExternal = String(r.managerId || "").startsWith("external:");
      return performerSource === "external" ? isExternal : !isExternal;
    });
  }, [kpiQuery.data?.items, performerSource]);

  const aiInsights = useMemo(() => {
    const source = filteredRows;
    if (source.length === 0) {
      return {
        avgKpi: 0,
        avgEr: 0,
        low: [] as MarketingKpi[],
        high: [] as MarketingKpi[],
        tips: [] as string[],
      };
    }

    const avgKpi =
      source.reduce((sum, row) => sum + Number(row.kpiScore || 0), 0) / source.length;
    const avgEr =
      source.reduce((sum, row) => sum + Number(row.erPercent || 0), 0) / source.length;
    const low = source
      .filter((row) => Number(row.kpiScore || 0) < 70)
      .sort((a, b) => Number(a.kpiScore || 0) - Number(b.kpiScore || 0))
      .slice(0, 3);
    const high = source
      .filter((row) => Number(row.kpiScore || 0) >= 95)
      .sort((a, b) => Number(b.kpiScore || 0) - Number(a.kpiScore || 0))
      .slice(0, 3);

    const tips: string[] = [];
    if (avgKpi < 80) {
      tips.push(
        "Средний KPI ниже целевого. Запустите недельный спринт: ежедневный контент-план + контроль публикаций по чеклисту.",
      );
    }
    if (avgEr < 3) {
      tips.push(
        "Низкий средний ER. Усильте CTA в постах, добавьте интерактивы (опрос/вопрос) и тест 2-3 форматов Reels.",
      );
    }
    if (low.length > 0) {
      tips.push(
        "Есть сотрудники в риске. Назначьте персональный коучинг: разбор контент-воронки и план исправления на 7 дней.",
      );
    }
    if (high.length > 0) {
      tips.push(
        "Сильные исполнители есть. Масштабируйте лучшие связки контента (тема + формат + время публикации) на команду.",
      );
    }
    return { avgKpi, avgEr, low, high, tips };
  }, [filteredRows]);

  const planAlertState = useMemo(() => {
    if (filteredRows.length === 0) return "empty" as const;
    if (aiInsights.low.length > 0 || aiInsights.avgKpi < 80) return "risk" as const;
    if (aiInsights.high.length > 0 && aiInsights.avgKpi >= 95) return "strong" as const;
    return "normal" as const;
  }, [filteredRows.length, aiInsights.low.length, aiInsights.high.length, aiInsights.avgKpi]);

  const runAiAnalysis = async () => {
    const insights = insightsQuery.data;
    const result = await aiAnalyze.mutateAsync({
      domain: "marketing",
      locale: "ru",
      metrics: {
        avgKpi: Number(aiInsights.avgKpi.toFixed(2)),
        avgEr: Number(aiInsights.avgEr.toFixed(2)),
        lowCount: aiInsights.low.length,
        highCount: aiInsights.high.length,
        total: filteredRows.length,
        healthScore: Number(insights?.healthScore || 0),
        planCompletion: Number(insights?.totals.planCompletion || 0),
        checklistCompletion: Number(insights?.totals.checklistCompletion || 0),
        trendKpiDelta: Number(insights?.trend.kpiDelta || 0),
        trendErDelta: Number(insights?.trend.erDelta || 0),
        trendPlanDelta: Number(insights?.trend.planCompletionDelta || 0),
      },
    });
    setAiReport(result);
  };

  const applyAiDraftToForm = async () => {
    const text = String(aiPlanText || "").trim();
    if (!text) return;
    const result = await aiMarketingPlanDraft.mutateAsync({
      text,
      month,
      locale: "ru",
      assignees: marketingManagers.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
      })),
    });

    const draft = result.draft;
    const isExternal = !draft.managerId;
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      managerId: isExternal ? "__external__" : draft.managerId,
      externalManagerName: isExternal ? draft.managerName : undefined,
      externalManagerRole: isExternal ? draft.managerRole : undefined,
      month: dayjs(`${draft.month}-01`),
      planMode: draft.planMode,
      period:
        draft.planMode === "week" && draft.periodStart && draft.periodEnd
          ? [dayjs(draft.periodStart), dayjs(draft.periodEnd)]
          : undefined,
      plannedPosts: draft.plannedPosts,
      plannedReels: draft.plannedReels,
      publishedPosts: draft.publishedPosts,
      publishedReels: draft.publishedReels,
      reach: draft.reach,
      engagements: draft.engagements,
      followersGrowth: draft.followersGrowth,
      salaryBase: draft.salaryBase,
      note: draft.note,
      planItems: (draft.planItems || []).map((x) => ({
        id: x.id,
        date: dayjs(x.date),
        type: x.type,
        title: x.title,
        done: x.done,
      })),
    });
    setOpen(true);
  };

  const periodReport = useMemo(() => {
    const source = filteredRows;
    const total = source.length;
    const salaryBaseTotal = source.reduce((sum, x) => sum + Number(x.salaryBase || 0), 0);
    const salaryBonusTotal = source.reduce((sum, x) => sum + Number(x.salaryBonus || 0), 0);
    const salaryTotal = source.reduce((sum, x) => sum + Number(x.salaryTotal || 0), 0);
    const avgKpi = total > 0 ? source.reduce((sum, x) => sum + Number(x.kpiScore || 0), 0) / total : 0;
    const avgEr = total > 0 ? source.reduce((sum, x) => sum + Number(x.erPercent || 0), 0) / total : 0;
    const high = source.filter((x) => Number(x.kpiScore || 0) >= 95).length;
    const risk = source.filter((x) => Number(x.kpiScore || 0) < 70).length;
    return { total, salaryBaseTotal, salaryBonusTotal, salaryTotal, avgKpi, avgEr, high, risk };
  }, [filteredRows]);

  const downloadPeriodReport = () => {
    const lines = [
      `Отчет SMM/Маркетинг за ${month}`,
      `Записей: ${periodReport.total}`,
      `Средний KPI: ${periodReport.avgKpi.toFixed(2)}`,
      `Средний ER: ${periodReport.avgEr.toFixed(2)}%`,
      `База ЗП: ${periodReport.salaryBaseTotal.toLocaleString()} c`,
      `Корректировка: ${periodReport.salaryBonusTotal.toLocaleString()} c`,
      `Итог ЗП: ${periodReport.salaryTotal.toLocaleString()} c`,
      `Лидеры (KPI>=95): ${periodReport.high}`,
      `Зона риска (KPI<70): ${periodReport.risk}`,
      "",
      "Детализация:",
      ...filteredRows.map(
        (r) =>
          `${r.managerName}; KPI=${Number(r.kpiScore || 0).toFixed(1)}; ER=${Number(r.erPercent || 0).toFixed(2)}%; ЗП=${Number(r.salaryTotal || 0).toLocaleString()} c`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `marketing-report-${month}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  };

  const kpiPreview = useMemo(() => {
    const v = (formValues || {}) as KpiFormValues;
    const plannedPosts = Number(v.plannedPosts || 0);
    const plannedReels = Number(v.plannedReels || 0);
    const publishedPosts = Number(v.publishedPosts || 0);
    const publishedReels = Number(v.publishedReels || 0);
    const reach = Number(v.reach || 0);
    const engagements = Number(v.engagements || 0);
    const followersGrowth = Number(v.followersGrowth || 0);
    const salaryBase = Number(v.salaryBase || 0);
    const planItems = Array.isArray(v.planItems) ? v.planItems : [];
    const doneItems = planItems.filter((x) => !!x?.done).length;

    const totalPlanned = plannedPosts + plannedReels;
    const totalPublished = publishedPosts + publishedReels;
    const planRateByVolume = totalPlanned > 0 ? totalPublished / totalPlanned : 0;
    const checklistRate = planItems.length > 0 ? doneItems / planItems.length : 0;
    const planRate =
      planItems.length > 0 && totalPlanned > 0
        ? checklistRate * 0.6 + planRateByVolume * 0.4
        : planItems.length > 0
          ? checklistRate
          : planRateByVolume;

    const erPercent = reach > 0 ? (engagements / reach) * 100 : 0;
    const planScore = Math.min(130, planRate * 100);
    const erScore = Math.min(130, (erPercent / 10) * 100);
    const growthScore = Math.min(130, (followersGrowth / 1000) * 100);
    const kpiScore = planScore * 0.5 + erScore * 0.3 + growthScore * 0.2;

    let adjustRate = 0;
    if (kpiScore >= 110) adjustRate = 0.2;
    else if (kpiScore >= 95) adjustRate = 0.1;
    else if (kpiScore >= 80) adjustRate = 0.03;
    else if (kpiScore < 60) adjustRate = -0.2;
    else if (kpiScore < 70) adjustRate = -0.1;
    else if (kpiScore < 80) adjustRate = -0.05;

    const salaryBonus = salaryBase * adjustRate;
    const salaryTotal = salaryBase + salaryBonus;
    const missingBaseData =
      !v.managerId ||
      !v.month ||
      (v.planMode === "week" && (!v.period || !v.period[0] || !v.period[1]));

    return {
      kpiScore: Number(kpiScore.toFixed(2)),
      erPercent: Number(erPercent.toFixed(2)),
      planRate: Number((planRate * 100).toFixed(1)),
      checklistRate: Number((checklistRate * 100).toFixed(1)),
      salaryBonus: Number(salaryBonus.toFixed(2)),
      salaryTotal: Number(salaryTotal.toFixed(2)),
      missingBaseData,
      readyHint: missingBaseData
        ? "Заполните обязательные поля (исполнитель, месяц и период для режима недели)."
        : "Данные готовы к сохранению.",
    };
  }, [formValues]);

  const columns: ColumnsType<MarketingKpi> = [
    { title: "Сотрудник", dataIndex: "managerName", width: 180 },
    {
      title: "Период",
      width: 180,
      render: (_v, r) =>
        r.planMode === "week"
          ? `${formatDate(r.periodStart)} - ${formatDate(r.periodEnd)}`
          : `Месяц: ${r.month}`,
    },
    {
      title: "План",
      width: 220,
      render: (_v, r) => {
        const total = r.planItems?.length || 0;
        const done = (r.planItems || []).filter((x) => x.done).length;
        return (
          <div>
            <div>
              Посты {r.publishedPosts}/{r.plannedPosts} · Рилс {r.publishedReels}/{r.plannedReels}
            </div>
            <Typography.Text type="secondary">
              Чеклист: {done}/{total}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: "ER",
      dataIndex: "erPercent",
      width: 90,
      render: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: "KPI",
      dataIndex: "kpiScore",
      width: 100,
      render: (v: number) => (
        <Tag color={v >= 95 ? "green" : v >= 80 ? "blue" : v >= 70 ? "gold" : "red"}>
          {v.toFixed(1)}
        </Tag>
      ),
    },
    {
      title: "База",
      dataIndex: "salaryBase",
      width: 120,
      render: (v: number) => `${v.toLocaleString()} c`,
    },
    {
      title: "Корректировка",
      dataIndex: "salaryBonus",
      width: 140,
      render: (v: number) => (
        <Tag color={v >= 0 ? "green" : "red"}>{v >= 0 ? "+" : ""}{v.toLocaleString()} c</Tag>
      ),
    },
    {
      title: "Итого ЗП",
      dataIndex: "salaryTotal",
      width: 140,
      render: (v: number) => <b>{v.toLocaleString()} c</b>,
    },
    {
      title: "Обновлено",
      dataIndex: "updatedAt",
      width: 160,
      render: (v: string) => formatDate(v, true),
    },
    {
      title: "Действия",
      width: 100,
      fixed: "right",
      render: (_v, r) => (
        <Button
          size="small"
          onClick={() => {
            setEditing(r);
            const isExternal = String(r.managerId || "").startsWith("external:");
            form.setFieldsValue({
              ...r,
              managerId: isExternal ? "__external__" : r.managerId,
              externalManagerName: isExternal ? r.managerName : undefined,
              externalManagerRole: isExternal ? (r.managerRole || "marketing") : undefined,
              month: dayjs(`${r.month}-01`),
              period:
                r.planMode === "week" && r.periodStart && r.periodEnd
                  ? [dayjs(r.periodStart), dayjs(r.periodEnd)]
                  : undefined,
              planItems: (r.planItems || []).map((x) => ({
                id: x.id,
                date: dayjs(x.date),
                type: x.type,
                title: x.title,
                done: x.done,
              })),
            });
            setOpen(true);
          }}
        >
          Ред.
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Card
        size="small"
        title="SMM / Маркетинг KPI"
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                month: dayjs(`${month}-01`),
                planMode: "month",
                managerId: undefined,
                planItems: [],
              });
              setOpen(true);
            }}
          >
            Добавить KPI
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <DatePicker
            picker="month"
            value={dayjs(`${month}-01`)}
            onChange={(v) => setMonth((v || dayjs()).format("YYYY-MM"))}
            allowClear={false}
          />
          <Input
            placeholder="Поиск по сотруднику/заметке"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          <Select
            value={performerSource}
            onChange={setPerformerSource}
            style={{ width: 240 }}
            options={[
              { value: "all", label: "Все исполнители" },
              { value: "system", label: "Только из системы" },
              { value: "external", label: "Только внешние" },
            ]}
          />
        </div>
        <Space wrap size={16} className="mb-3">
          <div className="flex items-center gap-2">
            <Tooltip title="Блок с формулой KPI и правилами расчета зарплаты/корректировки.">
              <Typography.Text type="secondary">Показывать KPI/зарплата</Typography.Text>
            </Tooltip>
            <Switch size="small" checked={showKpiSalaryCard} onChange={setShowKpiSalaryCard} />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="Блок для разбора текстового контент-плана и автозаполнения формы KPI.">
              <Typography.Text type="secondary">Показывать ИИ-загрузку плана</Typography.Text>
            </Tooltip>
            <Switch size="small" checked={showAiPlanImportCard} onChange={setShowAiPlanImportCard} />
          </div>
        </Space>
        {marketingManagers.length === 0 ? (
          <Alert
            className="mb-3"
            type="warning"
            showIcon
            message="Нет сотрудников с ролью SMM"
            description="Добавьте сотруднику роль/метку SMM (или СММ), чтобы включить автоконтроль."
          />
        ) : null}

        {showKpiSalaryCard ? (
          <Card
            size="small"
            className="mb-3"
            title="Как считается KPI и зарплата (SMM/Marketing)"
            extra={
              <Button type="link" onClick={() => setShowKpiGuide((v) => !v)}>
                {showKpiGuide ? "Скрыть" : "Раскрыть"}
              </Button>
            }
          >
            {showKpiGuide ? (
              <div className="text-sm space-y-2">
                <div>
                  Формула KPI: <b>KPI = План × 50% + ER × 30% + Рост × 20%</b>
                </div>
                <div className="text-slate-500 dark:text-slate-300">
                  План учитывает и факт публикаций, и чеклист по датам. ER = вовлечения / охват × 100.
                </div>
                <div>
                  Корректировка зарплаты:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>{`KPI >= 110: +20%`}</li>
                    <li>{`95..109.99: +10%`}</li>
                    <li>{`80..94.99: +3%`}</li>
                    <li>{`70..79.99: -5%`}</li>
                    <li>{`60..69.99: -10%`}</li>
                    <li>{`< 60: -20%`}</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-2">
                    <b>Пример 1 (хорошо):</b> база 30 000 c, KPI 102 → +10% = +3 000 c, итог 33 000 c.
                  </div>
                  <div className="rounded border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-2">
                    <b>Пример 2 (слабо):</b> база 30 000 c, KPI 65 → -10% = -3 000 c, итог 27 000 c.
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {showAiPlanImportCard ? (
          <Card
            size="small"
            className="mb-3"
            title="ИИ: загрузить контент-план из текста"
            extra={
              <Space>
                <Tooltip title="Из текста создается черновик KPI и контент-план, поля формы заполняются автоматически.">
                  <Button
                    onClick={applyAiDraftToForm}
                    loading={aiMarketingPlanDraft.isPending}
                  >
                    Разобрать и заполнить
                  </Button>
                </Tooltip>
                <Tooltip title="Очищает текст для нового ввода, данные в сохраненных KPI не затрагивает.">
                  <Button
                    onClick={() => setAiPlanText("")}
                    disabled={!aiPlanText}
                  >
                    Очистить
                  </Button>
                </Tooltip>
              </Space>
            }
          >
            <Input.TextArea
              rows={4}
              value={aiPlanText}
              onChange={(e) => setAiPlanText(e.target.value)}
              placeholder="Вставьте план SMM/маркетинга текстом: какие посты/рилс, даты, исполнитель, цель, бюджет..."
            />
            <Typography.Text type="secondary" className="block mt-2">
              ИИ создаст черновик KPI и контент-плана. Вы проверяете и сохраняете в систему.
            </Typography.Text>
          </Card>
        ) : null}

        <Card
          size="small"
          className="mb-3"
          title="AI-анализ SMM/Маркетинг"
          extra={
            <Space>
              <Tooltip title="Показывает или скрывает предупреждения и сигналы по текущему периоду.">
                <Button size="small" onClick={() => setShowAlerts((v) => !v)}>
                  {showAlerts ? "Скрыть alerts" : "Показать alerts"}
                </Button>
              </Tooltip>
              <Tooltip title="Запускает AI-анализ по KPI, ER, трендам и формирует управленческие рекомендации.">
                <Button size="small" onClick={runAiAnalysis} loading={aiAnalyze.isPending}>
                  Проверить ИИ
                </Button>
              </Tooltip>
              <Tooltip title="Очищает только текущий AI-отчет на экране.">
                <Button size="small" onClick={() => setAiReport(null)} disabled={!aiReport}>
                  Очистить
                </Button>
              </Tooltip>
            </Space>
          }
        >
          {showAlerts && planAlertState === "risk" ? (
            <Alert
              className="mb-3"
              type="warning"
              showIcon
              message="Отклонение от плана"
              description="Есть риск невыполнения KPI. Проверьте чеклист публикаций и приоритеты команды."
            />
          ) : null}
          {showAlerts && planAlertState === "strong" ? (
            <Alert
              className="mb-3"
              type="success"
              showIcon
              message="План выполняется стабильно"
              description="Команда держит высокий KPI. Зафиксируйте лучшие практики и масштабируйте их."
            />
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Средний KPI</Typography.Text>
              <div className="text-xl font-semibold">{aiInsights.avgKpi.toFixed(1)}</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Средний ER</Typography.Text>
              <div className="text-xl font-semibold">{aiInsights.avgEr.toFixed(2)}%</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Зона риска</Typography.Text>
              <div className="text-xl font-semibold text-red-500">{aiInsights.low.length}</div>
            </div>
          </div>

          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            {aiInsights.tips.length > 0 ? (
              <Card size="small" type="inner" title="Плановые действия">
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {aiInsights.tips.map((tip, idx) => (
                    <li key={`tip-${idx}`}>{tip}</li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {showAlerts && aiInsights.low.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`Требуют внимания: ${aiInsights.low.map((x) => x.managerName).join(", ")}`}
              />
            )}
            {showAlerts && aiInsights.high.length > 0 && (
              <Alert
                type="success"
                showIcon
                message={`Лидеры месяца: ${aiInsights.high.map((x) => x.managerName).join(", ")}`}
              />
            )}
            {aiReport ? (
              <Card
                size="small"
                type="inner"
                title="Отчёт ИИ"
              >
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  <Alert type="info" showIcon message={aiReport.summary} />
                  {aiReport.risks.map((item, idx) => (
                    <Alert key={`m-risk-${idx}`} type="warning" showIcon message={item} />
                  ))}
                  {aiReport.opportunities.map((item, idx) => (
                    <Alert key={`m-opp-${idx}`} type="success" showIcon message={item} />
                  ))}
                  {aiReport.recommendations.map((item, idx) => (
                    <Alert key={`m-rec-${idx}`} type="info" showIcon message={item} />
                  ))}
                </Space>
              </Card>
            ) : null}
          </Space>
        </Card>

        <Card
          size="small"
          className="mb-3"
          title={`Итог периода: ${month}`}
          extra={
            <Button onClick={downloadPeriodReport}>Скачать отчет</Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Средний KPI</Typography.Text>
              <div className="text-lg font-semibold">{periodReport.avgKpi.toFixed(2)}</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Итог ЗП</Typography.Text>
              <div className="text-lg font-semibold">{periodReport.salaryTotal.toLocaleString()} c</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Лидеры</Typography.Text>
              <div className="text-lg font-semibold text-green-600">{periodReport.high}</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Зона риска</Typography.Text>
              <div className="text-lg font-semibold text-red-500">{periodReport.risk}</div>
            </div>
          </div>
        </Card>

        <Table
          rowKey="id"
          size="small"
          loading={kpiQuery.isLoading}
          dataSource={filteredRows}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        open={open}
        title={editing ? "Редактировать KPI" : "Новый KPI"}
        footer={null}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        width={900}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            planMode: "month",
            planItems: [],
          }}
          onFinish={(v) => {
            const isExternal = v.managerId === "__external__";
            const externalName = String(v.externalManagerName || "").trim();
            const externalRole = String(v.externalManagerRole || "").trim() || "marketing";
            const managerId = isExternal
              ? `external:${externalName.toLowerCase().replace(/\s+/g, "_")}`
              : v.managerId;
            const periodStart =
              v.planMode === "week" && v.period?.[0] ? v.period[0].format("YYYY-MM-DD") : null;
            const periodEnd =
              v.planMode === "week" && v.period?.[1] ? v.period[1].format("YYYY-MM-DD") : null;
            const payload: Partial<MarketingKpi> = {
              managerId,
              managerName: isExternal ? externalName : undefined,
              managerRole: isExternal ? externalRole : undefined,
              month: dayjs(v.month).format("YYYY-MM"),
              planMode: v.planMode,
              periodStart,
              periodEnd,
              plannedPosts: Number(v.plannedPosts || 0),
              plannedReels: Number(v.plannedReels || 0),
              publishedPosts: Number(v.publishedPosts || 0),
              publishedReels: Number(v.publishedReels || 0),
              reach: Number(v.reach || 0),
              engagements: Number(v.engagements || 0),
              followersGrowth: Number(v.followersGrowth || 0),
              salaryBase: Number(v.salaryBase || 0),
              note: String(v.note || "").trim() || undefined,
              planItems: (v.planItems || [])
                .filter((x) => x.date)
                .map((x, idx) => ({
                  id: String(x.id || `item-${idx + 1}`),
                  date: (x.date as Dayjs).format("YYYY-MM-DD"),
                  type: x.type || "other",
                  title: String(x.title || "").trim() || undefined,
                  done: Boolean(x.done),
                })),
            };
            const onSuccess = () => {
              setOpen(false);
              setEditing(null);
              form.resetFields();
            };
            if (editing) {
              updateKpi.mutate({ id: editing.id, data: payload }, { onSuccess });
            } else {
              createKpi.mutate(payload, { onSuccess });
            }
          }}
        >
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message="Как заполнить KPI быстро и понятно"
            description="1) Выберите исполнителя и период. 2) Заполните план/факт и метрики охвата. 3) Проверьте блок «Предпросмотр результата» и только потом сохраните."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Form.Item
              name="managerId"
              label="Исполнитель (SMM/Маркетинг)"
              rules={[{ required: true, message: "Выберите сотрудника" }]}
              extra="Кто отвечает за результат за выбранный период."
            >
              <Select showSearch optionFilterProp="label" options={managerOptions} />
            </Form.Item>
            <Form.Item
              name="month"
              label="Месяц"
              rules={[{ required: true, message: "Укажите месяц" }]}
              extra="Период отчета KPI."
            >
              <DatePicker picker="month" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Form.Item noStyle dependencies={["managerId"]}>
            {({ getFieldValue }) =>
              getFieldValue("managerId") === "__external__" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Form.Item
                    name="externalManagerName"
                    label="Имя внешнего исполнителя"
                    rules={[{ required: true, message: "Введите имя исполнителя" }]}
                  >
                    <Input placeholder="Например: Алина SMM" />
                  </Form.Item>
                  <Form.Item name="externalManagerRole" label="Роль">
                    <Input placeholder="Маркетолог / SMM / Таргетолог" />
                  </Form.Item>
                </div>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="planMode"
            label={
              <Space size={6}>
                <span>Режим контент-плана</span>
                <Tooltip title="Месяц - общий план за месяц. Неделя - детальный контроль внутри выбранного диапазона.">
                  <Typography.Text type="secondary">?</Typography.Text>
                </Tooltip>
              </Space>
            }
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="month">Месяц</Radio.Button>
              <Radio.Button value="week">Неделя</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle dependencies={["planMode"]}>
            {({ getFieldValue }) =>
              getFieldValue("planMode") === "week" ? (
                <Form.Item
                  name="period"
                  label="Период недели"
                  rules={[{ required: true, message: "Укажите диапазон недели" }]}
                >
                  <RangePicker style={{ width: "100%" }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Card
            size="small"
            title={
              <Space size={6}>
                <span>Контент-план по датам (чеклист)</span>
                <Tooltip title="Здесь фиксируется план публикаций по датам. Отметка done влияет на выполнение плана и KPI.">
                  <Typography.Text type="secondary">?</Typography.Text>
                </Tooltip>
              </Space>
            }
          >
            <Form.List name="planItems">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  <Alert
                    type="info"
                    showIcon
                    message="Как заполнить чеклист"
                    description="Добавьте плановые публикации по датам. Когда публикация выполнена, поставьте галочку в колонке «Готово»."
                  />
                  <Space wrap>
                    <Tooltip title="Добавить в план пост на текущую дату.">
                      <Button
                        size="small"
                        type="dashed"
                        onClick={() => add({ type: "post", done: false, date: dayjs() })}
                      >
                        + Пост
                      </Button>
                    </Tooltip>
                    <Tooltip title="Добавить в план reels на текущую дату.">
                      <Button
                        size="small"
                        type="dashed"
                        onClick={() => add({ type: "reels", done: false, date: dayjs() })}
                      >
                        + Reels
                      </Button>
                    </Tooltip>
                    <Tooltip title="Добавить в план story на текущую дату.">
                      <Button
                        size="small"
                        type="dashed"
                        onClick={() => add({ type: "story", done: false, date: dayjs() })}
                      >
                        + Story
                      </Button>
                    </Tooltip>
                  </Space>
                  {fields.map((field) => (
                    <div key={field.key} className="grid grid-cols-12 gap-2 items-center">
                      <Form.Item
                        className="col-span-3 mb-0"
                        {...field}
                        name={[field.name, "date"]}
                        rules={[{ required: true, message: "Дата" }]}
                      >
                        <DatePicker style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        className="col-span-3 mb-0"
                        {...field}
                        name={[field.name, "type"]}
                        initialValue="other"
                      >
                        <Select options={PLAN_ITEM_TYPES as unknown as { label: string; value: string }[]} />
                      </Form.Item>
                      <Form.Item className="col-span-4 mb-0" {...field} name={[field.name, "title"]}>
                        <Input placeholder="Описание (опц.)" />
                      </Form.Item>
                      <Form.Item
                        className="col-span-1 mb-0 text-center"
                        {...field}
                        name={[field.name, "done"]}
                        valuePropName="checked"
                      >
                        <Checkbox />
                      </Form.Item>
                      <Button
                        className="col-span-1"
                        danger
                        onClick={() => remove(field.name)}
                      >
                        Удалить
                      </Button>
                    </div>
                  ))}
                  <Tooltip title="Добавить произвольный пункт контент-плана.">
                    <Button type="dashed" onClick={() => add({ type: "other", done: false })}>
                    + Добавить пункт
                    </Button>
                  </Tooltip>
                </Space>
              )}
            </Form.List>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <Form.Item
              name="plannedPosts"
              label={
                <Space size={6}>
                  <span>План постов</span>
                  <Tooltip title="Сколько постов запланировано на период.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="plannedReels"
              label={
                <Space size={6}>
                  <span>План рилс</span>
                  <Tooltip title="Сколько reels запланировано на период.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="publishedPosts"
              label={
                <Space size={6}>
                  <span>Факт постов</span>
                  <Tooltip title="Сколько постов реально вышло.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="publishedReels"
              label={
                <Space size={6}>
                  <span>Факт рилс</span>
                  <Tooltip title="Сколько reels реально вышло.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="reach"
              label={
                <Space size={6}>
                  <span>Охват</span>
                  <Tooltip title="Общее число охваченных пользователей за период.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="engagements"
              label={
                <Space size={6}>
                  <span>Вовлечения</span>
                  <Tooltip title="Лайки, комментарии, сохранения, клики и другие взаимодействия.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="followersGrowth"
              label={
                <Space size={6}>
                  <span>Рост подписчиков</span>
                  <Tooltip title="Сколько новых подписчиков добавилось за период.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="salaryBase"
              label={
                <Space size={6}>
                  <span>Базовая ЗП</span>
                  <Tooltip title="Базовая сумма до KPI-корректировки. Итог и корректировка видны в предпросмотре ниже.">
                    <Typography.Text type="secondary">?</Typography.Text>
                  </Tooltip>
                </Space>
              }
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Card size="small" className="mb-3" title="Предпросмотр результата">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">KPI (прогноз)</Typography.Text>
                <div className="text-lg font-semibold">{kpiPreview.kpiScore.toFixed(2)}</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">ER (прогноз)</Typography.Text>
                <div className="text-lg font-semibold">{kpiPreview.erPercent.toFixed(2)}%</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">План / чеклист</Typography.Text>
                <div className="text-sm font-medium">
                  {kpiPreview.planRate.toFixed(1)}% / {kpiPreview.checklistRate.toFixed(1)}%
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Итог ЗП (прогноз)</Typography.Text>
                <div className="text-lg font-semibold">
                  {kpiPreview.salaryTotal.toLocaleString()} c
                </div>
                <div
                  className={`text-xs ${
                    kpiPreview.salaryBonus >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  Корректировка {kpiPreview.salaryBonus >= 0 ? "+" : ""}
                  {kpiPreview.salaryBonus.toLocaleString()} c
                </div>
              </div>
            </div>
            <Alert
              className="mt-2"
              type={kpiPreview.missingBaseData ? "warning" : "success"}
              showIcon
              message={kpiPreview.readyHint}
            />
          </Card>

          <Form.Item name="note" label="Примечание">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Typography.Text type="secondary">
            KPI автоматически корректирует зарплату: при низком KPI уменьшает, при высоком увеличивает.
          </Typography.Text>

          <Button
            type="primary"
            htmlType="submit"
            loading={createKpi.isPending || updateKpi.isPending}
            disabled={kpiPreview.missingBaseData}
            block
            className="mt-3"
          >
            Сохранить
          </Button>
        </Form>
      </Modal>
    </div>
  );
};
