import { AzureOpenAI } from "openai";
import createClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

// --- CONFIGURATION ---

const apiKey = process.env.AZURE_OPENAI_KEY as string;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION as string;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT as string;

const azureAIApiKey = process.env.AZURE_AI_API_KEY as string;

const anthropicApiKey = process.env.AZURE_ANTHROPIC_API_KEY as string;
const anthropicEndpoint = process.env.AZURE_ANTHROPIC_ENDPOINT as string;

// --- CLIENTS ---

const openaiClient = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion,
  deployment,
});

// --- MODEL ROUTING LOGIC ---

const SERVERLESS_ENDPOINTS = {
  "grok-3-mini": process.env.GROK_3_MINI_ENDPOINT,
  "deepseek-v3": process.env.DEEPSEEK_V3_ENDPOINT,
  "grok-3": process.env.GROK_3_ENDPOINT,
} as const;

type AzureServerlessModel = keyof typeof SERVERLESS_ENDPOINTS;

function isServerlessModel(model: string): model is AzureServerlessModel {
  return model in SERVERLESS_ENDPOINTS;
}

function isAnthropicModel(model: string): boolean {
  return model.toLowerCase().includes("claude");
}

// --- GENERATION FUNCTIONS ---

async function generateWithServerless(
  prompt: string,
  model: AzureServerlessModel,
  temperature: number,
  max_tokens: number
): Promise<string> {
  const endpoint = SERVERLESS_ENDPOINTS[model];
  if (!endpoint) throw new Error(`No endpoint for model: ${model}`);

  const client = createClient(endpoint, new AzureKeyCredential(azureAIApiKey));
  const response = await client.path("/chat/completions").post({
    body: {
      messages: [{ role: "user", content: prompt }],
      max_tokens,
      temperature,
      top_p: 1,
      model,
    },
  });

  if (response.status !== "200") throw response.body;
  const body = response.body as {
    choices: { message: { content: string } }[];
  };
  return body.choices[0].message.content;
}

interface AnthropicContent {
  type: string;
  text: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  error?: { message: string };
}

async function generateWithAnthropicREST(
  prompt: string,
  model: string,
  temperature: number,
  max_tokens: number
): Promise<string> {
  const baseUrl = anthropicEndpoint?.endsWith("/")
    ? anthropicEndpoint.slice(0, -1)
    : anthropicEndpoint;

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic REST Error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content?.find((c) => c.type === "text");
  if (textBlock) return textBlock.text;
  throw new Error(
    `Unexpected response structure from Anthropic: ${JSON.stringify(data)}`
  );
}

async function generateWithAzureOpenAI(
  prompt: string,
  model: string,
  _temperature: number,
  max_tokens: number
): Promise<string> {
  // Newer Azure OpenAI models (gpt-4.1, gpt-5+) do not accept `temperature` —
  // omit it entirely to avoid 400 errors.
  const response = await openaiClient.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: max_tokens,
    model,
  });
  return response?.choices[0]?.message?.content as string;
}

// --- MAIN EXPORT ---

export async function generateChatCompletionWithModel(
  prompt: string,
  model: string = "gpt-4.1",
  temperature: number = 0.3,
  max_tokens: number = 16000
): Promise<string> {
  if (isServerlessModel(model)) {
    return generateWithServerless(prompt, model, temperature, max_tokens);
  } else if (isAnthropicModel(model)) {
    return generateWithAnthropicREST(prompt, model, temperature, max_tokens);
  } else {
    return generateWithAzureOpenAI(prompt, model, temperature, max_tokens);
  }
}
