import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type {
  PaginatedWorkTimeEntries,
  WorkTimeAutomationStatus,
  WorkTimeEntry,
  WorkTimeSummary,
} from "./types";

export const useWorkTimeEntries = (params?: {
  startDate?: string;
  endDate?: string;
  managerId?: string;
  limit?: number;
  offset?: number;
}) =>
  useQuery({
    queryKey: ["work-time", params || {}],
    queryFn: async () => {
      const { data } = await api.get<PaginatedWorkTimeEntries>("/work-time", {
        params: {
          startDate: params?.startDate || undefined,
          endDate: params?.endDate || undefined,
          managerId: params?.managerId || undefined,
          limit: params?.limit ?? 200,
          offset: params?.offset ?? 0,
        },
      });
      return data;
    },
  });

export const useWorkTimeSummary = (params?: {
  startDate?: string;
  endDate?: string;
  managerId?: string;
}) =>
  useQuery({
    queryKey: ["work-time-summary", params || {}],
    queryFn: async () => {
      const { data } = await api.get<WorkTimeSummary>("/work-time/summary", {
        params: {
          startDate: params?.startDate || undefined,
          endDate: params?.endDate || undefined,
          managerId: params?.managerId || undefined,
        },
      });
      return data;
    },
  });

export const useWorkTimeAutomationStatus = () =>
  useQuery({
    queryKey: ["work-time-automation-status"],
    queryFn: async () => {
      const { data } = await api.get<WorkTimeAutomationStatus>("/work-time/automation/status");
      return data;
    },
    refetchInterval: 60_000,
  });

export const useRunWorkTimeAutomation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: { force?: boolean; date?: string }) => {
      const { data } = await api.post<{
        success: boolean;
        forced: boolean;
        result: {
          date: string;
          createdLateTasks: number;
          createdKpiTasks: number;
          reportCreated: boolean;
        };
      }>("/work-time/automation/run-daily", payload || { force: true });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["work-time-automation-status"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const totalTasks =
        Number(data?.result?.createdLateTasks || 0) + Number(data?.result?.createdKpiTasks || 0);
      message.success(`Автоконтроль выполнен: создано задач ${totalTasks}`);
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось запустить автоконтроль");
    },
  });
};

export const useCreateWorkTimeEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WorkTimeEntry>) => {
      const { data } = await api.post<WorkTimeEntry>("/work-time", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-time"] });
      queryClient.invalidateQueries({ queryKey: ["work-time-summary"] });
      message.success("Запись учёта времени добавлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось добавить запись");
    },
  });
};

export const useUpdateWorkTimeEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<WorkTimeEntry> }) => {
      const { data } = await api.patch<WorkTimeEntry>(`/work-time/${params.id}`, params.data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-time"] });
      queryClient.invalidateQueries({ queryKey: ["work-time-summary"] });
      message.success("Запись учёта времени обновлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось обновить запись");
    },
  });
};

export const useDeleteWorkTimeEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/work-time/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-time"] });
      queryClient.invalidateQueries({ queryKey: ["work-time-summary"] });
      message.success("Запись учёта времени удалена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось удалить запись");
    },
  });
};
