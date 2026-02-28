import { message } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/httpClient";
import type {
  InventoryOperationType,
  InventoryType,
} from "../../../shared/constants/inventory";

type ComboItem = { productId: string; quantity: number };

export type WarehouseProduct = {
  id: string;
  name: string;
  branchName?: string;
  supplier?: string;
  sellingPrice: number;
  isCombo?: boolean;
  stockQty?: number;
  comboItems?: ComboItem[] | null;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  branchName?: string;
  type: InventoryType;
  operationType?: InventoryOperationType;
  quantity: number;
  stockAfter: number;
  reason?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
};

export const useInventoryProducts = (search: string, branchName?: string) => {
  return useQuery({
    queryKey: ["inventory-products", search, branchName || "all"],
    queryFn: async () => {
      const { data } = await api.get<WarehouseProduct[]>("/inventory/products", {
        params: {
          ...(search.trim() ? { q: search.trim() } : {}),
          ...(branchName?.trim() ? { branchName: branchName.trim() } : {}),
        },
      });
      return data;
    },
  });
};

export const useInventoryMovements = (productId?: string, branchName?: string) => {
  return useQuery({
    queryKey: ["inventory-movements", productId || "all", branchName || "all"],
    queryFn: async () => {
      const { data } = await api.get<InventoryMovement[]>("/inventory/movements", {
        params: {
          ...(productId ? { productId } : {}),
          ...(branchName?.trim() ? { branchName: branchName.trim() } : {}),
        },
      });
      return data;
    },
  });
};

export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: string;
      type: InventoryType;
      operationType?: InventoryOperationType;
      quantity: number;
      branchName?: string;
      reason?: string;
      actorId?: string;
      actorName?: string;
    }) => {
      const { data } = await api.post<InventoryMovement>(
        "/inventory/movements",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      message.success("Движение сохранено");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(
        error.response?.data?.message || error.message || "Ошибка операции склада",
      );
    },
  });
};

export const useDeleteWarehouseProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      message.success("Товар удален");
    },
  });
};
