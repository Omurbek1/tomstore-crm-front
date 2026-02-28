import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { BonusTarget } from "./types";

export const useTargets = () =>
  useQuery({
    queryKey: ["targets"],
    queryFn: async () => {
      const { data } = await api.get<BonusTarget[]>("/targets");
      return data;
    },
  });

export const useCreateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BonusTarget>) => {
      await api.post("/targets", data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["targets"] }),
  });
};

export const useDeleteTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/targets/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["targets"] }),
  });
};

export const useIssueTargetReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; approvedBy?: string }) => {
      const { data } = await api.post(`/targets/${params.id}/issue-reward`, {
        approvedBy: params.approvedBy,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      queryClient.invalidateQueries({ queryKey: ["bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["manager-payout-meta"] });
      message.success("Бонус по цели выдан");
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось выдать бонус по цели");
    },
  });
};
