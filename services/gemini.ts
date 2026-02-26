import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getAI = () => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found in environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

const SYSTEM_INSTRUCTION = `
You are an expert Senior Software Engineer and Code Architect.
Your role is to analyze code, explain complex logic, suggest modern refactorings, and identify security vulnerabilities.
Always provide output in Markdown format.
When providing code blocks, specify the language.
Be concise but thorough.
`;

export const analyzeCode = async (
  code: string,
  fileName: string,
  prompt: string
): Promise<string> => {
  try {
    const ai = getAI();
    const model = 'gemini-3-flash-preview'; 

    const finalPrompt = `
File: ${fileName}
    
Code Context:
\`\`\`
${code}
\`\`\`

User Request: ${prompt}
`;

    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message || "Failed to analyze code."}`;
  }
};

export const chatWithContext = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  contextFiles: { name: string, content: string }[]
) => {
  try {
    const ai = getAI();
    const model = 'gemini-3-flash-preview';

    // Prepare context from selected files (limit to reasonable size if needed)
    let contextStr = "";
    if (contextFiles.length > 0) {
      contextStr = "Current Selected Files Context:\n";
      contextFiles.forEach(f => {
        // Truncate very large files to avoid token limits if necessary, 
        // but 2.5/3 models handle large context well.
        contextStr += `--- START OF FILE ${f.name} ---\n${f.content}\n--- END OF FILE ---\n\n`;
      });
    }

    const chatHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    // If there is file context, prepend it to the message or add as a system note in the first turn
    // For simplicity, we prepend to the message if it's a new query about context
    const messageToSend = contextFiles.length > 0 
      ? `${contextStr}\n\nUser Question: ${newMessage}`
      : newMessage;

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: chatHistory
    });

    const result = await chat.sendMessage({ message: messageToSend });
    return result.text || "No response.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw error;
  }
};