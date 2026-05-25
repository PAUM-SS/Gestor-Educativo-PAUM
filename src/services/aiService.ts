/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This service is intended for server-side execution via a BFF/API proxy to keep API keys secure.
// Do NOT call this directly from the frontend if it requires authentication or API keys.

export const aiService = {
  generateResponse: async (prompt: string, context: any) => {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });
      if (!response.ok) throw new Error('AI generation failed');
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('[AI Service] Prompting error:', error);
      return "Error: No se pudo generar respuesta de IA.";
    }
  }
};
