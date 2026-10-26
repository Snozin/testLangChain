/** Utilidades varias para los agentes **/

// Prompt para generer el resumen de la conversación previa
// export const threadHistory = (transcript) =>
// export const summarizePrompt = (transcript) =>
//   `Here is our previous conversation history:\n\n ${transcript}.\n\n Please, summarize the key points, decisions, and important data from the following conversation in a clear, structured, and concise way so it can serve as inherited context.`
export const summarizePrompt = (transcript) =>
  `Here is our previous conversation history:\n\n ${transcript}.\n\n 
Summarize the key points, decisions, and relevant data in a clear, structured, 
and concise way using the following template: 
 ## Decisions
 - (list of decissions)
 ## Actual state
 - (actual task state)
 ## Key data
 - (list of values, names, errors, params, etc.)
 ## Pendings
 - (list of task to do)
 Do NOT ADD extra sections. Do NOT USE JSON.`

// Prompt inicial para el nuevo hilo de conversación post-compactación
export const newThreadPrompt = (summary) =>
  `I've restored the memory our previous session via auto-generated summary:\n\n ${summary}\n\n Briefly confirm your understanding in the SAME LANGUAGE as the user speaks in summary.`

export const initSystemPrompt = `Be concise, structured, and efficient in your reasoning process. Avoid redundant internal monologue and focus on reaching the final output quickly.
If a response is truncated or the user requests to continue, resume EXACTLY from the last generated character. DO NOT restart the thinking phase, DO NOT repeat previous output or code blocks, and output ONLY the remaining content.`
