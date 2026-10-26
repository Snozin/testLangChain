import { MemorySaver } from "@langchain/langgraph";
import { createAgent } from "langchain";

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: Wilson,
  tools: [],
  checkpointer: checkpointer,
});

const oldThreadConfig = {
  configurable: { thread_id: "hilo-anterior-123" },
};

// 1. Pide al agente en el hilo anterior que genere un resumen de la conversación
const summaryResult = await agent.invoke(
  {
    messages: [{ role: "user", content: "Por favor, resume brevemente toda nuestra conversación hasta ahora para poder continuar en un nuevo hilo." }],
  },
  oldThreadConfig
);

// Extrae el texto del resumen generado por el agente
const threadSummary = summaryResult.messages.at(-1)?.content;

// 2. Define la configuración para el nuevo hilo
const newThreadConfig = {
  configurable: { thread_id: "hilo-nuevo-456" },
};

// 3. Inicia el nuevo hilo pasando el resumen como contexto inicial
const finalResult = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: `Continuando con nuestra sesión anterior, aquí está el resumen:\n\n${threadSummary}\n\nAhora, me gustaría que me ayudes con lo siguiente: [Tu nueva pregunta]`
      }
    ],
  },
  newThreadConfig
);

console.log(finalResult.messages.at(-1)?.content);