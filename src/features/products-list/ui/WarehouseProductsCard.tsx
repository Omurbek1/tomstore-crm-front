import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  Switch,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

type ProductLike = {
  id: string;
  name: string;
  branchName?: string;
  supplier?: string;
  sellingPrice: number;
  isCombo?: boolean;
};

type Props = {
  products: ProductLike[];
  filteredCount?: number;
  lowStockCount: number;
  search: string;
  branchName?: string;
  canManageProducts: boolean;
  importLoading?: boolean;
  onSearchChange: (v: string) => void;
  onOpenMovement: () => void;
  onCreateProduct: () => void;
  onEditProduct: (p: ProductLike) => void;
  onImportProducts: (file: File) => void;
  onExportProducts: () => void;
  onExportFilteredProducts: () => void;
  onDeleteProduct: (id: string) => void;
  getAvailableStock: (product: ProductLike, products: ProductLike[]) => number;
};

export const WarehouseProductsCard = ({
  products,
  filteredCount,
  lowStockCount,
  search,
  branchName,
  canManageProducts,
  importLoading,
  onSearchChange,
  onOpenMovement,
  onCreateProduct,
  onEditProduct,
  onImportProducts,
  onExportProducts,
  onExportFilteredProducts,
  onDeleteProduct,
  getAvailableStock,
}: Props) => {
  const [showImportHelp, setShowImportHelp] = useState(false);
  const isLargeList = products.length > 15;
  const REQUIRED_COLUMNS = ["name", "sellingPrice"];
  const OPTIONAL_COLUMNS = [
    "barcode",
    "categories",
    "costPrice",
    "supplier",
    "branchName",
    "managerEarnings",
    "stockQty",
    "characteristics",
  ];

  const downloadTemplate = () => {
    const header = [
      "название",
      "штрихкод",
      "цена",
      "себестоимость",
      "категории",
      "поставщик",
      "филиал",
      "услугаменеджера",
      "остаток",
      "характеристики",
    ];
    const rows = [
      [
        "iPhone 15 128GB",
        "4890001234567",
        "85000",
        "72000",
        "Смартфоны|Apple",
        "Apple Кыргызстан",
        "Центральный",
        "500",
        "12",
        "Цвет: Black; Память: 128GB",
      ],
      [
        "Принтер HP Laser 107a",
        "6900002233445",
        "15000",
        "12000",
        "Принтеры|Офис",
        "HP Distributor",
        "Центральный",
        "500",
        "8",
        "Лазерный, A4, USB",
      ],
      [
        "Samsung Galaxy A55",
        "8800007788991",
        "32000",
        "27500",
        "Смартфоны|Samsung",
        "Samsung Partner",
        "Южный",
        "300",
        "20",
        "8/256, 5G, NFC",
      ],
    ];
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tomstore-products-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const productColumns: ColumnsType<ProductLike> = [
    { title: "Товар", dataIndex: "name" },
    {
      title: "Филиал",
      dataIndex: "branchName",
      render: (v) => v || "—",
    },
    {
      title: "Поставщик",
      dataIndex: "supplier",
      render: (v) => v || "—",
    },
    {
      title: "Остаток",
      align: "right",
      render: (_v, record) => {
        const qty = getAvailableStock(record, products);
        return (
          <Tag color={qty <= 0 ? "red" : qty <= 3 ? "gold" : "green"}>
            {qty} шт{record.isCombo ? " (комбо)" : ""}
          </Tag>
        );
      },
    },
    {
      title: "Цена",
      dataIndex: "sellingPrice",
      align: "right",
      render: (v) => `${Number(v || 0).toLocaleString()} c`,
    },
    ...(canManageProducts
      ? [
          {
            title: "Действие",
            key: "action",
            render: (_value: unknown, record: ProductLike) => {
              void _value;
              return (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEditProduct(record)}
                  />
                  <Popconfirm
                    title="Удалить товар?"
                    description="Действие необратимо. История продаж останется."
                    okText="Да"
                    cancelText="Нет"
                    onConfirm={() => onDeleteProduct(record.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="SKU" value={products.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Низкий остаток"
              value={lowStockCount}
              suffix="шт"
              styles={{
                content: {
                  color: lowStockCount > 0 ? "#faad14" : "#3f8600",
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Остатки склада">
        <div className="flex flex-col md:flex-row gap-3 justify-between mb-3">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Поиск по товару / поставщику"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-md"
          />
          <Space>
            <Button type="primary" onClick={onOpenMovement}>
              Движение товара
            </Button>
            {canManageProducts && (
              <>
                <Upload
                  accept=".csv,text/csv"
                  showUploadList={false}
                  customRequest={async (options) => {
                    const file = options.file as File;
                    onImportProducts(file);
                    options.onSuccess?.({});
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={importLoading}>
                    Импорт CSV
                  </Button>
                </Upload>
                <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                  Шаблон CSV
                </Button>
                {products.length > 0 && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={onExportProducts}
                  >
                    Выгрузить все товары
                  </Button>
                )}
                {products.length > 0 && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={onExportFilteredProducts}
                  >
                    Выгрузить текущий фильтр
                    {typeof filteredCount === "number"
                      ? ` (${filteredCount})`
                      : ""}
                  </Button>
                )}

                <Button onClick={onCreateProduct} icon={<PlusOutlined />}>
                  Добавить товар
                </Button>
              </>
            )}
          </Space>
        </div>

        <Table
          rowKey="id"
          size="small"
          dataSource={products}
          columns={productColumns}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 760 }}
        />
        {canManageProducts && isLargeList ? (
          <div className="mt-3 p-2 rounded border flex flex-wrap items-center gap-2 justify-between">
            <Typography.Text type="secondary" className="text-xs">
              Список большой ({products.length} товаров). Быстрые действия
              экспорта:
            </Typography.Text>
            <Space wrap>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={onExportProducts}
              >
                Все товары
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<DownloadOutlined />}
                onClick={onExportFilteredProducts}
              >
                Текущий фильтр
                {typeof filteredCount === "number" ? ` (${filteredCount})` : ""}
              </Button>
            </Space>
          </div>
        ) : null}
      </Card>
    </>
  );
};
