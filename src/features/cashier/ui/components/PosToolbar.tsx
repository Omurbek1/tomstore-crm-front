import { ArrowsAltOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { Button, Card, Space, Switch, Tag, Typography } from "antd";

type Props = {
  touchMode: boolean;
  isPosFullscreen: boolean;
  onToggleTouchMode: (checked: boolean) => void;
  onToggleFullscreen: () => void;
};

export const PosToolbar = ({
  touchMode,
  isPosFullscreen,
  onToggleTouchMode,
  onToggleFullscreen,
}: Props) => {
  return (
    <Card
      size="small"
      className={touchMode ? "border-blue-200" : undefined}
      styles={{ body: { padding: touchMode ? 10 : 8 } }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Text strong>POS режим</Typography.Text>
        <Space wrap>
          <Tag color={touchMode ? "blue" : "default"}>
            {touchMode ? "Touch mode ON" : "Touch mode OFF"}
          </Tag>
          <Switch
            checked={touchMode}
            onChange={onToggleTouchMode}
            checkedChildren="Touch"
            unCheckedChildren="Classic"
          />
          <Button
            icon={isPosFullscreen ? <FullscreenExitOutlined /> : <ArrowsAltOutlined />}
            onClick={onToggleFullscreen}
          >
            {isPosFullscreen ? "Выйти из Full Screen" : "Full Screen POS"}
          </Button>
        </Space>
      </div>
    </Card>
  );
};
