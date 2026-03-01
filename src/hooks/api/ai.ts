import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { api } from "../../api/httpClient";
import type {
  AiAnalyzeRequest,
  AiAnalyzeResult,
  AiMaterialsHelpRequest,
  AiMaterialsHelpResult,
  AiMarketingPlanDraftRequest,
  AiMarketingPlanDraftResult,
  AiOrderDraftRequest,
  AiOrderDraftResult,
  AiTasksDraftRequest,
  AiTasksDraftResult,
} from "./types";

export const useAiAnalyze = () =>
  useMutation({
    mutationFn: async (payload: AiAnalyzeRequest) => {
      const { data } = await api.post<AiAnalyzeResult>("/ai/analyze", payload);
      return data;
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "AI анализ недоступен");
    },
  });

export const useAiTasksDraft = () =>
  useMutation({
    mutationFn: async (payload: AiTasksDraftRequest) => {
      const { data } = await api.post<AiTasksDraftResult>("/ai/tasks-draft", payload);
      return data;
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось сгенерировать задачи через ИИ");
    },
  });

export const useAiMarketingPlanDraft = () =>
  useMutation({
    mutationFn: async (payload: AiMarketingPlanDraftRequest) => {
      const { data } = await api.post<AiMarketingPlanDraftResult>("/ai/marketing-plan-draft", payload);
      return data;
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось разобрать маркетинг-план через ИИ");
    },
  });

export const useAiMaterialsHelp = () =>
  useMutation({
    mutationFn: async (payload: AiMaterialsHelpRequest) => {
      const { data } = await api.post<AiMaterialsHelpResult>("/ai/materials-help", payload);
      return data;
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось получить ответ ИИ по материалам");
    },
  });

export const useAiOrderDraft = () =>
  useMutation({
    mutationFn: async (payload: AiOrderDraftRequest) => {
      const { data } = await api.post<AiOrderDraftResult>("/ai/order-draft", payload);
      return data;
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      message.error(error.response?.data?.message || error.message || "Не удалось распознать заказ через ИИ");
    },
  });
