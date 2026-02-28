import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { PaginatedTasks, Task, TaskPriority, TaskStatus } from "./types";

export const useTasks = (params?: {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  limit?: number;
  offset?: number;
}) => {
  const normalizedParams = useMemo(
    () => ({
      q: params?.q || "",
      status: params?.status || "",
      priority: params?.priority || "",
      assigneeId: params?.assigneeId || "",
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    }),
    [
      params?.q,
      params?.status,
      params?.priority,
      params?.assigneeId,
      params?.limit,
      params?.offset,
    ],
  );

  return useQuery({
    queryKey: ["tasks", normalizedParams],
    queryFn: async (): Promise<PaginatedTasks> => {
      const { data } = await api.get<PaginatedTasks>("/tasks", {
        params: {
          q: normalizedParams.q || undefined,
          status: normalizedParams.status || undefined,
          priority: normalizedParams.priority || undefined,
          assigneeId: normalizedParams.assigneeId || undefined,
          limit: normalizedParams.limit,
          offset: normalizedParams.offset,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      assigneeId?: string;
      assigneeName?: string;
      assigneeRole?: string;
      deadline?: string;
      priority?: TaskPriority;
      createdById?: string;
      createdByName?: string;
    }) => {
      const { data } = await api.post<Task>("/tasks", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Задача создана");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось создать задачу");
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        title: string;
        description: string;
        assigneeId: string;
        assigneeName: string;
        assigneeRole: string;
        deadline: string | null;
        priority: TaskPriority;
        status: TaskStatus;
      }>;
    }) => {
      const { data: updated } = await api.patch<Task>(`/tasks/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Задача обновлена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось обновить задачу");
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Задача удалена");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось удалить задачу");
    },
  });
};
