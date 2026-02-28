import { Button, Card, Form, Input, Typography } from "antd";
import { KeyOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import { useLogin } from "../../../hooks/api";
import { useAppStore } from "../../../store/appStore";

const { Title, Text } = Typography;

export const LoginScreen = () => {
  const loginMutation = useLogin();
  const [form] = Form.useForm();
  const isDark = useAppStore((s) => s.appTheme) === "dark";

  const onFinish = (values: { login: string; password: string }) => {
    loginMutation.mutate(values);
  };

  return (
    <div
      className={`flex h-screen items-center justify-center ${
        isDark ? "bg-slate-900" : "bg-gray-100"
      } transition-colors duration-300`}
      style={
        isDark
          ? {
              background:
                "radial-gradient(1000px 380px at 0% -10%, rgba(55,85,128,.35), transparent 62%), #111826",
            }
          : undefined
      }
    >
      <Card
        className={`w-full max-w-md shadow-xl rounded-2xl ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white"
        }`}
      >
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isDark ? "bg-blue-900" : "bg-blue-50"
            }`}
          >
            <ShopOutlined style={{ fontSize: "28px", color: "#1890ff" }} />
          </div>
          <Title level={3} className={isDark ? "!text-white" : ""}>
            Tomstore CRM
          </Title>
          <Text type="secondary" className={isDark ? "!text-gray-400" : ""}>
            NestJS Edition
          </Text>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="login" label="Логин" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true }]}
          >
            <Input.Password prefix={<KeyOutlined />} size="large" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            className="mt-2"
            loading={loginMutation.isPending}
          >
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
};
