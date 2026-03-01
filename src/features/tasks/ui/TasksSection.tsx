import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { useAppStore } from "../../../store/appStore";
import { api, API_BASE_URL } from "../../../api/httpClient";
import { toSafeMediaUrl } from "../../../security/url";
import {
  useAiTasksDraft,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type AiTasksDraftItem,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../../../hooks/api";

type ManagerLike = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  managers: ManagerLike[];
  currentUser: { id: string; name: string };
  formatDate: (value?: string | null, withTime?: boolean) => string;
};

const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "К выполнению", color: "default" },
  in_progress: { label: "В работе", color: "processing" },
  done: { label: "Выполнено", color: "success" },
  canceled: { label: "Отменено", color: "error" },
};

const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Низкий", color: "default" },
  medium: { label: "Средний", color: "blue" },
  high: { label: "Высокий", color: "orange" },
  urgent: { label: "Срочно", color: "red" },
};

export const TasksSection = ({ managers, currentUser, formatDate }: Props) => {
  const { appTheme } = useAppStore();
  const isDark = appTheme === "dark";
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [aiText, setAiText] = useState("");
  const [aiDraft, setAiDraft] = useState<AiTasksDraftItem[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const tasksQuery = useTasks({
    q: search,
    status: statusFilter === "all" ? undefined : statusFilter,
    assigneeId: assigneeFilter || undefined,
    limit: 200,
    offset: 0,
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const aiTasksDraft = useAiTasksDraft();

  const tasks = tasksQuery.data?.items || [];
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sortTasks = (items: Task[]) =>
    [...items].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;

      const da = a.deadline ? dayjs(a.deadline).valueOf() : Number.POSITIVE_INFINITY;
      const db = b.deadline ? dayjs(b.deadline).valueOf() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;

      return dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
    });
  const activeTasks = useMemo(
    () => sortTasks(tasks.filter((t) => t.status !== "done")),
    [tasks],
  );
  const doneTasks = useMemo(
    () => sortTasks(tasks.filter((t) => t.status === "done")),
    [tasks],
  );

  const assigneeOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: m.id,
        label: `${m.name}${m.role ? ` (${m.role})` : ""}`,
      })),
    [managers],
  );

  const columns: ColumnsType<Task> = [
    {
      title: "Задача",
      dataIndex: "title",
      render: (_v, t) => (
        <div>
          <div className="font-semibold">{t.title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            {t.description || "Без описания"}
          </div>
        </div>
      ),
    },
    {
      title: "Исполнитель",
      dataIndex: "assigneeName",
      width: 220,
      render: (_v, t) => t.assigneeName || "—",
    },
    {
      title: "Дедлайн",
      dataIndex: "deadline",
      width: 160,
      render: (v) => (v ? formatDate(v) : "—"),
    },
    {
      title: "Приоритет",
      dataIndex: "priority",
      width: 130,
      render: (v: TaskPriority) => (
        <Tag color={PRIORITY_META[v].color}>{PRIORITY_META[v].label}</Tag>
      ),
    },
    {
      title: "Документы",
      dataIndex: "attachmentUrls",
      width: 200,
      render: (v?: string[]) =>
        Array.isArray(v) && v.length > 0 ? (
          <Space size={4} wrap>
            {v.slice(0, 2).map((url, idx) => (
              <Button
                key={`${url}-${idx}`}
                size="small"
                type="link"
                icon={<LinkOutlined />}
                onClick={() => setPreviewAttachmentUrl(url)}
              >
                Файл {idx + 1}
              </Button>
            ))}
            {v.length > 2 ? <Tag>+{v.length - 2}</Tag> : null}
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 180,
      render: (v: TaskStatus, t) => (
        t.status === "done" ? (
          <Tag color={isDark ? "cyan" : "success"}>Выполнено</Tag>
        ) : (
          <Select
            size="small"
            value={v}
            style={{ width: "100%" }}
            onChange={(next) =>
              updateTask.mutate({
                id: t.id,
                data: { status: next as TaskStatus },
              })
            }
            options={Object.entries(STATUS_META).map(([key, meta]) => ({
              value: key,
              label: meta.label,
            }))}
          />
        )
      ),
    },
    {
      title: "Создано",
      dataIndex: "createdAt",
      width: 170,
      render: (v) => formatDate(v, true),
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_v, t) => (
        <div className="flex gap-1">
          {t.status !== "done" ? (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingTask(t);
                editForm.setFieldsValue({
                  title: t.title,
                  description: t.description,
                  priority: t.priority,
                deadline: t.deadline ? dayjs(t.deadline) : null,
                attachmentUrls: t.attachmentUrls || [],
                assigneeMode: t.assigneeId ? "employee" : "custom",
                assigneeId: t.assigneeId,
                assigneeName: t.assigneeId ? undefined : t.assigneeName,
                  assigneeRole: t.assigneeId ? undefined : t.assigneeRole,
                });
              }}
            />
          ) : null}
          <Popconfirm
            title="Удалить задачу?"
            okText="Да"
            cancelText="Нет"
            onConfirm={() => deleteTask.mutate(t.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const generateTasksByAi = async () => {
    const text = String(aiText || "").trim();
    if (!text) {
      message.warning("Введите текст для ИИ");
      return;
    }
    const result = await aiTasksDraft.mutateAsync({
      text,
      locale: "ru",
      assignees: managers.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    });
    setAiDraft(result.tasks || []);
    if (!result.tasks?.length) {
      message.info("ИИ не нашел задач в тексте. Уточните формулировку.");
    } else {
      message.success(`ИИ подготовил задач: ${result.tasks.length}`);
    }
  };

  const createTaskFromDraft = async (item: AiTasksDraftItem) => {
    await createTask.mutateAsync({
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim() || undefined,
      assigneeId: String(item.assigneeId || "").trim() || undefined,
      assigneeName:
        !String(item.assigneeId || "").trim() && String(item.assigneeName || "").trim()
          ? String(item.assigneeName || "").trim()
          : undefined,
      assigneeRole:
        !String(item.assigneeId || "").trim() && String(item.assigneeRole || "").trim()
          ? String(item.assigneeRole || "").trim()
          : undefined,
      priority: item.priority || "medium",
      deadline: item.deadline
        ? dayjs(String(item.deadline), "YYYY-MM-DD").isValid()
          ? dayjs(String(item.deadline), "YYYY-MM-DD").endOf("day").toISOString()
          : undefined
        : undefined,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      attachmentUrls: [],
    });
  };

  const normalizeUrls = (value?: string[]) =>
    (Array.isArray(value) ? value : [])
      .map((x) => String(x || "").trim())
      .filter(Boolean);

  const uploadAttachmentToForm = (targetForm: typeof form) => async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      setIsUploadingAttachment(true);
      const formData = new FormData();
      formData.append("file", file as File);
      const { data } = await api.post<{ url: string }>("/uploads/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = data.url?.startsWith("http")
        ? data.url
        : `${API_BASE_URL}${data.url}`;
      const prev = normalizeUrls(targetForm.getFieldValue("attachmentUrls"));
      targetForm.setFieldValue("attachmentUrls", [...prev, uploadedUrl]);
      onSuccess?.(data);
      message.success("Файл прикреплен");
    } catch (error) {
      onError?.(error);
      message.error("Не удалось загрузить файл");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const renderAttachmentsField = (targetForm: typeof form) => {
    const urls = normalizeUrls(targetForm.getFieldValue("attachmentUrls"));
    return (
      <Form.Item label="Документы / файлы">
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Upload
            multiple
            showUploadList={false}
            customRequest={uploadAttachmentToForm(targetForm)}
          >
            <Button icon={<UploadOutlined />} loading={isUploadingAttachment}>
              Добавить файл
            </Button>
          </Upload>
          {urls.length ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              {urls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50 px-2 py-1"
                >
                  <Button type="link" onClick={() => setPreviewAttachmentUrl(url)}>
                    Файл {idx + 1}
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      targetForm.setFieldValue(
                        "attachmentUrls",
                        urls.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">Файлы не добавлены</Typography.Text>
          )}
        </Space>
      </Form.Item>
    );
  };

  const previewExt = (() => {
    if (!previewAttachmentUrl) return "";
    const plain = previewAttachmentUrl.split("?")[0].toLowerCase();
    const dot = plain.lastIndexOf(".");
    return dot >= 0 ? plain.slice(dot + 1) : "";
  })();

  const createAllFromDraft = async () => {
    if (!aiDraft.length) {
      message.info("Сначала сгенерируйте задачи через ИИ");
      return;
    }
    for (const item of aiDraft) {
      // Sequential create to keep predictable server load and result order.
      // eslint-disable-next-line no-await-in-loop
      await createTaskFromDraft(item);
    }
    message.success("Все ИИ-задачи добавлены");
    setAiDraft([]);
    setAiText("");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card
        size="small"
        title="Задачи команды"
        extra={
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Новая задача
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <Input
            placeholder="Поиск по задаче/исполнителю"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            style={{ width: 180 }}
            options={[
              { value: "all", label: "Все статусы" },
              ...Object.entries(STATUS_META).map(([key, meta]) => ({
                value: key,
                label: meta.label,
              })),
            ]}
          />
          <Select
            allowClear
            placeholder="Исполнитель"
            value={assigneeFilter || undefined}
            onChange={(v) => setAssigneeFilter(v || "")}
            style={{ width: 260 }}
            options={assigneeOptions}
          />
        </div>

        <Card
          size="small"
          className="mb-3"
          title="ИИ: создать задачи из текста"
          extra={
            <Space>
              <Button onClick={generateTasksByAi} loading={aiTasksDraft.isPending}>
                Анализировать текст
              </Button>
              <Button onClick={() => { setAiText(""); setAiDraft([]); }} disabled={!aiText && aiDraft.length === 0}>
                Очистить
              </Button>
              <Button
                type="primary"
                onClick={createAllFromDraft}
                loading={createTask.isPending}
                disabled={!aiDraft.length}
              >
                Создать все
              </Button>
            </Space>
          }
        >
          <Input.TextArea
            rows={4}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Пример: На этой неделе нужно подготовить 3 Reels, обновить витрину принтеров, проверить остатки и сделать отчет по филиалу..."
          />
          <Typography.Text type="secondary" className="block mt-2">
            ИИ выделит отдельные задачи, приоритет, дедлайн и предложит исполнителя.
          </Typography.Text>
          <Alert
            className="mt-2"
            type="info"
            showIcon
            message="Как использовать"
            description="Вставьте рабочее описание (план/бриф/сообщение), нажмите «Анализировать текст», проверьте задачи и создайте все сразу."
          />
          {aiDraft.length > 0 ? (
            <div className="mt-3 space-y-2">
              {aiDraft.map((item, idx) => (
                <Alert
                  key={`${item.title}-${idx}`}
                  type="info"
                  showIcon
                  message={`${idx + 1}. ${item.title}`}
                  description={
                    <div className="space-y-1">
                      <div>{item.description || "Без описания"}</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Tag color={PRIORITY_META[item.priority]?.color || "blue"}>
                          {PRIORITY_META[item.priority]?.label || "Средний"}
                        </Tag>
                        <Tag>{item.assigneeName || "Без исполнителя"}</Tag>
                        <Tag>{item.deadline || "Без дедлайна"}</Tag>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => createTaskFromDraft(item)}
                          loading={createTask.isPending}
                        >
                          Создать задачу
                        </Button>
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
          ) : null}
        </Card>

        <Table
          rowKey="id"
          size="small"
          loading={tasksQuery.isLoading}
          dataSource={activeTasks}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 980 }}
          rowClassName={(r) =>
            r.priority === "urgent"
              ? isDark ? "bg-red-900/30 text-slate-100" : "bg-red-50"   
              : r.priority === "high"
                ? "bg-orange-50 dark:bg-orange-900/20"
                : ""
          }
        />
      </Card>

      <Card size="small" title={`Выполненные задачи (${doneTasks.length})`}>
        <Table
          rowKey="id"
          size="small"
          loading={tasksQuery.isLoading}
          dataSource={doneTasks}
          columns={columns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 980 }}
          rowClassName={() =>
            isDark
              ? "bg-emerald-900/30 text-slate-100"
              : "bg-emerald-50"
          }
        />
      </Card>

      <Modal
        open={isCreateOpen}
        title="Поставить задачу"
        footer={null}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ assigneeMode: "employee", priority: "medium" }}
          onFinish={(v) => {
            const assigneeMode = v.assigneeMode || "employee";
            createTask.mutate(
              {
                title: String(v.title || "").trim(),
                description: String(v.description || "").trim() || undefined,
                assigneeId:
                  assigneeMode === "employee"
                    ? String(v.assigneeId || "").trim() || undefined
                    : undefined,
                assigneeName:
                  assigneeMode === "custom"
                    ? String(v.assigneeName || "").trim() || undefined
                    : undefined,
                assigneeRole:
                  assigneeMode === "custom"
                    ? String(v.assigneeRole || "").trim() || undefined
                    : undefined,
                priority: v.priority || "medium",
                deadline: v.deadline ? dayjs(v.deadline).toISOString() : undefined,
                createdById: currentUser.id,
                createdByName: currentUser.name,
                attachmentUrls: normalizeUrls(v.attachmentUrls),
              },
              {
                onSuccess: () => {
                  setCreateOpen(false);
                  form.resetFields();
                },
              },
            );
          }}
        >
          <Form.Item
            name="title"
            label="Название задачи"
            rules={[{ required: true, message: "Введите задачу" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="assigneeMode" label="Исполнитель">
            <Radio.Group>
              <Radio.Button value="employee">Сотрудник из системы</Radio.Button>
              <Radio.Button value="custom">Произвольный (SMM/Маркетинг)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.assigneeMode !== cur.assigneeMode}>
            {({ getFieldValue }) =>
              getFieldValue("assigneeMode") === "custom" ? (
                <>
                  <Form.Item
                    name="assigneeName"
                    label="Имя исполнителя"
                    rules={[{ required: true, message: "Введите имя исполнителя" }]}
                  >
                    <Input placeholder="Например: СММ Айзада" />
                  </Form.Item>
                  <Form.Item name="assigneeRole" label="Роль/отдел">
                    <Input placeholder="Например: SMM / Маркетолог / Контент" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="assigneeId"
                  label="Кому назначить"
                  rules={[{ required: true, message: "Выберите исполнителя" }]}
                >
                  <Select options={assigneeOptions} />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="priority" label="Приоритет">
            <Select
              options={Object.entries(PRIORITY_META).map(([key, meta]) => ({
                value: key,
                label: meta.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label="Дедлайн">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="attachmentUrls" hidden>
            <Select mode="tags" />
          </Form.Item>
          {renderAttachmentsField(form)}

          <Typography.Text type="secondary" className="block mb-3">
            Задачу могут ставить администратор и супер-админ.
          </Typography.Text>

          <Button type="primary" htmlType="submit" loading={createTask.isPending} block>
            Сохранить задачу
          </Button>
        </Form>
      </Modal>

      <Modal
        open={!!editingTask}
        title="Редактировать задачу"
        footer={null}
        onCancel={() => {
          setEditingTask(null);
          editForm.resetFields();
        }}
      >
        <Form
          form={editForm}
          layout="vertical"
          initialValues={{ assigneeMode: "employee" }}
          onFinish={(v) => {
            if (!editingTask) return;
            const assigneeMode = v.assigneeMode || "employee";
            updateTask.mutate(
              {
                id: editingTask.id,
                data: {
                  title: String(v.title || "").trim(),
                  description: String(v.description || "").trim() || "",
                  priority: v.priority,
                  deadline: v.deadline ? dayjs(v.deadline).toISOString() : null,
                  assigneeId:
                    assigneeMode === "employee"
                      ? String(v.assigneeId || "").trim()
                      : "",
                  assigneeName:
                    assigneeMode === "custom"
                      ? String(v.assigneeName || "").trim()
                      : undefined,
                  assigneeRole:
                    assigneeMode === "custom"
                      ? String(v.assigneeRole || "").trim()
                      : undefined,
                  attachmentUrls: normalizeUrls(v.attachmentUrls),
                },
              },
              {
                onSuccess: () => {
                  setEditingTask(null);
                  editForm.resetFields();
                },
              },
            );
          }}
        >
          <Form.Item
            name="title"
            label="Название задачи"
            rules={[{ required: true, message: "Введите задачу" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="assigneeMode" label="Исполнитель">
            <Radio.Group>
              <Radio.Button value="employee">Сотрудник из системы</Radio.Button>
              <Radio.Button value="custom">Произвольный</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.assigneeMode !== cur.assigneeMode}
          >
            {({ getFieldValue }) =>
              getFieldValue("assigneeMode") === "custom" ? (
                <>
                  <Form.Item
                    name="assigneeName"
                    label="Имя исполнителя"
                    rules={[{ required: true, message: "Введите исполнителя" }]}
                  >
                    <Input placeholder="Например: SMM Алина" />
                  </Form.Item>
                  <Form.Item name="assigneeRole" label="Роль/отдел">
                    <Input placeholder="Например: SMM / Маркетинг" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="assigneeId"
                  label="Сотрудник"
                  rules={[{ required: true, message: "Выберите сотрудника" }]}
                >
                  <Select options={assigneeOptions} />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item name="priority" label="Приоритет">
            <Select
              options={Object.entries(PRIORITY_META).map(([key, meta]) => ({
                value: key,
                label: meta.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label="Дедлайн">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="attachmentUrls" hidden>
            <Select mode="tags" />
          </Form.Item>
          {renderAttachmentsField(editForm)}
          <Button type="primary" htmlType="submit" loading={updateTask.isPending} block>
            Сохранить изменения
          </Button>
        </Form>
      </Modal>

      <Modal
        open={!!previewAttachmentUrl}
        title="Просмотр документа"
        footer={null}
        width={980}
        onCancel={() => setPreviewAttachmentUrl(null)}
      >
        {previewAttachmentUrl ? (
          <div style={{ minHeight: 520 }}>
            {["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(previewExt) ? (
              <img
                src={toSafeMediaUrl(previewAttachmentUrl)}
                alt="task-attachment"
                className="max-h-[70vh] w-full object-contain rounded"
              />
            ) : ["mp4", "webm", "mov", "m4v"].includes(previewExt) ? (
              <video
                src={toSafeMediaUrl(previewAttachmentUrl)}
                controls
                className="w-full max-h-[70vh] rounded"
              />
            ) : ["mp3", "wav", "ogg", "m4a"].includes(previewExt) ? (
              <audio src={toSafeMediaUrl(previewAttachmentUrl)} controls className="w-full" />
            ) : (
              <iframe
                src={toSafeMediaUrl(previewAttachmentUrl)}
                title="task-document-preview"
                style={{ width: "100%", height: "70vh", border: 0 }}
              />
            )}
            <div className="mt-3 text-right">
              <Button href={toSafeMediaUrl(previewAttachmentUrl)} target="_blank">
                Открыть в новой вкладке
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
