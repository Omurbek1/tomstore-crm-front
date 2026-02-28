import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { PaginatedRepairs, RepairStatus, RepairTicket } from "./types";

export const useRepairs = (params?: {
  q?: string;
  limit?: number;
  offset?: number;
}) =>
  useQuery({
    queryKey: ["repairs", params],
    queryFn: async (): Promise<PaginatedRepairs> => {
      const { data } = await api.get<PaginatedRepairs>("/repairs", { params });
      return data;
    },
  });

export const useCreateRepairTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      clientName: string;
      clientPhone?: string;
      itemName: string;
      serialNumber?: string;
      issue: string;
      branchName?: string;
      author?: string;
      initialMessage?: string;
    }) => {
      const { data } = await api.post<RepairTicket>("/repairs", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      message.success("Заявка на ремонт создана");
    },
  });
};

export const useCreateRepairEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        text: string;
        author?: string;
        status?: RepairStatus;
      };
    }) => {
      const { data } = await api.post<RepairTicket>(`/repairs/${id}/events`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
    },
  });
};

export const useUpdateRepairStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        status: RepairStatus;
        author?: string;
        text?: string;
      };
    }) => {
      const { data } = await api.patch<RepairTicket>(`/repairs/${id}/status`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
    },
  });
};
