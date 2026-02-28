import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Bonus, Expense } from "./types";

export const useBonuses = () =>
  useQuery({
    queryKey: ["bonuses"],
    queryFn: async () => {
      const { data } = await api.get<Bonus[]>("/bonuses");
      return data;
    },
  });

export const useExpenses = () =>
  useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await api.get<Expense[]>("/expenses");
      return data;
    },
  });

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: "bonus" | "expense"; payload: Record<string, unknown> }) => {
      const endpoint = data.type === "bonus" ? "/bonuses" : "/expenses";
      await api.post(endpoint, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["manager-payout-meta"] });
      message.success("Транзакция сохранена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось сохранить транзакцию");
    },
  });
};
