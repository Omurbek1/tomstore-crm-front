import { Button, Popconfirm, Space, Table, Typography } from "antd";
import { DashboardOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title } = Typography;

type BranchItem = {
  id: string;
  name: string;
  createdAt: string;
};

type Props = {
  branches: BranchItem[];
  formatDate: (value?: string | null, withTime?: boolean) => string;
  onAdd: () => void;
  onOpenDetails: (branch: BranchItem) => void;
  onDelete: (id: string) => void;
};

export const BranchesSection = ({
  branches,
  formatDate,
  onAdd,
  onOpenDetails,
  onDelete,
}: Props) => {
  const columns: ColumnsType<BranchItem> = [
    { title: "Название", dataIndex: "name" },
    {
      title: "Создан",
      dataIndex: "createdAt",
      render: (v) => formatDate(v, true),
    },
    {
      title: "Действие",
      render: (_v, r) => (
        <Space>
          <Button size="small" icon={<DashboardOutlined />} onClick={() => onOpenDetails(r)}>
            Детали
          </Button>
          <Popconfirm title="Удалить филиал?" onConfirm={() => onDelete(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between mb-4">
        <Title level={4}>Филиалы</Title>
        <Button type="primary" onClick={onAdd}>
          Добавить филиал
        </Button>
      </div>
      <Table rowKey="id" dataSource={branches} pagination={false} size="small" columns={columns} />
    </div>
  );
};
