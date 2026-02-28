import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { MarketingKpi, PaginatedMarketingKpi } from "./types";

export const useMarketingKpi = (params?: {
  month?: string;
  managerId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) => {
  const normalized = useMemo(
    () => ({
      month: params?.month || "",
      managerId: params?.managerId || "",
      q: params?.q || "",
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    }),
    [params?.month, params?.managerId, params?.q, params?.limit, params?.offset],
  );

  return useQuery({
    queryKey: ["marketing-kpi", normalized],
    queryFn: async (): Promise<PaginatedMarketingKpi> => {
      const { data } = await api.get<PaginatedMarketingKpi>("/marketing-kpi", {
        params: {
          month: normalized.month || undefined,
          managerId: normalized.managerId || undefined,
          q: normalized.q || undefined,
          limit: normalized.limit,
          offset: normalized.offset,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
};

export const useCreateMarketingKpi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MarketingKpi>) => {
      const { data } = await api.post<MarketingKpi>("/marketing-kpi", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi"] });
      message.success("KPI запись добавлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Ошибка сохранения KPI");
    },
  });
};

export const useUpdateMarketingKpi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketingKpi> }) => {
      const { data: updated } = await api.patch<MarketingKpi>(`/marketing-kpi/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi"] });
      message.success("KPI запись обновлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Ошибка обновления KPI");
    },
  });
};
