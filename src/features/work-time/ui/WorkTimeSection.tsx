import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  useCreateWorkTimeEntry,
  useDeleteWorkTimeEntry,
  useRunWorkTimeAutomation,
  useTasks,
  useUpdateManager,
  useUpdateWorkTimeEntry,
  useWorkTimeAutomationStatus,
  useWorkTimeEntries,
  useWorkTimeSummary,
  type Manager,
  type WorkTimeEntry,
} from "../../../hooks/api";

type Props = {
  managers: Manager[];
  formatDate: (value?: string | null, withTime?: boolean) => string;
  onOpenTasks?: () => void;
};

type WorkTimeFormValues = {
  managerId: string;
  workDate: Dayjs;
  startTime?: Dayjs;
  endTime?: Dayjs;
  breakMinutes?: number;
  plannedHours?: number;
  workedHours?: number;
  note?: string;
};

type EmployeeSettingsValues = {
  salaryType?: "commission" | "fixed";
  fixedMonthlySalary?: number;
  workDayHoursDefault?: number;
  workBreakMinutesDefault?: number;
  workStartTimeDefault?: Dayjs;
  lateGraceMinutesDefault?: number;
  workWeekModeDefault?: "5/2" | "6/1";
};

type SettingsPreset = {
  key: string;
  label: string;
  workStartTimeDefault: string;
  workDayHoursDefault: number;
  workBreakMinutesDefault: number;
  lateGraceMinutesDefault: number;
};

const hasEmployeeRole = (manager?: Manager | null) => {
  if (!manager || manager.deleted) return false;
  return true;
};

const toIsoFromDateAndTime = (date?: Dayjs, time?: Dayjs) => {
  if (!date || !time) return undefined;
  return date
    .hour(time.hour())
    .minute(time.minute())
    .second(0)
    .millisecond(0)
    .toISOString();
};

const getStatusMeta = (entry: WorkTimeEntry) => {
  if (entry.overtimeHours > 0.01) return { color: "green", label: "Переработка" };
  if (entry.undertimeHours > 0.01) return { color: "red", label: "Недоработка" };
  return { color: "blue", label: "Норма" };
};

