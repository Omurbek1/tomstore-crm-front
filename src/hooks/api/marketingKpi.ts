import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type {
  MarketingAutomationReport,
  MarketingAutomationSchedule,
  MarketingAutomationStatus,
  MarketingKpi,
  MarketingKpiInsights,
  PaginatedMarketingKpi,
} from "./types";

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

export const useMarketingKpiInsights = (params?: {
  month?: string;
  managerId?: string;
  q?: string;
}) => {
  const normalized = useMemo(
    () => ({
      month: params?.month || "",
      managerId: params?.managerId || "",
      q: params?.q || "",
    }),
    [params?.month, params?.managerId, params?.q],
  );

  return useQuery({
    queryKey: ["marketing-kpi-insights", normalized],
    queryFn: async (): Promise<MarketingKpiInsights> => {
      const { data } = await api.get<MarketingKpiInsights>("/marketing-kpi/insights", {
        params: {
          month: normalized.month || undefined,
          managerId: normalized.managerId || undefined,
          q: normalized.q || undefined,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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

export const useMarketingAutomationStatus = (month?: string) =>
  useQuery({
    queryKey: ["marketing-kpi-automation-status", month || ""],
    queryFn: async (): Promise<MarketingAutomationStatus> => {
      const { data } = await api.get<MarketingAutomationStatus>("/marketing-kpi/automation/status", {
        params: { month: month || undefined },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

export const useSaveMarketingAutomationAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Array<{
        id?: string;
        managerId: string;
        managerName?: string;
        platform?: "instagram";
        accountHandle: string;
        isActive?: boolean;
        autoMarkChecklist?: boolean;
        autoSyncKpi?: boolean;
        weeklyPostsTarget?: number;
        weeklyReelsTarget?: number;
      }>,
    ) => {
      const { data } = await api.put("/marketing-kpi/automation/accounts", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi-automation-status"] });
      message.success("Настройки автопроверки сохранены");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось сохранить настройки автопроверки");
    },
  });
};

export const useRunMarketingAutomationDaily = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { force?: boolean; date?: string }) => {
      const { data } = await api.post("/marketing-kpi/automation/run-daily", payload || {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi-automation-status"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi"] });
      message.success("Ежедневная автопроверка выполнена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось запустить автопроверку");
    },
  });
};

export const useMarketingAutomationSchedule = () =>
  useQuery({
    queryKey: ["marketing-kpi-automation-schedule"],
    queryFn: async (): Promise<MarketingAutomationSchedule> => {
      const { data } = await api.get<MarketingAutomationSchedule>("/marketing-kpi/automation/schedule");
      return data;
    },
    placeholderData: keepPreviousData,
  });

export const useUpdateMarketingAutomationSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { timezone?: string; hour?: number; minute?: number }) => {
      const { data } = await api.patch<MarketingAutomationSchedule>("/marketing-kpi/automation/schedule", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi-automation-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-kpi-automation-status"] });
      message.success("Расписание автопроверки обновлено");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось обновить расписание автопроверки");
    },
  });
};

export const useMarketingAutomationReport = (params?: {
  month?: string;
  managerId?: string;
  period?: "week" | "month";
  date?: string;
}) =>
  useQuery({
    queryKey: [
      "marketing-kpi-automation-report",
      params?.month || "",
      params?.managerId || "",
      params?.period || "month",
      params?.date || "",
    ],
    queryFn: async (): Promise<MarketingAutomationReport> => {
      const { data } = await api.get<MarketingAutomationReport>("/marketing-kpi/automation/report", {
        params: {
          month: params?.month || undefined,
          managerId: params?.managerId || undefined,
          period: params?.period || undefined,
          date: params?.date || undefined,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
