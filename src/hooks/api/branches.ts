import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Branch } from "./types";

export const useBranches = () =>
  useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await api.get<Branch[]>("/branches");
      return data;
    },
  });

export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Branch>) => {
      const { data: created } = await api.post<Branch>("/branches", data);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      message.success("Филиал добавлен");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Ошибка создания филиала");
    },
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      message.success("Филиал удален");
    },
  });
};
