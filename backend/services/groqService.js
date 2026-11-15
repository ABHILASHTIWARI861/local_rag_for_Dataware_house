import Groq from 'groq-sdk';

// Initialize the official Groq SDK client using the API key from environment variables
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env file');
  }
  return new Groq({ apiKey });
}

// Ask the Groq LLM to synthesize an answer using ONLY the retrieved document chunks
export async function askGroqWithContext(question, contextChunks) {
  try {
    const groq = getGroqClient();
    // Default to openai/gpt-oss-120b hosted on Groq
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    // Format retrieved passages clearly with document names so the model knows where facts came from
    const formattedContext = contextChunks
      .map((c, i) => `[Source ${i + 1}] Document: "${c.documentName}" (Topic: ${c.topic || 'General'})\nPassage:\n${c.text}`)
      .join('\n\n---\n\n');

    // Strict system prompt to prevent hallucinations and enforce grounding
    const systemPrompt = `You are the Halden Logistics internal operations assistant.
Your goal is to answer staff questions accurately using ONLY the provided internal document passages below.

STRICT GROUNDING RULES:
1. Use ONLY the information provided in the context passages.
2. If the passages do not contain enough information to answer the question truthfully, state: "I cannot find this information in the provided Halden Logistics documents."
3. Never make up facts, procedures, names, or contact numbers.
4. Keep your answer professional, clear, and direct.
5. In your answer, clearly cite which document(s) provided the information.`;

    const userPrompt = `Context passages:\n${formattedContext}\n\nQuestion: ${question}\n\nAnswer:`;

    // Send completion request to Groq API
    const completion = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature (0.1) keeps answers strictly factual and deterministic
      max_tokens: 600   // Limit response length to concise operational answers
    });

    // Return the generated answer text
    return completion.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Groq API error:', error.message);

    // Friendly error handling for Groq rate limits, missing keys, or network drops
    if (error.status === 401) {
      return 'Invalid Groq API Key. Please replace the placeholder in your .env file with a valid key from console.groq.com and restart the containers.';
    }
    if (error.status === 429) {
      return 'The Groq API is temporarily rate-limited. Please wait a few seconds and ask again.';
    }
    if (error.code === 'ENOTFOUND' || error.message.includes('network') || error.message.includes('fetch')) {
      return 'Could not connect to Groq. Please check your internet connection.';
    }
    if (!process.env.GROQ_API_KEY) {
      return 'Groq API key is missing. Please set GROQ_API_KEY in your .env file.';
    }

    return `Unable to reach Groq assistant: ${error.message}`;
  }
}
