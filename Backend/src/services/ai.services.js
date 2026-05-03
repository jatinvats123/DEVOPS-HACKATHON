/**
 * AI Service for analyzing website/API incidents using logs and system signals.
 * This service provides a structured analysis of incidents, including a summary,
 * root cause, and actionable solutions based on the provided logs.
 * This service uses a Mistral AI model to process incident logs and provide
 */

import { mistralAiModel } from '../ai/model.ai.js';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

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
