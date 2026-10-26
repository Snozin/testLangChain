import { createAgent } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import { Wilson } from '../models/locals.js'

// Definir identificador para la nueva sesión que se usará para resumir
const newConfig = {
  configurable: {
    thread_id: `session-${Date.now()}`,
  },
}

// Definir checkpoint para retener memoria entre mensajes
const checkpointer = new MemorySaver()

export const Summarizer = createAgent({
  model: Wilson,
  tools: [],
  checkpointer: checkpointer,
})
