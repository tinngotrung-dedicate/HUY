import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { createLocalRagModel } from "./local-rag-model";

const THINKING_SUFFIX_REGEX = /-thinking$/;
const gatewayKey = process.env.AI_GATEWAY_API_KEY ?? "";
const gatewayConfigured =
  Boolean(gatewayKey) && !["****", "changeme"].includes(gatewayKey);

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (modelId === "local-rag") {
    return createLocalRagModel();
  }

  if (!gatewayConfigured) {
    return createLocalRagModel();
  }

  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const gatewayModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");

    return wrapLanguageModel({
      model: gateway.languageModel(gatewayModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  if (!gatewayConfigured) {
    return createLocalRagModel();
  }
  return gateway.languageModel("google/gemini-2.5-flash-lite");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  if (!gatewayConfigured) {
    return createLocalRagModel();
  }
  return gateway.languageModel("anthropic/claude-haiku-4.5");
}
