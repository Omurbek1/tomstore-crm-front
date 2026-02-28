import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { CashShift, CashShiftReport } from "./types";

export const useCurrentCashShift = (cashierId?: string) =>
  useQuery({
    queryKey: ["cash-shifts", "current", cashierId],
    enabled: Boolean(cashierId),
    queryFn: async () => {
      const { data } = await api.get<CashShift | null>("/cash-shifts/current", {
        params: { cashierId },
      });
      return data;
    },
  });

export const useCashShiftReport = (shiftId?: string) =>
  useQuery({
    queryKey: ["cash-shifts", "report", shiftId],
    enabled: Boolean(shiftId),
    queryFn: async () => {
      const { data } = await api.get<CashShiftReport>(`/cash-shifts/${shiftId}/report`);
      return data;
    },
  });

export const useOpenCashShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      cashierId: string;
      cashierName: string;
      branchName?: string;
      openingCash?: number;
      noteOpen?: string;
    }) => {
      const { data } = await api.post<CashShift>("/cash-shifts/open", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-shifts"] });
      message.success("Смена открыта");
    },
  });
};

export const useCloseCashShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        closingCash?: number;
        noteClose?: string;
      };
    }) => {
      const { data } = await api.post<CashShift>(`/cash-shifts/${id}/close`, payload);
      return data;
    },
    onSuccess: (shift) => {
      queryClient.invalidateQueries({ queryKey: ["cash-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      const shortage = Math.max(0, Number(shift.shortageAmount || 0));
      const debtAfter = Math.max(0, Number(shift.debtAfter || 0));
      if (shortage > 0) {
        message.warning(
          `Смена закрыта. Недостача: ${shortage.toLocaleString()} c. Долг кассира: ${debtAfter.toLocaleString()} c`,
        );
      } else {
        message.success("Смена закрыта");
      }
    },
  });
};
