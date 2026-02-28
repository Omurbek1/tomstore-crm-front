import { Card, Table } from "antd";
import type { CashierRecentSale } from "../../model/types";

type Props = {
  sales: CashierRecentSale[];
  touchMode: boolean;
};

export const RecentSalesCard = ({ sales, touchMode }: Props) => {
  if (sales.length === 0) return null;

  return (
    <Card size="small" title="Последние продажи этой смены">
      <Table
        size={touchMode ? "middle" : "small"}
        rowKey="id"
        pagination={false}
        dataSource={sales}
        scroll={{ x: 760 }}
        columns={[
          {
            title: "Дата",
            dataIndex: "createdAt",
            width: 170,
            render: (v: string) => new Date(v).toLocaleString(),
          },
          { title: "Товар", dataIndex: "productName" },
          { title: "Клиент", dataIndex: "clientName", render: (v: string) => v || "—" },
          {
            title: "Оплата",
            dataIndex: "paymentType",
            width: 180,
            render: (v: string, r: { paymentLabel?: string }) =>
              r.paymentLabel ? `${v} (${r.paymentLabel})` : v,
          },
          {
            title: "Сумма",
            dataIndex: "total",
            width: 130,
            align: "right" as const,
            render: (v: number) => `${Number(v || 0).toLocaleString()} c`,
          },
        ]}
      />
    </Card>
  );
};
