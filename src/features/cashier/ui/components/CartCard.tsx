import { DeleteOutlined, PrinterOutlined } from "@ant-design/icons";
import { Button, Card, InputNumber, Space, Table, Typography } from "antd";
import type { CartItem, ReceiptSnapshot } from "../../model/types";

type Props = {
  cart: CartItem[];
  subtotal: number;
  touchMode: boolean;
  currentShift: { id?: string } | null;
  submitting?: boolean;
  lastReceipt: ReceiptSnapshot | null;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onReprint: (receipt: ReceiptSnapshot) => void;
};

export const CartCard = ({
  cart,
  subtotal,
  touchMode,
  currentShift,
  submitting,
  lastReceipt,
  onQtyChange,
  onRemove,
  onSubmit,
  onClear,
  onReprint,
}: Props) => {
  return (
    <Card size="small" title="Чек / Корзина">
      <Table
        rowKey="key"
        size={touchMode ? "middle" : "small"}
        dataSource={cart}
        pagination={false}
        locale={{ emptyText: "Корзина пуста" }}
        scroll={{ x: 520 }}
        columns={[
          { title: "Товар", dataIndex: "productName" },
          {
            title: "Кол-во",
            width: touchMode ? 140 : 120,
            render: (_v, r: CartItem) => (
              <InputNumber
                min={1}
                value={r.quantity}
                onChange={(v) => onQtyChange(r.productId, Number(v || 1))}
                style={{ width: "100%" }}
                disabled={!currentShift}
              />
            ),
          },
          {
            title: "Сумма",
            width: 120,
            align: "right" as const,
            render: (_v, r: CartItem) => `${(r.price * r.quantity).toLocaleString()} c`,
          },
          {
            title: "",
            width: touchMode ? 64 : 50,
            render: (_v, r: CartItem) => (
              <Button
                size={touchMode ? "middle" : "small"}
                danger
                icon={<DeleteOutlined />}
                onClick={() => onRemove(r.productId)}
                disabled={!currentShift}
              />
            ),
          },
        ]}
      />

      <Space className="mt-3" style={{ width: "100%" }} direction="vertical">
        <div className="w-full rounded-md border border-dashed border-gray-300 px-3 py-2">
          <div className="text-xs text-gray-500">К оплате</div>
          <Typography.Text strong className="text-lg">
            {subtotal.toLocaleString()} c
          </Typography.Text>
        </div>
        <Button
          type="primary"
          block
          size={touchMode ? "large" : "middle"}
          loading={submitting}
          onClick={onSubmit}
          disabled={!currentShift}
        >
          Оплатить
        </Button>
        <Button block size={touchMode ? "large" : "middle"} onClick={onClear} disabled={!currentShift}>
          Очистить чек
        </Button>
        {lastReceipt ? (
          <Button block icon={<PrinterOutlined />} onClick={() => onReprint(lastReceipt)}>
            Печать последнего чека
          </Button>
        ) : null}
      </Space>

      {!currentShift ? <div className="text-xs text-red-500 mt-2">Сначала откройте смену</div> : null}
    </Card>
  );
};
