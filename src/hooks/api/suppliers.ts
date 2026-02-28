import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/httpClient";
import type { Supplier } from "./types";

export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await api.get<Supplier[]>("/suppliers");
      return data;
    },
  });

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      await api.post("/suppliers", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      const { data: updated } = await api.patch(`/suppliers/${id}`, data);
      return updated as Supplier;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};
