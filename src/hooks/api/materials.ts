import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo } from "react";
import { api } from "../../api/httpClient";
import type {
  PaginatedMaterials,
  TrainingMaterial,
  TrainingMaterialFolder,
} from "../../entities/material/model/types";

export const useMaterialFolders = () =>
  useQuery({
    queryKey: ["material-folders"],
    queryFn: async () => {
      const { data } = await api.get<{ items: TrainingMaterialFolder[]; total: number }>(
        "/materials/folders",
      );
      return data;
    },
  });

export const useMaterials = (params: {
  folderId?: string;
  q?: string;
  includeDrafts?: boolean;
  limit?: number;
  offset?: number;
}) =>
  {
    const normalizedParams = useMemo(
      () => ({
        folderId: params?.folderId || "",
        q: params?.q || "",
        includeDrafts: Boolean(params?.includeDrafts),
        limit: params?.limit ?? 20,
        offset: params?.offset ?? 0,
      }),
      [
        params?.folderId,
        params?.q,
        params?.includeDrafts,
        params?.limit,
        params?.offset,
      ],
    );

    return useQuery({
      queryKey: ["materials", normalizedParams],
      queryFn: async (): Promise<PaginatedMaterials> => {
        const { data } = await api.get<PaginatedMaterials>("/materials", {
          params: {
            folderId: normalizedParams.folderId || undefined,
            q: normalizedParams.q || undefined,
            includeDrafts: normalizedParams.includeDrafts ? 1 : undefined,
            limit: normalizedParams.limit,
            offset: normalizedParams.offset,
          },
        });
        return data;
      },
      placeholderData: keepPreviousData,
    });
  };

export const useCreateMaterialFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TrainingMaterialFolder>) => {
      const { data } = await api.post<TrainingMaterialFolder>("/materials/folders", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Папка создана");
    },
  });
};

export const useDeleteMaterialFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      message.success("Папка удалена");
    },
  });
};

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TrainingMaterial>) => {
      const { data } = await api.post<TrainingMaterial>("/materials", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал добавлен");
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TrainingMaterial> }) => {
      const { data: updated } = await api.patch<TrainingMaterial>(`/materials/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал обновлен");
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-folders"] });
      message.success("Материал удален");
    },
  });
};
