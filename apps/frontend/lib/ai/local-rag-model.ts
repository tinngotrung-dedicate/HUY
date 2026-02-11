import type { LanguageModel } from "ai";

const defaultUsage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

function extractHistory(prompt: unknown): Array<{ role: string; content: string }> {
  const fallback = JSON.stringify(prompt);
  const promptAny = prompt as {
    messages?: Array<{
      role?: string;
      content?: string | Array<{ type?: string; text?: string }>;
    }>;
  };

  const messages = promptAny?.messages ?? [];
  const history: Array<{ role: string; content: string }> = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    if (!message?.role) {
      continue;
    }

    let content = "";

    if (typeof message.content === "string") {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content
        .map((part) => (part?.type === "text" ? part.text ?? "" : ""))
        .join("")
        .trim();
    }

    if (content) {
      history.push({ role: message.role, content });
    }
  }

  if (history.length === 0) {
    return [{ role: "user", content: fallback }];
  }

  return history;
}

async function fetchLocalAnswer(prompt: unknown): Promise<string> {
  const baseUrl = process.env.LOCAL_RAG_URL || "http://localhost:8008";
  const history = extractHistory(prompt);
  const lastUser = [...history].reverse().find((item) => item.role === "user");
  const message = lastUser?.content ?? JSON.stringify(prompt);
  const context = history.filter((item) => item !== lastUser);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.BACKEND_API_KEY) {
    headers["X-API-Key"] = process.env.BACKEND_API_KEY;
  }

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, history: context }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Local RAG error: ${response.status} ${text}`);
    }

    const json = (await response.json()) as { answer?: string };
    return json.answer ?? "";
  } catch (error) {
    console.warn("Local RAG not responding");
    return "LightRAG khong phan hoi. Kiem tra backend va GEMINI_API_KEY.";
  }
}

export const createLocalRagModel = (): LanguageModel => {
  return {
    specificationVersion: "v3",
    provider: "local-rag",
    modelId: "local-rag",
    defaultObjectGenerationMode: "tool",
    supportedUrls: {},
    doGenerate: async ({ prompt }: { prompt: unknown }) => {
      const answer = await fetchLocalAnswer(prompt);
      return {
        finishReason: "stop",
        usage: defaultUsage,
        content: [{ type: "text", text: answer }],
        warnings: [],
      };
    },
    doStream: ({ prompt }: { prompt: unknown }) => {
      return {
        stream: new ReadableStream({
          async start(controller) {
            const answer = await fetchLocalAnswer(prompt);
            const chunks = answer.split(" ");

            controller.enqueue({ type: "text-start", id: "t1" });
            for (const chunk of chunks) {
              controller.enqueue({
                type: "text-delta",
                id: "t1",
                delta: `${chunk} `,
              });
              await new Promise((resolve) => {
                setTimeout(resolve, 10);
              });
            }
            controller.enqueue({ type: "text-end", id: "t1" });
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: defaultUsage,
            });
            controller.close();
          },
        }),
      };
    },
  } as unknown as LanguageModel;
};
