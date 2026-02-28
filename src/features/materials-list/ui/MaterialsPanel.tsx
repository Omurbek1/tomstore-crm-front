import { Button, Card, Col, Input, Popconfirm, Row, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined, LinkOutlined, PlayCircleOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { toSafeExternalUrl } from "../../../security/url";
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
}: MaterialsPanelProps) => {
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
