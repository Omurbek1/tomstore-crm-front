import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Input, Popconfirm, Row, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined, PlayCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { toSafeExternalUrl } from "../../../security/url";
import { useAiMaterialsHelp } from "../../../hooks/api";
import type {
  MaterialType,
  PaginatedMaterials,
  TrainingMaterial,
  TrainingMaterialFolder,
} from "../../../entities/material/model/types";

type MaterialsPanelProps = {
  materialsPage: PaginatedMaterials;
  folders: TrainingMaterialFolder[];
  selectedFolderId?: string;
  search: string;
  isAdmin: boolean;
  onSearchChange: (v: string) => void;
  onSelectFolder: (folderId?: string) => void;
  onCreate: () => void;
  onCreateFolder: () => void;
  onEdit: (m: TrainingMaterial) => void;
  onPreviewVideo: (m: TrainingMaterial) => void;
  onDeleteFolder: (id: string) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onDelete: (id: string) => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  aiAudience?: "manager" | "marketing" | "smm" | "general";
};

type AiChatHistoryItem = {
  question: string;
  answer: string;
  createdAt: string;
};

export const MaterialsPanel = ({
  materialsPage,
  folders,
  selectedFolderId,
  search,
  isAdmin,
  onSearchChange,
  onSelectFolder,
  onCreate,
  onCreateFolder,
  onEdit,
  onPreviewVideo,
  onDeleteFolder,
  onPageChange,
  onDelete,
  formatDate,
  aiAudience = "general",
}: MaterialsPanelProps) => {
  const aiMaterialsHelp = useAiMaterialsHelp();
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<{
    answer: string;
    recommendedMaterials: Array<{
      id?: string;
      title: string;
      reason?: string;
      url?: string;
    }>;
  } | null>(null);
  const [aiHistory, setAiHistory] = useState<AiChatHistoryItem[]>([]);
  const aiHistoryStorageKey = `materials_ai_history_${aiAudience}`;

  const folderMap = useMemo(
    () => new Map(folders.map((f) => [f.id, f.name] as const)),
    [folders],
  );

  const aiMaterialsContext = useMemo(
    () =>
      (materialsPage.items || []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        url: m.url,
        folderName: m.folderId ? folderMap.get(m.folderId) : "Без папки",
      })),
    [materialsPage.items, folderMap],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(aiHistoryStorageKey);
      if (!raw) {
        setAiHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as AiChatHistoryItem[];
      if (Array.isArray(parsed)) {
        setAiHistory(parsed.slice(-20));
      } else {
        setAiHistory([]);
      }
    } catch {
      setAiHistory([]);
    }
  }, [aiHistoryStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(aiHistoryStorageKey, JSON.stringify(aiHistory.slice(-20)));
    } catch {
      // ignore localStorage write errors
    }
  }, [aiHistory, aiHistoryStorageKey]);

  const askAi = async () => {
    const question = String(aiQuestion || "").trim();
    if (!question) return;
    const result = await aiMaterialsHelp.mutateAsync({
      question,
      audience: aiAudience,
      locale: "ru",
      history: aiHistory.slice(-8).map((x) => ({
        question: x.question,
        answer: x.answer,
        createdAt: x.createdAt,
      })),
      materials: aiMaterialsContext,
    });
    setAiAnswer({
      answer: result.answer,
      recommendedMaterials: result.recommendedMaterials || [],
    });
    setAiHistory((prev) =>
      [
        ...prev,
        {
          question,
          answer: String(result.answer || "").trim(),
          createdAt: new Date().toISOString(),
        },
      ].slice(-20),
    );
  };

  const columns: ColumnsType<TrainingMaterial> = [
    {
      title: "Материал",
      dataIndex: "title",
      render: (v, r) => (
        <div>
          <div className="font-semibold">{v}</div>
          <div className="text-xs text-gray-500">{r.description || "—"}</div>
        </div>
      ),
    },
    {
      title: "Урок",
      dataIndex: "lessonOrder",
      width: 90,
      render: (v) => (v ? `#${v}` : "—"),
    },
    {
      title: "Тип",
      dataIndex: "type",
      width: 120,
      render: (v: MaterialType) => (
        <Tag color={v === "video" ? "geekblue" : v === "document" ? "purple" : "blue"}>
          {v === "video"
            ? "Видео"
            : v === "document"
              ? "Документ"
              : v === "link"
                ? "Ссылка"
                : v === "image"
                  ? "Изображение"
                  : "Другое"}
        </Tag>
      ),
    },
    {
      title: "Ссылка/файл",
      dataIndex: "url",
      render: (v, r) => {
        const safeUrl = toSafeExternalUrl(v);
        return (
          <Space>
            {r.type === "video" && (
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => onPreviewVideo(r)}
              >
                Смотреть
              </Button>
            )}
            {safeUrl ? (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600"
              >
                <LinkOutlined /> Открыть
              </a>
            ) : (
              <Tag color="red">Невалидная ссылка</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Добавил",
      dataIndex: "createdByName",
      width: 130,
      render: (v) => v || "—",
    },
    {
      title: "Дата",
      dataIndex: "createdAt",
      width: 140,
      render: (v) => formatDate(v, true),
    },
    ...(isAdmin
      ? [
          {
            title: "Действия",
            width: 120,
            render: (_v: unknown, r: TrainingMaterial) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(r)} />
                <Popconfirm title="Удалить материал?" onConfirm={() => onDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={7}>
          <Card
            size="small"
            title="Папки"
            extra={
              isAdmin ? (
                <Button size="small" icon={<PlusOutlined />} onClick={onCreateFolder}>
                  Папка
                </Button>
              ) : null
            }
          >
            <div className="space-y-1">
              {[
                { id: "all", name: "Все материалы" },
                ...folders,
                { id: "ungrouped", name: "Без папки" },
              ].map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50"
                >
                  <button
                    type="button"
                    className={`text-left flex-1 ${(selectedFolderId || "all") === f.id ? "text-blue-600 font-semibold" : ""}`}
                    onClick={() => onSelectFolder(f.id === "all" ? undefined : f.id)}
                  >
                    {f.name}
                  </button>
                  {isAdmin && f.id !== "all" && f.id !== "ungrouped" ? (
                    <Popconfirm
                      title="Удалить папку?"
                      description="Материалы останутся, но станут без папки"
                      onConfirm={() => onDeleteFolder(f.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <Card size="small" title="Уроки и материалы">
            <div className="flex flex-wrap gap-2 justify-between mb-3">
              <Input
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Поиск по названию/описанию..."
                className="max-w-sm"
              />
              {isAdmin && (
                <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
                  Добавить материал
                </Button>
              )}
            </div>

            <Card
              size="small"
              className="mb-3"
              title="ИИ-помощник по материалам"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={askAi}
                    loading={aiMaterialsHelp.isPending}
                  >
                    Спросить ИИ
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setAiQuestion("");
                      setAiAnswer(null);
                    }}
                    disabled={!aiQuestion && !aiAnswer}
                  >
                    Очистить
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setAiHistory([])}
                    disabled={aiHistory.length === 0}
                  >
                    Очистить историю
                  </Button>
                </Space>
              }
            >
              <Input.TextArea
                rows={3}
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Например: Как правильно закрывать возражения клиента по рассрочке?"
              />
              <Typography.Text type="secondary" className="block mt-2">
                ИИ отвечает по текущим материалам раздела и подсказывает, что изучить дальше.
              </Typography.Text>
              {aiAnswer ? (
                <div className="mt-3 space-y-2">
                  <Alert type="info" showIcon message={aiAnswer.answer} />
                  {aiAnswer.recommendedMaterials.map((item, idx) => {
                    const safeUrl = toSafeExternalUrl(item.url);
                    return (
                      <Alert
                        key={`${item.title}-${idx}`}
                        type="success"
                        showIcon
                        message={item.title}
                        description={
                          <div className="space-y-1">
                            {item.reason ? <div>{item.reason}</div> : null}
                            {safeUrl ? (
                              <a href={safeUrl} target="_blank" rel="noopener noreferrer">
                                Открыть материал
                              </a>
                            ) : null}
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
              {aiHistory.length > 0 ? (
                <Card size="small" className="mt-3" type="inner" title="История чата">
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {aiHistory
                      .slice()
                      .reverse()
                      .map((item, idx) => (
                        <Alert
                          key={`${item.createdAt}-${idx}`}
                          type="info"
                          showIcon
                          message={item.question}
                          description={
                            <div className="space-y-1">
                              <div>{item.answer}</div>
                              <Typography.Text type="secondary">
                                {new Date(item.createdAt).toLocaleString()}
                              </Typography.Text>
                            </div>
                          }
                        />
                      ))}
                  </div>
                </Card>
              ) : null}
            </Card>

            <Table
              rowKey="id"
              size="small"
              dataSource={materialsPage.items}
              columns={columns}
              pagination={{
                total: materialsPage.total,
                pageSize: materialsPage.limit,
                current: Math.floor(materialsPage.offset / materialsPage.limit) + 1,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                onChange: onPageChange,
              }}
              scroll={{ x: 960 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
