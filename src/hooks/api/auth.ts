import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import { useAppStore } from "../../store/appStore";
import type { AuthResponse, Manager } from "./types";

export const useLogin = () => {
  const { setUser, setAppTheme } = useAppStore();
  return useMutation({
    mutationFn: async (credentials: { login: string; password: string }) => {
      const { data } = await api.post<AuthResponse>("/auth/login", credentials);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.accessToken);
      setUser(data.user);
      if (data.user.theme) setAppTheme(data.user.theme);
      message.success(`Добро пожаловать, ${data.user.name}!`);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || "Ошибка входа");
    },
  });
};

export const useUpdateProfile = () => {
  const { user, setUser } = useAppStore();
  return useMutation({
    mutationFn: async (data: Partial<Manager>) => {
      const { data: updated } = await api.patch(`/users/${user?.id}`, data);
      return updated as Manager;
    },
    onSuccess: (data) => {
      setUser(data);
      message.success("Профиль обновлен");
    },
  });
};
