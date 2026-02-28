import { Avatar, Layout, Space, Switch } from "antd";
import { MoonOutlined, SunOutlined, UserOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

const { Header } = Layout;

type Props = {
  title: ReactNode;
  isDark: boolean;
  userName: string;
  onThemeChange: (isDark: boolean) => void;
  onOpenProfile: () => void;
};

export const AppHeader = ({
  title,
  isDark,
  userName,
  onThemeChange,
  onOpenProfile,
}: Props) => {
  return (
    <Header
      style={{
        backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
      }}
      className={`px-6 flex justify-between items-center ${
        isDark ? "bg-gray-900" : "bg-white"
      } shadow`}
    >
      <span className="text-lg font-bold">{title}</span>
      <Space>
        <Switch
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
          checked={isDark}
          onChange={onThemeChange}
        />
        <div onClick={onOpenProfile} className="cursor-pointer flex items-center gap-2">
          <Avatar style={{ backgroundColor: "#1890ff" }} icon={<UserOutlined />} />
          <span className={isDark ? "text-white" : "text-gray-800"}>{userName}</span>
        </div>
      </Space>
    </Header>
  );
};