export const WorkTimeSection = ({ managers, formatDate, onOpenTasks }: Props) => {
  const settingsPresets: SettingsPreset[] = [
    {
      key: "standard",
      label: "Стандарт 8ч",
      workStartTimeDefault: "09:00",
      workDayHoursDefault: 8,
      workBreakMinutesDefault: 60,
      lateGraceMinutesDefault: 10,
    },
    {
      key: "early",
      label: "Ранняя 9ч",
      workStartTimeDefault: "08:00",
      workDayHoursDefault: 9,
      workBreakMinutesDefault: 60,
      lateGraceMinutesDefault: 10,
    },
    {
      key: "long",
      label: "Длинная 10ч",
      workStartTimeDefault: "10:00",
      workDayHoursDefault: 10,
      workBreakMinutesDefault: 60,
      lateGraceMinutesDefault: 15,
    },
  ];
  const [filterRange, setFilterRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkTimeEntry | null>(null);
  const [form] = Form.useForm<WorkTimeFormValues>();
  const [editForm] = Form.useForm<WorkTimeFormValues>();
  const [settingsForm] = Form.useForm<EmployeeSettingsValues>();
  const watchedSalaryType = Form.useWatch("salaryType", settingsForm);
  const watchedSalaryFixed = Form.useWatch("fixedMonthlySalary", settingsForm);
  const watchedStartTime = Form.useWatch("workStartTimeDefault", settingsForm);
  const watchedWorkDayHours = Form.useWatch("workDayHoursDefault", settingsForm);
  const watchedBreakMinutes = Form.useWatch("workBreakMinutesDefault", settingsForm);
  const watchedLateGraceMinutes = Form.useWatch("lateGraceMinutesDefault", settingsForm);
  const watchedWorkWeekMode = Form.useWatch("workWeekModeDefault", settingsForm);

  const updateManager = useUpdateManager();

  const employees = useMemo(
    () => [...managers.filter(hasEmployeeRole)].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [managers],
  );

  const activeManagerId =
    selectedManagerId && employees.some((x) => x.id === selectedManagerId)
      ? selectedManagerId
      : employees[0]?.id || "";

  const selectedManager = useMemo(
    () => employees.find((x) => x.id === activeManagerId) || null,
    [employees, activeManagerId],
  );

  const fillSettingsFormFromManager = useCallback(
    (manager: Manager) => {
      settingsForm.setFieldsValue({
        salaryType: (manager.salaryType || "commission") as "commission" | "fixed",
        fixedMonthlySalary: Number(manager.fixedMonthlySalary ?? 0),
        workDayHoursDefault: Number(manager.workDayHoursDefault ?? 8),
        workBreakMinutesDefault: Number(manager.workBreakMinutesDefault ?? 60),
        workStartTimeDefault: dayjs(`2000-01-01T${String(manager.workStartTimeDefault || "09:00")}:00`),
        lateGraceMinutesDefault: Number(manager.lateGraceMinutesDefault ?? 10),
        workWeekModeDefault: (manager.workWeekModeDefault || "5/2") as "5/2" | "6/1",
      });
    },
    [settingsForm],
  );

  useEffect(() => {
    if (!selectedManager) return;
    fillSettingsFormFromManager(selectedManager);
  }, [fillSettingsFormFromManager, selectedManager]);

  const startDate = filterRange[0]?.format("YYYY-MM-DD");
  const endDate = filterRange[1]?.format("YYYY-MM-DD");

  const entriesQuery = useWorkTimeEntries({
    startDate,
    endDate,
    managerId: activeManagerId || undefined,
    limit: 500,
    offset: 0,
  });
  const summaryQuery = useWorkTimeSummary({
    startDate,
    endDate,
    managerId: activeManagerId || undefined,
  });
  const summaryAllQuery = useWorkTimeSummary({
    startDate,
    endDate,
  });
  const automationStatusQuery = useWorkTimeAutomationStatus();
  const automationTasksQuery = useTasks({
    createdById: "system-automation",
    limit: 5,
    offset: 0,
  });
  const runAutomation = useRunWorkTimeAutomation();

  const createEntry = useCreateWorkTimeEntry();
  const updateEntry = useUpdateWorkTimeEntry();
  const deleteEntry = useDeleteWorkTimeEntry();

  const entries = entriesQuery.data?.items || [];
  const summary = summaryQuery.data;
  const summaryAll = summaryAllQuery.data;
  const automationStatus = automationStatusQuery.data;

  const managerStatsById = useMemo(() => {
    const map = new Map<
      string,
      {
        workedHours: number;
        overtimeHours: number;
        undertimeHours: number;
        lateMinutes: number;
        earlyLeaveMinutes: number;
      }
    >();
    (summaryAll?.byManager || []).forEach((x) => {
      map.set(x.managerId, {
        workedHours: Number(x.workedHours || 0),
        overtimeHours: Number(x.overtimeHours || 0),
        undertimeHours: Number(x.undertimeHours || 0),
        lateMinutes: Number(x.lateMinutes || 0),
        earlyLeaveMinutes: Number(x.earlyLeaveMinutes || 0),
      });
    });
    return map;
  }, [summaryAll?.byManager]);

  const selectedSummaryManager = summary?.byManager?.[0];
  const salaryPlan = Number(summary?.totals.salaryPlannedByHours || 0);
  const salaryOvertime = Number(summary?.totals.overtimePay || 0);
  const salaryDeduction = Number(summary?.totals.undertimeDeduction || 0);
  const salaryFinal = salaryPlan + salaryOvertime - salaryDeduction;
  const filteredEmployees = useMemo(() => {
    const q = String(employeeSearch || "").trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((m) => {
      const index = `${m.name || ""} ${m.role || ""} ${m.branchName || ""}`.toLowerCase();
      return index.includes(q);
    });
  }, [employees, employeeSearch]);

  const columns: ColumnsType<WorkTimeEntry> = [
    {
      title: "Дата",
      dataIndex: "workDate",
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: "Время",
      width: 200,
      render: (_v, row) =>
        row.startedAt && row.endedAt
          ? `${dayjs(row.startedAt).format("HH:mm")} - ${dayjs(row.endedAt).format("HH:mm")}`
          : "Вручную",
    },
    {
      title: "План смены",
      width: 200,
      render: (_v, row) =>
        row.plannedStartAt && row.plannedEndAt
          ? `${dayjs(row.plannedStartAt).format("HH:mm")} - ${dayjs(row.plannedEndAt).format("HH:mm")}`
          : "—",
    },
    {
      title: "План / Факт",
      width: 140,
      render: (_v, row) => `${row.plannedHours.toFixed(2)} / ${row.workedHours.toFixed(2)} ч`,
    },
    {
      title: "Начисление",
      width: 140,
      render: (_v, row) => {
        if (!selectedSummaryManager || selectedSummaryManager.salaryType !== "fixed") return "—";
        const accrued = Number(row.workedHours || 0) * Number(selectedSummaryManager.hourlyRate || 0);
        return <b>{Math.round(accrued).toLocaleString()} c</b>;
      },
    },
    {
      title: "Переработка",
      dataIndex: "overtimeHours",
      width: 120,
      render: (v: number) => <span className="text-green-600">{v.toFixed(2)} ч</span>,
    },
    {
      title: "Недоработка",
      dataIndex: "undertimeHours",
      width: 120,
      render: (v: number) => <span className="text-red-500">{v.toFixed(2)} ч</span>,
    },
    {
      title: "Опоздание",
      dataIndex: "lateMinutes",
      width: 110,
      render: (v: number) => <span className="text-orange-500">{Math.round(Number(v || 0))} мин</span>,
    },
    {
      title: "Ранний уход",
      dataIndex: "earlyLeaveMinutes",
      width: 120,
      render: (v: number) => <span className="text-orange-500">{Math.round(Number(v || 0))} мин</span>,
    },
    {
      title: "Статус",
      width: 130,
      render: (_v, row) => {
        const meta = getStatusMeta(row);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: (v?: string) => v || "—",
    },
    {
      title: "Действия",
      width: 120,
      render: (_v, row) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingEntry(row);
              editForm.setFieldsValue({
                managerId: row.managerId,
                workDate: dayjs(row.workDate),
                startTime: row.startedAt ? dayjs(row.startedAt) : undefined,
                endTime: row.endedAt ? dayjs(row.endedAt) : undefined,
                breakMinutes: Number(row.breakMinutes || 0),
                plannedHours: Number(row.plannedHours || 8),
                workedHours: Number(row.workedHours || 0),
                note: row.note || undefined,
              });
            }}
          />
          <Popconfirm
            title="Удалить запись?"
            okText="Да"
            cancelText="Нет"
            onConfirm={() => deleteEntry.mutate(row.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteEntry.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const submitCreate = async (values: WorkTimeFormValues) => {
    await createEntry.mutateAsync({
      managerId: values.managerId,
      workDate: values.workDate.format("YYYY-MM-DD"),
      startedAt: toIsoFromDateAndTime(values.workDate, values.startTime),
      endedAt: toIsoFromDateAndTime(values.workDate, values.endTime),
      breakMinutes: Number(values.breakMinutes || 0),
      plannedHours: Number(values.plannedHours || 8),
      workedHours: Number(values.workedHours || 0),
      note: values.note,
    });
    setCreateOpen(false);
    form.resetFields();
  };

  const submitEdit = async (values: WorkTimeFormValues) => {
    if (!editingEntry) return;
    await updateEntry.mutateAsync({
      id: editingEntry.id,
      data: {
        managerId: values.managerId,
        workDate: values.workDate.format("YYYY-MM-DD"),
        startedAt: toIsoFromDateAndTime(values.workDate, values.startTime),
        endedAt: toIsoFromDateAndTime(values.workDate, values.endTime),
        breakMinutes: Number(values.breakMinutes || 0),
        plannedHours: Number(values.plannedHours || 8),
        workedHours: Number(values.workedHours || 0),
        note: values.note,
      },
    });
    setEditingEntry(null);
    editForm.resetFields();
  };

  const saveEmployeeSettings = async (values: EmployeeSettingsValues) => {
    if (!selectedManager) return;
    await updateManager.mutateAsync({
      id: selectedManager.id,
      data: {
        salaryType: values.salaryType || "commission",
        fixedMonthlySalary: Number(values.fixedMonthlySalary || 0),
        workDayHoursDefault: Number(values.workDayHoursDefault || 8),
        workBreakMinutesDefault: Number(values.workBreakMinutesDefault || 60),
        workStartTimeDefault: values.workStartTimeDefault
          ? values.workStartTimeDefault.format("HH:mm")
          : "09:00",
        lateGraceMinutesDefault: Number(values.lateGraceMinutesDefault || 10),
        workWeekModeDefault: values.workWeekModeDefault || "5/2",
      },
    });
    message.success("Норма сотрудника сохранена");
    setSettingsOpen(false);
  };

  const applySettingsPreset = (preset: SettingsPreset) => {
    settingsForm.setFieldsValue({
      workStartTimeDefault: dayjs(`2000-01-01T${preset.workStartTimeDefault}:00`),
      workDayHoursDefault: preset.workDayHoursDefault,
      workBreakMinutesDefault: preset.workBreakMinutesDefault,
      lateGraceMinutesDefault: preset.lateGraceMinutesDefault,
    });
  };

  const resetSettingsToCurrent = () => {
    if (!selectedManager) return;
    fillSettingsFormFromManager(selectedManager);
    message.info("Поля возвращены к текущим настройкам сотрудника");
  };

  const autofillSmartSettings = () => {
    const isFixed = watchedSalaryType === "fixed";
    settingsForm.setFieldsValue({
      salaryType: watchedSalaryType || "commission",
      fixedMonthlySalary: isFixed ? Number(watchedSalaryFixed || 45000) : Number(watchedSalaryFixed || 0),
      workStartTimeDefault: watchedStartTime || dayjs("2000-01-01T09:00:00"),
      workDayHoursDefault: Number(watchedWorkDayHours || 8),
      workBreakMinutesDefault: Number(watchedBreakMinutes || 60),
      lateGraceMinutesDefault: Number(watchedLateGraceMinutes || 10),
      workWeekModeDefault: watchedWorkWeekMode || "5/2",
    });
    message.success("Поля заполнены рекомендуемыми значениями");
  };

  const settingsWarnings = useMemo(() => {
    const warnings: string[] = [];
    const workDayHours = Number(watchedWorkDayHours || 0);
    const breakMinutes = Number(watchedBreakMinutes || 0);
    const graceMinutes = Number(watchedLateGraceMinutes || 0);
    if (workDayHours > 12) warnings.push("Норма больше 12 часов в день. Проверьте, это может быть ошибкой.");
    if (breakMinutes > 180) warnings.push("Перерыв больше 180 минут. Обычно это слишком много.");
    if (graceMinutes > 30) warnings.push("Допуск опоздания больше 30 минут. Дисциплина будет слабой.");
    return warnings;
  }, [watchedBreakMinutes, watchedLateGraceMinutes, watchedWorkDayHours]);
  const settingsInsights = useMemo(() => {
    const salaryType = watchedSalaryType || "commission";
    const workDayHours = Number(watchedWorkDayHours || 0);
    const fixedSalary = Number(watchedSalaryFixed || 0);
    const weekMode = watchedWorkWeekMode || "5/2";
    const monthWorkDays = weekMode === "6/1" ? 26 : 22;
    const monthHours = Math.max(workDayHours * monthWorkDays, 1);
    const hourlyRate = salaryType === "fixed" ? fixedSalary / monthHours : 0;
    const tips: string[] = [];
    if (salaryType === "commission") {
      tips.push("Режим комиссии: начисление зависит от продаж, фиксированный оклад не обязателен.");
    } else {
      tips.push(
        `Режим фиксированной зарплаты: примерная ставка в час ${Math.round(hourlyRate).toLocaleString()} c.`,
      );
    }
    if (workDayHours && workDayHours < 6) {
      tips.push("Норма меньше 6 часов. Проверьте, это может быть неполный рабочий день.");
    }
    return {
      monthWorkDays,
      monthHours,
      hourlyRate,
      tips,
      weekMode,
    };
  }, [watchedSalaryFixed, watchedSalaryType, watchedWorkDayHours, watchedWorkWeekMode]);

  const handleSalaryTypeChange = (value: "commission" | "fixed") => {
    settingsForm.setFieldValue("salaryType", value);
    if (value === "fixed" && Number(watchedSalaryFixed || 0) <= 0) {
      settingsForm.setFieldValue("fixedMonthlySalary", 45000);
      message.info("Для фиксированной зарплаты подставлен базовый оклад 45 000 c");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Alert
        type="info"
        showIcon
        message="Персональный табель сотрудника"
        description="Сценарий: 1) выберите сотрудника, 2) настройте его норму, 3) ведите табель только этого сотрудника."
      />

      <Card
        size="small"
        title="1. Выберите сотрудника"
        extra={
          <DatePicker.RangePicker
            value={filterRange}
            onChange={(v) => {
              if (v?.[0] && v?.[1]) setFilterRange([v[0], v[1]]);
            }}
            allowClear={false}
          />
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <Input
            placeholder="Поиск сотрудника: имя, роль, филиал"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            allowClear
          />
          <Table
            size="small"
            rowKey="id"
            dataSource={filteredEmployees}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 900 }}
            columns={[
              {
                title: "Сотрудник",
                width: 240,
                render: (_v, row: Manager) => (
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">
                      {row.role || "Сотрудник"} · {row.branchName || "Без филиала"}
                    </div>
                  </div>
                ),
              },
              {
                title: "Факт/переработка/недоработка",
                width: 280,
                render: (_v, row: Manager) => {
                  const stats = managerStatsById.get(row.id) || {
                    workedHours: 0,
                    overtimeHours: 0,
                    undertimeHours: 0,
                    lateMinutes: 0,
                    earlyLeaveMinutes: 0,
                  };
                  return (
                    <span className="text-xs">
                      {stats.workedHours.toFixed(2)} ч / {stats.overtimeHours.toFixed(2)} ч / {stats.undertimeHours.toFixed(2)} ч
                    </span>
                  );
                },
              },
              {
                title: "Опоздания / ранний уход",
                width: 220,
                render: (_v, row: Manager) => {
                  const stats = managerStatsById.get(row.id) || {
                    workedHours: 0,
                    overtimeHours: 0,
                    undertimeHours: 0,
                    lateMinutes: 0,
                    earlyLeaveMinutes: 0,
                  };
                  return (
                    <span className="text-xs">
                      {Math.round(stats.lateMinutes)} мин / {Math.round(stats.earlyLeaveMinutes)} мин
                    </span>
                  );
                },
              },
              {
                title: "Действие",
                width: 140,
                render: (_v, row: Manager) => (
                  <Button
                    type={activeManagerId === row.id ? "primary" : "default"}
                    size="small"
                    onClick={() => setSelectedManagerId(row.id)}
                  >
                    {activeManagerId === row.id ? "Выбран" : "Открыть табель"}
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      {selectedManager ? (
        <Card
          size="small"
          title={`2. Настройка нормы: ${selectedManager.name}`}
          extra={
            <Space>
              <Tooltip title="Эти значения подставляются автоматически при добавлении записи в табель выбранного сотрудника.">
                <InfoCircleOutlined />
              </Tooltip>
              <Button type="primary" onClick={() => setSettingsOpen(true)}>
                Настроить
              </Button>
            </Space>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Тип зарплаты</Typography.Text>
              <div className="font-semibold">{selectedManager.salaryType === "fixed" ? "Фиксированная" : "Комиссия"}</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Оклад</Typography.Text>
              <div className="font-semibold">{Math.round(Number(selectedManager.fixedMonthlySalary || 0)).toLocaleString()} c</div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">График</Typography.Text>
              <div className="font-semibold">
                {String(selectedManager.workWeekModeDefault || "5/2")} · {String(selectedManager.workStartTimeDefault || "09:00")} · {Number(selectedManager.workDayHoursDefault || 8).toFixed(1)} ч
              </div>
            </div>
            <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
              <Typography.Text type="secondary">Дисциплина</Typography.Text>
              <div className="font-semibold">
                Допуск {Math.round(Number(selectedManager.lateGraceMinutesDefault || 10))} мин · Перерыв {Math.round(Number(selectedManager.workBreakMinutesDefault || 60))} мин
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card
        size="small"
        title="Автоконтроль системы"
        extra={
          <Space>
            <Tooltip title="Открывает раздел с полным списком задач, включая автозадачи системы.">
              <Button onClick={onOpenTasks}>Открыть задачи</Button>
            </Tooltip>
            <Tooltip title="Ручной запуск автоконтроля: проверка дисциплины и KPI с созданием задач и отчета.">
              <Button
                type="primary"
                loading={runAutomation.isPending}
                onClick={() => runAutomation.mutate({ force: true })}
              >
                Запустить сейчас
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">
          <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
            <Tooltip title="Время, когда система запускает автоконтроль каждый день.">
              <Typography.Text type="secondary">Расписание</Typography.Text>
            </Tooltip>
            <div className="font-semibold">
              {automationStatus?.schedule?.runAt || "09:00"} · {automationStatus?.schedule?.timezone || "Asia/Bishkek"}
            </div>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
            <Tooltip title="Дата последнего успешного запуска автоконтроля.">
              <Typography.Text type="secondary">Последний запуск</Typography.Text>
            </Tooltip>
            <div className="font-semibold">{automationStatus?.lastRunDate || "еще не запускалось"}</div>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
            <Tooltip title="Сколько новых задач система создала на последнем запуске по дисциплине и KPI-рискам.">
              <Typography.Text type="secondary">Создано задач (последний запуск)</Typography.Text>
            </Tooltip>
            <div className="font-semibold">
              {Number(automationStatus?.lastResult?.createdLateTasks || 0) + Number(automationStatus?.lastResult?.createdKpiTasks || 0)}
            </div>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
            <Tooltip title="Текущее состояние процесса автоконтроля.">
              <Typography.Text type="secondary">Статус</Typography.Text>
            </Tooltip>
            <div className="font-semibold">
              {automationStatus?.inProgress ? "Выполняется" : "Готово"}
            </div>
          </div>
        </div>
        <Alert
          className="mt-3"
          type="info"
          showIcon
          message="Что делает автоконтроль"
          description="Автоматически проверяет дисциплину, KPI-риски, создает задачи по рискам и формирует ежедневный отчет руководителю."
        />

        <Typography.Text type="secondary" className="block mt-3 mb-2">
          Последние автозадачи
        </Typography.Text>
        <Table
          size="small"
          rowKey="id"
          loading={automationTasksQuery.isLoading}
          dataSource={automationTasksQuery.data?.items || []}
          pagination={false}
          scroll={{ x: 700 }}
          columns={[
            {
              title: <Tooltip title="Название автоматически созданной задачи."><span>Задача</span></Tooltip>,
              dataIndex: "title",
              render: (v: string) => <span className="font-medium">{v}</span>,
            },
            {
              title: <Tooltip title="Кому назначена автозадача."><span>Исполнитель</span></Tooltip>,
              dataIndex: "assigneeName",
              width: 180,
              render: (v?: string) => v || "—",
            },
            {
              title: <Tooltip title="Срочность задачи: чем выше, тем быстрее нужно отработать."><span>Приоритет</span></Tooltip>,
              dataIndex: "priority",
              width: 110,
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: <Tooltip title="Дата и время создания автозадачи системой."><span>Создано</span></Tooltip>,
              dataIndex: "createdAt",
              width: 170,
              render: (v: string) => formatDate(v, true),
            },
          ]}
        />
      </Card>

      <Alert
        type="success"
        showIcon
        message="Начисление месячной зарплаты по часам"
        description={`Формула для фиксированной зарплаты: ставка в час = оклад / ${summary?.standards?.monthHours || 160}. Итог = ЗП по плану + доплата за переработку - удержание за недоработку.`}
      />

      <Card
        size="small"
        title={`3. Табель сотрудника${selectedManager ? `: ${selectedManager.name}` : ""}`}
        extra={
          <Tooltip title="Добавить новую запись рабочего времени для выбранного сотрудника.">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedManager}
              onClick={() => {
                if (!selectedManager) return;
                form.resetFields();
                form.setFieldsValue({
                  managerId: selectedManager.id,
                  workDate: dayjs(),
                  startTime: dayjs(
                    `2000-01-01T${String(selectedManager.workStartTimeDefault || "09:00")}:00`,
                  ),
                  breakMinutes: Number(selectedManager.workBreakMinutesDefault ?? 60),
                  plannedHours: Number(selectedManager.workDayHoursDefault ?? 8),
                  workedHours: 0,
                });
                setCreateOpen(true);
              }}
            >
              Добавить запись
            </Button>
          </Tooltip>
        }
      >
        <Typography.Text type="secondary" className="block mb-2">Часы и дисциплина</Typography.Text>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">План часов</Typography.Text>
            <div className="text-2xl font-semibold">{Number(summary?.totals.plannedHours || 0).toFixed(2)}</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Факт часов</Typography.Text>
            <div className="text-2xl font-semibold">{Number(summary?.totals.workedHours || 0).toFixed(2)}</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Переработка</Typography.Text>
            <div className="text-2xl font-semibold text-green-600">{Number(summary?.totals.overtimeHours || 0).toFixed(2)}</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Недоработка</Typography.Text>
            <div className="text-2xl font-semibold text-red-500">{Number(summary?.totals.undertimeHours || 0).toFixed(2)}</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Опоздания</Typography.Text>
            <div className="text-2xl font-semibold text-orange-500">{Math.round(Number(summary?.totals.lateMinutes || 0))} мин</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Ранний уход</Typography.Text>
            <div className="text-2xl font-semibold text-orange-500">{Math.round(Number(summary?.totals.earlyLeaveMinutes || 0))} мин</div>
          </Card>
        </div>

        <Typography.Text type="secondary" className="block mb-2">Зарплата за период</Typography.Text>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">ЗП по плану</Typography.Text>
            <div className="text-2xl font-semibold">{Math.round(salaryPlan).toLocaleString()} c</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Доплата за переработку</Typography.Text>
            <div className="text-2xl font-semibold text-green-600">+{Math.round(salaryOvertime).toLocaleString()} c</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">Удержание за недоработку</Typography.Text>
            <div className="text-2xl font-semibold text-red-500">-{Math.round(salaryDeduction).toLocaleString()} c</div>
          </Card>
          <Card size="small" loading={summaryQuery.isLoading}>
            <Typography.Text type="secondary">ЗП начислено</Typography.Text>
            <div className="text-2xl font-semibold text-blue-600">{Math.round(salaryFinal).toLocaleString()} c</div>
          </Card>
        </div>

        <Table
          size="small"
          rowKey="id"
          loading={entriesQuery.isLoading}
          dataSource={entries}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1500 }}
        />
      </Card>

      <Modal
        open={isSettingsOpen}
        title={`Настройка нормы: ${selectedManager?.name || ""}`}
        onCancel={() => setSettingsOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={settingsForm} layout="vertical" onFinish={saveEmployeeSettings}>
          <Card size="small" className="mb-3" title="Что сделать">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text strong>1. Выбрать шаблон</Typography.Text>
                <div className="text-slate-500 dark:text-slate-300">Быстрый старт для типового графика</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text strong>2. Проверить поля</Typography.Text>
                <div className="text-slate-500 dark:text-slate-300">Оклад, часы, перерыв, допуск</div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text strong>3. Сохранить</Typography.Text>
                <div className="text-slate-500 dark:text-slate-300">Норма начнет применяться к новому табелю</div>
              </div>
            </div>
          </Card>

          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="Админ-настройка нормы сотрудника"
            description="Сделайте 3 шага: выберите шаблон, проверьте поля, нажмите сохранить. Система ниже покажет расчет и подсказки."
          />
          <Card size="small" className="mb-3" title="Быстро настроить">
            <Space wrap>
              {settingsPresets.map((preset) => (
                <Button key={preset.key} onClick={() => applySettingsPreset(preset)}>
                  {preset.label}
                </Button>
              ))}
              <Button type="dashed" onClick={autofillSmartSettings}>
                Заполнить автоматически
              </Button>
            </Space>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Card size="small" title="Зарплата">
              <div className="grid grid-cols-1 gap-2">
                <Form.Item
                  name="salaryType"
                  label="Шаг 1. Тип зарплаты"
                  className="mb-2"
                  rules={[{ required: true, message: "Выберите тип зарплаты" }]}
                  extra="Комиссия: без фиксированного оклада. Фиксированная: обязателен оклад."
                >
                  <Select
                    options={[
                      { label: "Комиссия", value: "commission" },
                      { label: "Фиксированная", value: "fixed" },
                    ]}
                    onChange={handleSalaryTypeChange}
                  />
                </Form.Item>
                <Form.Item
                  name="fixedMonthlySalary"
                  label="Шаг 2. Оклад (сом)"
                  className="mb-1"
                  extra="Заполняется только для фиксированной зарплаты."
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (watchedSalaryType !== "fixed") return;
                        if (Number(value || 0) <= 0) {
                          throw new Error("Для фиксированной зарплаты укажите оклад больше 0");
                        }
                      },
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    placeholder="Например: 45000"
                    style={{ width: "100%" }}
                    disabled={watchedSalaryType !== "fixed"}
                  />
                </Form.Item>
                <Typography.Text type="secondary" className="text-xs">
                  Для комиссии оклад не обязателен. Для фиксированной зарплаты укажите месячный оклад.
                </Typography.Text>
              </div>
            </Card>

            <Card size="small" title="График и дисциплина">
              <div className="grid grid-cols-1 gap-2">
                <Form.Item
                  name="workStartTimeDefault"
                  label="Шаг 3. Начало смены"
                  className="mb-2"
                  rules={[{ required: true, message: "Укажите время начала смены" }]}
                  extra="В это время сотрудник должен начать работу."
                >
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="workDayHoursDefault"
                  label="Норма часов/день"
                  className="mb-2"
                  rules={[{ required: true, message: "Укажите норму часов в день" }]}
                  extra="Сколько часов сотрудник должен отработать за день."
                >
                  <InputNumber min={0} max={24} step={0.5} placeholder="Например: 8" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="workWeekModeDefault"
                  label="График недели"
                  className="mb-2"
                  rules={[{ required: true, message: "Выберите график недели" }]}
                  extra="5/2: пять рабочих дней. 6/1: шесть рабочих дней."
                >
                  <Select
                    options={[
                      { label: "5/2", value: "5/2" },
                      { label: "6/1", value: "6/1" },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  name="workBreakMinutesDefault"
                  label="Перерыв (мин)"
                  className="mb-2"
                  rules={[{ required: true, message: "Укажите перерыв в минутах" }]}
                  extra="Перерыв вычитается из рабочего времени."
                >
                  <InputNumber min={0} max={720} placeholder="Например: 60" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="lateGraceMinutesDefault"
                  label="Допуск опоздания (мин)"
                  className="mb-1"
                  rules={[{ required: true, message: "Укажите допуск опоздания" }]}
                  extra="Опоздание в пределах этого времени не считается нарушением."
                >
                  <InputNumber min={0} max={180} placeholder="Например: 10" style={{ width: "100%" }} />
                </Form.Item>
              </div>
            </Card>
          </div>

          <Card size="small" className="mb-3" title="Проверка перед сохранением">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Итоговый график</Typography.Text>
                <div className="font-semibold">
                  {watchedStartTime ? watchedStartTime.format("HH:mm") : "—"} · {Number(watchedWorkDayHours || 0).toFixed(1)} ч
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Дисциплина</Typography.Text>
                <div className="font-semibold">
                  Допуск {Math.round(Number(watchedLateGraceMinutes || 0))} мин · Перерыв {Math.round(Number(watchedBreakMinutes || 0))} мин
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Тип расчета</Typography.Text>
                <div className="font-semibold">
                  {watchedSalaryType === "fixed" ? "Фиксированная зарплата" : "Комиссия"}
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Оклад</Typography.Text>
                <div className="font-semibold">
                  {watchedSalaryType === "fixed"
                    ? `${Math.round(Number(watchedSalaryFixed || 0)).toLocaleString()} c`
                    : "Не используется"}
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Расчетный месяц</Typography.Text>
                <div className="font-semibold">
                  {settingsInsights.weekMode} · {settingsInsights.monthWorkDays} дней · {settingsInsights.monthHours.toFixed(1)} ч
                </div>
              </div>
              <div className="rounded border border-slate-200 dark:border-slate-700 p-2">
                <Typography.Text type="secondary">Ставка в час (оценка)</Typography.Text>
                <div className="font-semibold">
                  {watchedSalaryType === "fixed"
                    ? `${Math.round(settingsInsights.hourlyRate).toLocaleString()} c/ч`
                    : "По комиссии"}
                </div>
              </div>
            </div>
          </Card>

          <Card size="small" className="mb-3" title="Умные подсказки">
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              {settingsInsights.tips.map((tip, idx) => (
                <Typography.Text key={idx} className="text-sm">
                  {idx + 1}. {tip}
                </Typography.Text>
              ))}
            </Space>
          </Card>

          {settingsWarnings.length ? (
            <Alert
              type="warning"
              showIcon
              className="mb-3"
              message="Проверьте значения"
              description={settingsWarnings.join(" ")}
            />
          ) : null}

          <Alert
            type="success"
            showIcon
            className="mb-3"
            message="Логика расчета"
            description="Система использует эти значения для плановых часов, контроля опозданий/раннего ухода и начисления зарплаты за период."
          />
          <Button className="mb-2" block onClick={resetSettingsToCurrent}>
            Сбросить к текущим
          </Button>
          <Button
            block
            type="primary"
            htmlType="submit"
            loading={updateManager.isPending}
          >
            Сохранить настройки и закрыть
          </Button>
        </Form>
      </Modal>

      <Modal
        open={isCreateOpen}
        title="Добавить запись табеля"
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={submitCreate}>
          <Form.Item name="managerId" hidden>
            <Input />
          </Form.Item>
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={selectedManager ? `Сотрудник: ${selectedManager.name}` : "Сотрудник не выбран"}
          />
          <Form.Item name="workDate" label="Рабочая дата" rules={[{ required: true, message: "Укажите дату" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item name="startTime" label="Начало">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="endTime" label="Окончание">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="breakMinutes" label="Перерыв (мин)">
              <InputNumber min={0} max={480} style={{ width: 130 }} />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item name="plannedHours" label="План часов">
              <InputNumber min={0} max={24} step={0.5} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="workedHours" label="Факт часов (вручную)">
              <InputNumber min={0} max={24} step={0.25} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} placeholder="Причина переработки/недоработки, особые условия дня..." />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={createEntry.isPending}>
            Сохранить запись
          </Button>
        </Form>
      </Modal>

      <Modal
        open={!!editingEntry}
        title="Редактировать запись табеля"
        onCancel={() => {
          setEditingEntry(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={submitEdit}>
          <Form.Item name="managerId" hidden>
            <Input />
          </Form.Item>
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={editingEntry ? `Сотрудник: ${editingEntry.managerName}` : ""}
          />
          <Form.Item name="workDate" label="Рабочая дата" rules={[{ required: true, message: "Укажите дату" }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item name="startTime" label="Начало">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="endTime" label="Окончание">
              <TimePicker format="HH:mm" />
            </Form.Item>
            <Form.Item name="breakMinutes" label="Перерыв (мин)">
              <InputNumber min={0} max={480} style={{ width: 130 }} />
            </Form.Item>
          </Space>
          <Space style={{ width: "100%" }} align="start">
            <Form.Item name="plannedHours" label="План часов">
              <InputNumber min={0} max={24} step={0.5} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="workedHours" label="Факт часов (вручную)">
              <InputNumber min={0} max={24} step={0.25} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item name="note" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={updateEntry.isPending}>
            Сохранить изменения
          </Button>
        </Form>
      </Modal>
    </div>
  );
};
