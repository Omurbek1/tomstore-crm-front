import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type { AppSettings } from "./types";

export const useAppSettings = () =>
  useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await api.get<AppSettings>("/settings");
      return data;
    },
  });

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AppSettings>) => {
      const { data } = await api.patch<AppSettings>("/settings", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      message.success("Настройки компании сохранены");
    },
  });
};
