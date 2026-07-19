/**
 * AI Service for analyzing website/API incidents using logs and system signals.
 * This service provides a structured analysis of incidents, including a summary,
 * root cause, and actionable solutions based on the provided logs.
 * This service uses a Mistral AI model to process incident logs and provide
 */

import { mistralAiModel } from '../ai/model.ai.js';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';

// Define the system prompt for the AI model to ensure it provides structured and relevant analysis
const systemPrompt = `You are a senior DevOps and Site Reliability Engineer (SRE).

Analyze the incident logs and respond in plain text ONLY.

Output format EXACTLY like this:

Summary:
<1-2 short lines>

Root Cause:
<clear and concise explanation>

Solution:
- step 1
- step 2
- step 3

Rules:
- Do NOT return JSON
- Do NOT use markdown code blocks
- Keep it short and clean
- Maximum 3–5 solution steps 
- No long explanations
- No duplication
{
  "summary": "",
  "root_cause": "",
  "solution": ["step1", "step2"]
}`;

/**
 * Analyzes an incident based on provided logs
 * @param {string} logs - The incident logs to analyze
 * @returns {Promise<Object>} - The analysis results
 */

export const analyzeIncident = async (reason) => {
  try {
    const response = await mistralAiModel.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze the following incident reason:\n${reason}`),
    ]);

    let content = response.content;

    content = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return content;
  } catch (err) {
    console.error('AI Error:', err);

    return 'AI analysis failed. Please try again.';
  }
};

// System prompt for the real-time conversational assistant (WatchTower's AI SRE).
const assistantSystemPrompt = `You are WatchTower's AI assistant — a friendly, sharp Site Reliability Engineer.

You help users understand uptime monitoring, interpret incidents and logs, and debug DevOps issues (HTTP errors, timeouts, DNS, TLS, deploys, databases, etc.).

Rules:
- Be concise and practical. Prefer short paragraphs and tight bullet lists.
- Plain text only — no markdown code fences or JSON.
- If asked something unrelated to reliability/monitoring/devops, answer briefly and steer back.
- Never invent specific metrics you weren't given.`;

/**
 * Stream a conversational assistant reply token-by-token.
 * @param {{ message: string, history?: Array<{role:string, content:string}> }} input
 * @param {(chunk: string) => void} onChunk - called for each streamed text chunk
 * @returns {Promise<string>} the full reply
 */
export const streamAssistantReply = async ({ message, history = [] }, onChunk) => {
  const messages = [new SystemMessage(assistantSystemPrompt)];

  for (const h of history) {
    const content = String(h?.content || '').trim();
    if (!content) continue;
    if (h.role === 'assistant') messages.push(new AIMessage(content));
    else messages.push(new HumanMessage(content));
  }
  messages.push(new HumanMessage(message));

  let full = '';
  try {
    const stream = await mistralAiModel.stream(messages);
    for await (const chunk of stream) {
      const text = typeof chunk.content === 'string' ? chunk.content : '';
      if (text) {
        full += text;
        onChunk(text);
      }
    }
  } catch (err) {
    // Fall back to a single non-streamed call if streaming isn't available.
    console.error('AI stream error, falling back to invoke:', err?.message);
    const res = await mistralAiModel.invoke(messages);
    full = typeof res.content === 'string' ? res.content : '';
    if (full) onChunk(full);
  }
  return full;
};
