import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { Sale } from "./types";

type SalesQuery = {
  managerId?: string;
  branch?: string;
  shiftId?: string;
  paymentType?: Sale["paymentType"];
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  all?: boolean;
  limit?: number;
  offset?: number;
};

export const useSales = (query?: SalesQuery) =>
  {
    const normalizedQuery = useMemo(
      () => ({
        all: query?.all ?? true,
        managerId: query?.managerId || "",
        branch: query?.branch || "",
        shiftId: query?.shiftId || "",
        paymentType: query?.paymentType || "",
        q: query?.q || "",
        dateFrom: query?.dateFrom || "",
        dateTo: query?.dateTo || "",
        limit: query?.limit ?? 0,
        offset: query?.offset ?? 0,
      }),
      [
        query?.all,
        query?.managerId,
        query?.branch,
        query?.shiftId,
        query?.paymentType,
        query?.q,
        query?.dateFrom,
        query?.dateTo,
        query?.limit,
        query?.offset,
      ],
    );

    return useQuery({
      queryKey: ["sales", normalizedQuery],
      queryFn: async () => {
        const { data } = await api.get<Sale[]>("/sales", {
          params: {
            all: normalizedQuery.all ? 1 : undefined,
            managerId: normalizedQuery.managerId || undefined,
            branch: normalizedQuery.branch || undefined,
            shiftId: normalizedQuery.shiftId || undefined,
            paymentType: normalizedQuery.paymentType || undefined,
            q: normalizedQuery.q || undefined,
            dateFrom: normalizedQuery.dateFrom || undefined,
            dateTo: normalizedQuery.dateTo || undefined,
            limit: normalizedQuery.limit || undefined,
            offset: normalizedQuery.offset || undefined,
          },
        });
        return data;
      },
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
      placeholderData: keepPreviousData,
    });
  };

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Partial<Sale>) => {
      const { data } = await api.post("/sales", sale);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      message.success("Продажа создана");
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Sale> }) => {
      const { data: updated } = await api.patch(`/sales/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа обновлена");
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      message.success("Продажа удалена");
    },
  });
};
