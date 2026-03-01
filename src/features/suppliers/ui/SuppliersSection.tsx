import {
  Avatar,
  Button,
  Card,
  Carousel,
  Col,
  Divider,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { toSafeExternalUrl, toSafeMediaUrl } from "../../../security/url";

const { Title, Text } = Typography;

type SupplierItem = {
  id: string;
  name: string;
  contacts?: string;
  address?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
};

type Props = {
  suppliers: SupplierItem[];
  isDark: boolean;
  formatPhone: (value?: string | null) => string;
  onAdd: () => void;
  onEdit: (supplier: SupplierItem) => void;
  onDelete: (id: string) => void;
};

export const SuppliersSection = ({
  suppliers,
  isDark: _isDark,
  formatPhone,
  onAdd,
  onEdit,
  onDelete,
}: Props) => {
  return (
    <div className={`animate-fade-in ${_isDark ? "is-dark" : "is-light"}`}>
      <div className="flex justify-between mb-4">
        <Title level={4}>Поставщики</Title>
        <Button type="primary" onClick={onAdd}>
          Добавить
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        {suppliers.map((item) => {
          const gallery =
            item.imageUrls && item.imageUrls.length > 0
              ? item.imageUrls
              : item.imageUrl
                ? [item.imageUrl]
                : [];
          return (
          <Col xs={24} md={12} xl={8} key={item.id}>
            <Card
              size="small"
              className="h-full shadow-sm"
            >
              {gallery.length > 0 ? (
                <Carousel
                  autoplay={gallery.length > 1}
                  dots={gallery.length > 1}
                  className="mb-3 rounded overflow-hidden"
                >
                  {gallery.map((url, idx) => (
                    <div key={`${url}-${idx}`}>
                      <img
                        src={toSafeMediaUrl(url)}
                        alt={`${item.name}-${idx}`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </Carousel>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={toSafeMediaUrl(gallery[0])}
                    style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
                    icon={<ShopOutlined />}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.name}</div>
                    <Tag color="blue" className="mt-1">
                      Поставщик
                    </Tag>
                  </div>
                </div>
                <Space>
                  <Button icon={<EditOutlined />} size="small" onClick={() => onEdit(item)} />
                  <Popconfirm title="Удалить поставщика?" onConfirm={() => onDelete(item.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <Divider style={{ margin: "12px 0" }} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                  <PhoneOutlined />
                  <span className="truncate">{formatPhone(item.contacts)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                  <EnvironmentOutlined />
                  <span className="truncate">{item.address || "Адрес не указан"}</span>
                </div>
                {toSafeExternalUrl(item.videoUrl) ? (
                  <div className="flex items-center gap-2">
                    <VideoCameraOutlined />
                    <a
                      className="text-sky-700 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                      href={toSafeExternalUrl(item.videoUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть ссылку тура / отеля
                    </a>
                  </div>
                ) : null}
              </div>
            </Card>
          </Col>
          );
        })}
      </Row>
      {suppliers.length === 0 && (
        <Card className="mt-3 text-center">
          <Text type="secondary">Пока нет поставщиков. Добавьте первого.</Text>
        </Card>
      )}
    </div>
  );
};
