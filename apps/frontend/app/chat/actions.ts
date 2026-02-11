"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const raw = getTextFromMessage(message).trim();
  const fallback = raw
    ? raw.split(/\r?\n/, 1)[0].slice(0, 60).trim()
    : "New chat";
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const gatewayConfigured =
    Boolean(gatewayKey) && gatewayKey !== "****" && gatewayKey !== "changeme";

  if (!gatewayConfigured && !isVercel) {
    return fallback;
  }

  try {
    const { text } = await generateText({
      model: getTitleModel(),
      system: titlePrompt,
      prompt: raw,
    });

    const cleaned = text
      .replace(/^[#*"\s]+/, "")
      .replace(/["]+$/, "")
      .trim();

    return cleaned || fallback;
  } catch (error) {
    console.warn("Title generation failed, using fallback title.", error);
    return fallback;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisibilityById({ chatId, visibility });
}
