import { Form } from "antd";
import { useMemo, useState } from "react";
import { useProducts, type Product } from "../../../hooks/api";
import {
  INVENTORY_OPERATION_META,
  type InventoryOperationType,
  type InventoryType,
} from "../../../shared/constants/inventory";
import {
  formatMovementQty,
  getAvailableStock,
  resolveOperationType,
} from "../../../shared/lib/inventory";
import { formatDate } from "../../../shared/lib/format";
import { WarehouseProductsCard } from "../../products-list/ui/WarehouseProductsCard";
import { WarehouseMovementsSection } from "../../inventory-movements/ui/WarehouseMovementsSection";
import {
  type InventoryMovement,
  type WarehouseProduct,
  useCreateInventoryMovement,
  useDeleteWarehouseProduct,
  useInventoryMovements,
  useInventoryProducts,
} from "../model/hooks";

type Props = {
  user: { id: string; name: string };
  canManageProducts: boolean;
  branchName?: string;
  importLoading?: boolean;
  onCreateProduct: () => void;
  onEditProduct: (product: WarehouseProduct) => void;
  onImportProducts: (file: File) => void;
};

export const WarehousePanel = ({
  user,
  canManageProducts,
  branchName,
  importLoading,
  onCreateProduct,
  onEditProduct,
  onImportProducts,
}: Props) => {
  const [search, setSearch] = useState("");
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementForm] = Form.useForm();
  const deleteProduct = useDeleteWarehouseProduct();

  const selectedProductId = Form.useWatch("productId", movementForm) as
    | string
    | undefined;
  const selectedOperationType = Form.useWatch("operationType", movementForm) as
    | InventoryOperationType
    | undefined;

  const { data: inventoryProducts = [] } = useInventoryProducts(search, branchName);
  const { data: allProducts = [] } = useProducts();
  const { data: inventoryMovements = [] } = useInventoryMovements(
    selectedProductId,
    branchName,
  );
  const createInventoryMovement = useCreateInventoryMovement();

  const lowStockCount = useMemo(
    () =>
      inventoryProducts.filter((p) => getAvailableStock(p, inventoryProducts) <= 3)
        .length,
    [inventoryProducts],
  );

  const exportProductsCsvBySource = (
    sourceRaw: Product[],
    params: { mode: "all" | "filtered"; search?: string; branchName?: string },
  ) => {
    const source = sourceRaw as Product[];
    if (!source.length) return;

    const esc = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = [
      "id",
      "название",
      "штрихкод",
      "категории",
      "филиал",
      "поставщик",
      "тип",
      "цена",
      "себестоимость",
      "услуга_менеджера",
      "остаток_фактический",
      "остаток_доступный",
      "комбо_состав",
      "фото",
      "характеристики",
    ];

    const rows = source.map((p) => {
      const categories = (p.categories && p.categories.length ? p.categories : [p.category])
        .filter(Boolean)
        .join("|");
      const comboItems = (p.comboItems || [])
        .map((x) => `${x.productId}:${Number(x.quantity || 0)}`)
        .join("|");
      const photos = (p.photoUrls && p.photoUrls.length ? p.photoUrls : p.photoUrl ? [p.photoUrl] : [])
        .filter(Boolean)
        .join("|");
      const available = getAvailableStock(
        p as unknown as WarehouseProduct,
        source as unknown as WarehouseProduct[],
      );
      return [
        p.id,
        p.name,
        p.barcode || "",
        categories,
        p.branchName || "",
        p.supplier || "",
        p.isCombo ? "combo" : "regular",
        Number(p.sellingPrice || 0),
        Number(p.costPrice || 0),
        Number(p.managerEarnings || 0),
        Number(p.stockQty || 0),
        Number(available || 0),
        comboItems,
        photos,
        p.characteristics || "",
      ];
    });

    const now = new Date();
    const searchText = String(params.search || "").trim();
    const metaRows = [
      ["тип_экспорта", params.mode],
      ["поиск", searchText || "—"],
      ["филиал", params.branchName || "все"],
      ["кол-во_товаров", String(source.length)],
      ["дата_выгрузки", now.toISOString()],
      [],
    ];

    const csv = [...metaRows, header, ...rows]
      .map((r) => r.map(esc).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const slugify = (v: string) =>
      v
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9а-яё_-]/gi, "")
        .slice(0, 40);
    const searchPart = searchText ? `-search-${slugify(searchText)}` : "-search-all-visible";
    const branchPart = params.branchName ? `-branch-${slugify(params.branchName)}` : "-branch-all";
    link.download = `products-${params.mode}${searchPart}${branchPart}-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const branchScopedProducts = useMemo(
    () =>
      (branchName
        ? allProducts.filter((p) => !p.branchName || p.branchName === branchName)
        : allProducts) as Product[],
    [allProducts, branchName],
  );

  const filteredDetailedProducts = useMemo(() => {
    // Export must match current table rows (current search/filter result).
    const byId = new Map(branchScopedProducts.map((p) => [p.id, p]));
    return inventoryProducts.map((p) => {
      const full = byId.get(p.id);
      return (full || p) as Product;
    });
  }, [inventoryProducts, branchScopedProducts]);

  return (
    <div className="animate-fade-in space-y-4">
      <WarehouseProductsCard
        products={inventoryProducts}
        filteredCount={filteredDetailedProducts.length}
        lowStockCount={lowStockCount}
        search={search}
        branchName={branchName}
        canManageProducts={canManageProducts}
        importLoading={importLoading}
        onSearchChange={setSearch}
        onOpenMovement={() => setMovementOpen(true)}
        onCreateProduct={onCreateProduct}
        onEditProduct={onEditProduct}
        onImportProducts={onImportProducts}
        onExportProducts={() =>
          exportProductsCsvBySource(branchScopedProducts, {
            mode: "all",
            search,
            branchName,
          })
        }
        onExportFilteredProducts={() =>
          exportProductsCsvBySource(filteredDetailedProducts, {
            mode: "filtered",
            search,
            branchName,
          })
        }
        onDeleteProduct={(id) => deleteProduct.mutate(id)}
        getAvailableStock={(product, products) =>
          getAvailableStock(product as WarehouseProduct, products as WarehouseProduct[])
        }
      />

      <WarehouseMovementsSection
        inventoryMovements={inventoryMovements}
        inventoryProducts={inventoryProducts}
        movementOpen={movementOpen}
        movementForm={movementForm}
        selectedOperationType={selectedOperationType}
        submitLoading={createInventoryMovement.isPending}
        operationMeta={INVENTORY_OPERATION_META}
        formatDate={formatDate}
        resolveOperationType={(movement) =>
          resolveOperationType(
            movement as InventoryMovement,
            INVENTORY_OPERATION_META,
          ) as InventoryOperationType
        }
        formatMovementQty={(movement) =>
          formatMovementQty(movement as InventoryMovement)
        }
        getAvailableStock={(product, products) =>
          getAvailableStock(product as WarehouseProduct, products as WarehouseProduct[])
        }
        onOpenChange={setMovementOpen}
        onOperationTypeChange={(value) => {
          const nextType = INVENTORY_OPERATION_META[value]?.defaultType || "adjustment";
          movementForm.setFieldValue("type", nextType);
        }}
        onSubmit={(values: {
          productId: string;
          type: InventoryType;
          operationType: InventoryOperationType;
          quantity: number;
          reason?: string;
        }) => {
          const operationLabel = INVENTORY_OPERATION_META[values.operationType]?.label;
          createInventoryMovement.mutate(
            {
              productId: values.productId,
              type: values.type,
              operationType: values.operationType,
              quantity: Number(values.quantity || 0),
              branchName,
              reason: values.reason || operationLabel,
              actorId: user.id,
              actorName: user.name,
            },
            {
              onSuccess: () => {
                setMovementOpen(false);
                movementForm.resetFields();
              },
            },
          );
        }}
      />
    </div>
  );
};
