import {
  Avatar,
  Button,
  Card,
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
} from "@ant-design/icons";

const { Title, Text } = Typography;

type SupplierItem = {
  id: string;
  name: string;
  contacts?: string;
  address?: string;
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
  isDark,
  formatPhone,
  onAdd,
  onEdit,
  onDelete,
}: Props) => {
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between mb-4">
        <Title level={4}>Поставщики</Title>
        <Button type="primary" onClick={onAdd}>
          Добавить
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        {suppliers.map((item) => (
          <Col xs={24} md={12} xl={8} key={item.id}>
            <Card
              size="small"
              className={`h-full ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
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
                <div className="flex items-center gap-2 text-gray-500">
                  <PhoneOutlined />
                  <span className="truncate">{formatPhone(item.contacts)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <EnvironmentOutlined />
                  <span className="truncate">{item.address || "Адрес не указан"}</span>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      {suppliers.length === 0 && (
        <Card className="mt-3 text-center">
          <Text type="secondary">Пока нет поставщиков. Добавьте первого.</Text>
        </Card>
      )}
    </div>
  );
};
