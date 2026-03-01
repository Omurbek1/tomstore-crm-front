import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/httpClient";
import type { Client, ClientHistory, ClientPromotion } from "./types";

export const useClients = (params?: { q?: string; activeOnly?: boolean }) =>
  useQuery({
    queryKey: ["clients", params?.q || "", params?.activeOnly ? "1" : "0"],
    queryFn: async () => {
      const { data } = await api.get<Client[]>("/clients", {
        params: {
          q: params?.q || undefined,
          activeOnly: params?.activeOnly ? "1" : undefined,
        },
      });
      return data;
    },
  });

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Client>) => {
      const { data } = await api.post<Client>("/clients", payload);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const { data: updated } = await api.patch<Client>(`/clients/${id}`, data);
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useClientHistory = (clientId?: string) =>
  useQuery({
    queryKey: ["client-history", clientId || ""],
    enabled: !!clientId,
    queryFn: async () => {
      const { data } = await api.get<ClientHistory>(`/clients/${clientId}/history`);
      return data;
    },
  });

export const useClientPromotions = (clientId?: string) =>
  useQuery({
    queryKey: ["client-promotions", clientId || "all"],
    queryFn: async () => {
      const { data } = await api.get<ClientPromotion[]>("/clients/promotions/list", {
        params: { clientId: clientId || undefined },
      });
      return data;
    },
  });

export const useCreateClientPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ClientPromotion>) => {
      const { data } = await api.post<ClientPromotion>("/clients/promotions", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
    },
  });
};

export const useUpdateClientPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientPromotion> }) => {
      const { data: updated } = await api.patch<ClientPromotion>(`/clients/promotions/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
    },
  });
};

export const useDeleteClientPromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-promotions"] });
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
    },
  });
};

export const useSendClientSms = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const { data } = await api.post<{ success: boolean }>(`/clients/${id}/sms`, { message });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-history"] }),
  });
};
