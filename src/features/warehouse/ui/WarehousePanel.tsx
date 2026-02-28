import { Form } from "antd";
import { useMemo, useState } from "react";
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

  return (
    <div className="animate-fade-in space-y-4">
      <WarehouseProductsCard
        products={inventoryProducts}
        lowStockCount={lowStockCount}
        search={search}
        canManageProducts={canManageProducts}
        importLoading={importLoading}
        onSearchChange={setSearch}
        onOpenMovement={() => setMovementOpen(true)}
        onCreateProduct={onCreateProduct}
        onEditProduct={onEditProduct}
        onImportProducts={onImportProducts}
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
