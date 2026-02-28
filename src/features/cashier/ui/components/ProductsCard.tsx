import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Image, Tag, Typography } from "antd";
import { toSafeMediaUrl } from "../../../../security/url";
import type { ProductLike } from "../../model/types";

type Props = {
  filtered: ProductLike[];
  products: ProductLike[];
  touchMode: boolean;
  currentShift: { id?: string } | null;
  getAvailableStock: (product: ProductLike, products: ProductLike[]) => number;
  onAddToCart: (product: ProductLike, quantity?: number) => void;
};

export const ProductsCard = ({
  filtered,
  products,
  touchMode,
  currentShift,
  getAvailableStock,
  onAddToCart,
}: Props) => {
  if (!filtered.length) {
    return (
      <Card size="small" title="Товары">
        <Empty description="Товары не найдены" />
      </Card>
    );
  }

  return (
    <Card size="small" title="Товары">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((r) => {
          const photo = (Array.isArray(r.photoUrls) ? r.photoUrls[0] : undefined) || r.photoUrl;
          const qty = getAvailableStock(r, products);
          const disabled = !currentShift || qty <= 0;
          return (
            <Card
              key={r.id}
              size={touchMode ? "default" : "small"}
              hoverable
              onDoubleClick={() => onAddToCart(r, 1)}
              className="h-full"
              styles={{ body: { padding: touchMode ? 14 : 12 } }}
            >
              <div className="space-y-2">
                {photo ? (
                  <Image
                    src={toSafeMediaUrl(photo)}
                    alt={r.name}
                    width="100%"
                    height={touchMode ? 140 : 120}
                    style={{ objectFit: "cover", borderRadius: 8 }}
                    preview={false}
                  />
                ) : (
                  <div className="w-full h-[120px] rounded bg-gray-100 border" />
                )}
                <Typography.Text strong className="block">
                  {r.name}
                </Typography.Text>
                {r.characteristics ? (
                  <Typography.Text type="secondary" className="block text-xs">
                    {r.characteristics}
                  </Typography.Text>
                ) : null}
                <div className="flex items-center justify-between">
                  <Tag color={qty <= 0 ? "red" : qty <= 3 ? "gold" : "green"}>
                    Остаток: {qty}
                  </Tag>
                  <Typography.Text strong>
                    {Number(r.sellingPrice || 0).toLocaleString()} c
                  </Typography.Text>
                </div>
                <div className="text-xs text-gray-500">ШК: {r.barcode || "—"}</div>
                <Button
                  block
                  size={touchMode ? "large" : "middle"}
                  icon={<PlusOutlined />}
                  onClick={() => onAddToCart(r, 1)}
                  disabled={disabled}
                >
                  Добавить
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
