import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Manager, ManagerPayoutBalance } from "./types";

const nowIso = () => new Date().toISOString();

export const useManagers = () =>
  useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const { data } = await api.get<Manager[]>("/users");
      return data.filter((m) => !m.deleted);
    },
  });

export const useManagersPayoutMeta = (managerIds: string[]) => {
  const stableIds = useMemo(() => [...managerIds].filter(Boolean).sort(), [managerIds]);

  return useQuery({
    queryKey: ["manager-payout-meta", stableIds.join(",")],
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        stableIds.map(async (id) => {
          const { data } = await api.get<ManagerPayoutBalance>(`/users/${id}/payout-balance`);
          return data;
        }),
      );
      return results.reduce<Record<string, ManagerPayoutBalance>>((acc, item) => {
        acc[item.managerId] = item;
        return acc;
      }, {});
    },
  });
};

export const useDeletedManagers = () =>
  useQuery({
    queryKey: ["deleted-managers"],
    queryFn: async () => {
      const { data } = await api.get<Manager[]>("/users/deleted");
      return data.filter((m) => m.role !== "admin");
    },
  });

export const useCreateManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Manager>) => {
      const { data: created } = await api.post<Manager>("/auth/register", data);
      return created;
    },
    onSuccess: (created) => {
      if (created) {
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => [created, ...prev.filter((m) => m.id !== created.id)]);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      message.success("Сотрудник добавлен");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось добавить сотрудника");
    },
  });
};

export const useUpdateManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Manager> }) => {
      const { data: updated } = await api.patch<Manager>(`/users/${id}`, data);
      return updated;
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
        );
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      message.success("Сотрудник обновлен");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось обновить сотрудника");
    },
  });
};

export const useDeleteManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: (_data, id) => {
      let removedManager: Manager | undefined;
      queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => {
        removedManager = prev.find((m) => m.id === id);
        return prev.filter((m) => m.id !== id);
      });
      if (removedManager) {
        const deletedSnapshot: Manager = { ...removedManager, deleted: true, updatedAt: nowIso() };
        queryClient.setQueryData<Manager[]>(["deleted-managers"], (prev = []) => [
          deletedSnapshot,
          ...prev.filter((m) => m.id !== id),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-managers"] });
      message.success("Сотрудник удален");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || "Не удалось удалить сотрудника");
    },
  });
};

export const useRestoreManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/users/${id}/restore`);
    },
    onSuccess: (_data, id) => {
      let restoredManager: Manager | undefined;
      queryClient.setQueryData<Manager[]>(["deleted-managers"], (prev = []) =>
        prev.filter((m) => {
          if (m.id === id) restoredManager = m;
          return m.id !== id;
        }),
      );
      if (restoredManager) {
        const restoredSnapshot: Manager = { ...restoredManager, deleted: false, updatedAt: nowIso() };
        queryClient.setQueryData<Manager[]>(["managers"], (prev = []) => [
          restoredSnapshot,
          ...prev.filter((m) => m.id !== id),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-managers"] });
      message.success("Сотрудник восстановлен");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || "Не удалось восстановить сотрудника");
    },
  });
};
