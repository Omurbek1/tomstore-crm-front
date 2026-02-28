import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  type FormInstance,
  Input,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  KeyOutlined,
  MoonOutlined,
  SunOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { toSafeMediaUrl } from "../../../security/url";

type DeliveryStatusCode =
  | "reserved"
  | "ready"
  | "on_way"
  | "picked_up"
  | "delivered"
  | "canceled";

type SaleLike = {
  id: string;
  managerId?: string;
  productName: string;
  clientName: string;
  manualDate?: string | null;
  createdAt: string;
  total: number;
  managerEarnings: number;
  deliveryStatus: DeliveryStatusCode;
};

type UserLike = {
  id: string;
  name: string;
  role: "superadmin" | "admin" | "manager" | "storekeeper" | "cashier";
};

type AppTheme = "light" | "dark";

type Props = {
  user: UserLike;
  sales: SaleLike[];
  isAdmin: boolean;
  appTheme: AppTheme;
  companyForm: FormInstance<{
    companyName?: string;
    companyLogoUrl?: string;
  }>;
  isUploadingCompanyLogo: boolean;
  profileSubmitting: boolean;
  companySubmitting: boolean;
  onProfileSubmit: (values: { name?: string; password?: string }) => void;
  onCompanySubmit: (values: {
    companyName?: string;
    companyLogoUrl?: string;
  }) => void;
  onThemeChange: (dark: boolean) => void;
  onUploadCompanyLogo: (options: unknown) => void;
  formatDate: (value?: string | null, withTime?: boolean) => string;
  deliveryStatuses: Record<DeliveryStatusCode, { text: string; color: string }>;
};

export const SettingsSection = ({
  user,
  sales,
  isAdmin,
  appTheme,
  companyForm,
  isUploadingCompanyLogo,
  profileSubmitting,
  companySubmitting,
  onProfileSubmit,
  onCompanySubmit,
  onThemeChange,
  onUploadCompanyLogo,
  formatDate,
  deliveryStatuses,
}: Props) => {
  const mySales = sales.filter((s) => s.managerId === user.id);
  const myRev = mySales.reduce((a, s) => a + s.total, 0);
  const myEarnings = mySales.reduce((a, s) => a + s.managerEarnings, 0);

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} md={12}>
        <Card title="Профиль">
          <Form
            layout="vertical"
            initialValues={{ name: user.name }}
            onFinish={onProfileSubmit}
          >
            <Form.Item name="name" label="Имя" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="password" label="Новый пароль">
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder="Оставьте пустым, чтобы не менять"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={profileSubmitting}
            >
              Сохранить профиль
            </Button>
          </Form>
        </Card>
      </Col>

      {isAdmin && (
        <Col xs={24} md={12}>
          <Card title="Компания">
            <Form
              form={companyForm}
              layout="vertical"
              onFinish={onCompanySubmit}
            >
              <Form.Item
                name="companyName"
                label="Название компании"
                rules={[
                  { required: true, message: "Введите название компании" },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="Логотип">
                <Space orientation="vertical" style={{ width: "100%" }}>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={onUploadCompanyLogo}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      loading={isUploadingCompanyLogo}
                    >
                      Загрузить логотип
                    </Button>
                  </Upload>
                  {companyForm.getFieldValue("companyLogoUrl") ? (
                    <img
                      src={toSafeMediaUrl(
                        companyForm.getFieldValue("companyLogoUrl"),
                      )}
                      alt="company-logo-preview"
                      className="w-28 h-28 rounded object-cover border"
                    />
                  ) : null}
                </Space>
              </Form.Item>
              <Form.Item name="companyLogoUrl" hidden>
                <Input />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={companySubmitting}
              >
                Сохранить компанию
              </Button>
            </Form>
          </Card>
        </Col>
      )}
      <Col xs={24} md={12}>
        <Card title="Статистика аккаунта">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic title="Мои продажи" value={mySales.length} />
            </Col>
            <Col span={8}>
              <Statistic
                title="Выручка"
                value={myRev}
                suffix="c"
                styles={{
                  content: {
                    color: "#1890ff",
                  },
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Заработано"
                value={myEarnings}
                suffix="c"
                styles={{
                  content: {
                    color: "#52c41a",
                  },
                }}
              />
            </Col>
          </Row>
          <Divider />
          <div className="text-sm text-gray-400">
            Роль:{" "}
            <Tag
              color={
                user.role === "superadmin"
                  ? "volcano"
                  : user.role === "admin"
                    ? "red"
                    : user.role === "storekeeper"
                      ? "purple"
                      : user.role === "cashier"
                        ? "gold"
                        : "blue"
              }
            >
              {user.role === "superadmin"
                ? "Superadmin"
                : user.role === "admin"
                  ? "Администратор"
                  : user.role === "storekeeper"
                    ? "Складщик"
                    : user.role === "cashier"
                      ? "Кассир"
                      : "Менеджер"}
            </Tag>
          </div>
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Внешний вид">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Тёмная тема</div>
              <div className="text-sm text-gray-400">
                Переключить тёмный / светлый режим
              </div>
            </div>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={appTheme === "dark"}
              onChange={onThemeChange}
            />
          </div>
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card title="Мои последние продажи" size="small">
          <Table
            size="small"
            rowKey="id"
            dataSource={mySales.slice(0, 8)}
            pagination={false}
            locale={{ emptyText: "Продаж пока нет" }}
            columns={[
              { title: "Товар", dataIndex: "productName" },
              { title: "Клиент", dataIndex: "clientName" },
              {
                title: "Дата",
                render: (_v, s) => formatDate(s.manualDate || s.createdAt),
              },
              {
                title: "Сумма",
                align: "right",
                render: (_v, s) => (
                  <div className="text-right">
                    <div className="font-bold">
                      {s.total.toLocaleString()} c
                    </div>
                    <Tag color={deliveryStatuses[s.deliveryStatus]?.color}>
                      {deliveryStatuses[s.deliveryStatus]?.text}
                    </Tag>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
};
