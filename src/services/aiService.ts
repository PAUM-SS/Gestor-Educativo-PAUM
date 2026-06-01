export const aiService = {

  generateResponse: async (prompt: string, context: any) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) throw new Error('AI generation failed');
    const data = await response.json();
    return data.response;
  }
};
