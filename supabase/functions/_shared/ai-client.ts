/**
 * Shared AI provider helpers.
 *
 * Replaces the Lovable AI gateway (ai.gateway.lovable.dev) with direct provider calls.
 * - Text / tool / vision: Anthropic Messages API (ANTHROPIC_API_KEY)
 * - Audio transcription: OpenAI Whisper (OPENAI_API_KEY)
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const OPENAI_TRANSCRIPTION_API = "https://api.openai.com/v1/audio/transcriptions";
const ANTHROPIC_VERSION = "2023-06-01";

/** Fast, cheap model for short completions, translation, classification */
export const MODEL_HAIKU = "claude-haiku-4-5-20251001";
/** Capable model for tool calling, vision, long analysis */
export const MODEL_SONNET = "claude-sonnet-4-6";

function getAnthropicHeaders(): Record<string, string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return {
    "x-api-key": key,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  };
}

/**
 * Simple text completion.
 * Returns the assistant message text string.
 */
export async function callAnthropic(
  system: string,
  userMessage: string,
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model ?? MODEL_HAIKU,
    max_tokens: options.maxTokens ?? 1024,
    system,
    messages: [{ role: "user", content: userMessage }],
  };
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: getAnthropicHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
  if (!textBlock) throw new Error("No text content in Anthropic response");
  return (textBlock as { text: string }).text;
}

/**
 * Tool use with a single forced tool.
 * Returns the tool input object (already a parsed object — NOT a JSON string).
 */
export async function callAnthropicWithTool<T = Record<string, unknown>>(
  system: string,
  userMessage: string,
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  },
  options: { model?: string; maxTokens?: number } = {}
): Promise<T> {
  const body = {
    model: options.model ?? MODEL_SONNET,
    max_tokens: options.maxTokens ?? 1024,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  };

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: getAnthropicHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolBlock = (data.content ?? []).find(
    (b: { type: string }) => b.type === "tool_use"
  );
  if (!toolBlock) throw new Error("No tool_use block in Anthropic response");
  // Anthropic returns .input as an already-parsed object, not a JSON string
  return (toolBlock as { input: T }).input;
}

/**
 * Vision call with a single forced tool.
 * imageUrl must be a publicly accessible URL.
 * Returns the tool input object (already parsed).
 */
export async function callAnthropicVisionWithTool<T = Record<string, unknown>>(
  system: string,
  textPrompt: string,
  imageUrl: string,
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  },
  options: { model?: string; maxTokens?: number } = {}
): Promise<T> {
  const body = {
    model: options.model ?? MODEL_SONNET,
    max_tokens: options.maxTokens ?? 1024,
    system,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: textPrompt },
          { type: "image", source: { type: "url", url: imageUrl } },
        ],
      },
    ],
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  };

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: getAnthropicHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolBlock = (data.content ?? []).find(
    (b: { type: string }) => b.type === "tool_use"
  );
  if (!toolBlock) throw new Error("No tool_use block in Anthropic response");
  return (toolBlock as { input: T }).input;
}

/**
 * Audio transcription via OpenAI Whisper.
 * audioBase64: raw base64 string (no data: prefix).
 * mimeType: e.g. "audio/mp4", "audio/webm", "audio/wav"
 * Returns the transcript string.
 */
export async function transcribeWithWhisper(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

  const ext = mimeType?.includes("mp4")
    ? "mp4"
    : mimeType?.includes("webm")
    ? "webm"
    : "wav";

  // Decode base64 to Uint8Array
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioBlob = new Blob([bytes], { type: mimeType || "audio/wav" });
  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "nl");

  const response = await fetch(OPENAI_TRANSCRIPTION_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Whisper error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return (data.text as string) ?? "";
}
