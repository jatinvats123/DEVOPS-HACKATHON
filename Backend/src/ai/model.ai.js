import { ChatMistralAI } from "@langchain/mistralai";
import { config } from "../config/config.js";

/**
 * implement a wrapper around mistral ai to generate response for a given prompt
 * @param {string} prompt - the prompt to generate response for
 * @returns {string} - the generated response
 */


export const mistralAiModel = new ChatMistralAI({
  model: "mistral-medium-latest",
  apiKey: config.MISTRAL_API_KEY,
});