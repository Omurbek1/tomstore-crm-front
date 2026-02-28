import { Avatar, Button, Layout, Space, Switch } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

const { Header } = Layout;

type Props = {
  title: ReactNode;
  isDark: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  userName: string;
  onThemeChange: (isDark: boolean) => void;
  onOpenProfile: () => void;
};

export const AppHeader = ({
  title,
  isDark,
  sidebarCollapsed,
  onToggleSidebar,
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
      <Space align="center" size={12}>
        <Button
          type="text"
          onClick={onToggleSidebar}
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={sidebarCollapsed ? "Показать меню" : "Скрыть меню"}
        />
        <span className="text-lg font-bold">{title}</span>
      </Space>
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
