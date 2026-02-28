import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Sale } from "./types";

export const useSales = () =>
  useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await api.get<Sale[]>("/sales");
      return data;
    },
  });

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Partial<Sale>) => {
      const { data } = await api.post("/sales", sale);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      message.success("Продажа создана");
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sale> }) => {
      const { data: updated } = await api.patch(`/sales/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа обновлена");
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа удалена");
    },
  });
};
