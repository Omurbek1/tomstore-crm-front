import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Product, ProductCategory } from "./types";

export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get<Product[]>("/products", {
        params: { all: 1 },
      });
      return data;
    },
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

export const useProductCategories = () =>
  useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await api.get<ProductCategory[]>("/products/categories");
      return data;
    },
  });

export const useCreateProductCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Название категории обязательно");
      const { data } = await api.post<ProductCategory>("/products/categories", { name: trimmed });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      message.success("Категория добавлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Ошибка добавления категории");
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await api.post("/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      message.success("Товар добавлен");
    },
  });
};

export const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { file: File; branchName?: string }) => {
      const formData = new FormData();
      formData.append("file", params.file);
      if (params.branchName) formData.append("branchName", params.branchName);
      const { data } = await api.post<{ totalRows: number; created: number; skipped: number; errors: string[] }>(
        "/products/import",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      const base = `Импорт завершен: добавлено ${result.created}, пропущено ${result.skipped}`;
      if (result.errors?.length) message.warning(`${base}. Ошибок: ${result.errors.length}`);
      else message.success(base);
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Ошибка импорта товаров");
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { data: updated } = await api.patch<Product>(`/products/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      message.success("Товар обновлен");
    },
  });
};
