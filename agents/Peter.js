import { createAgent, summarizationMiddleware } from 'langchain'
import { checkServerSlots } from '../utils/checkServerSlots.js'
import { initSystemPrompt } from '../utils/utils.js'
import { MemorySaver } from '@langchain/langgraph'
import { Wilson } from '../models/locals.js'
import readline from 'readline'

// Configurar la interfaz de lectura por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Crear memoria para mantener entre sesiones
const checkpointer = new MemorySaver()

// Definir identificador de la sesión
let currentConfig = {
  configurable: {
    // Generar un ID único basado en la marca de tiempo
    thread_id: `sesion-${Date.now()}`,
  },
}

const MAX_CONTEXT_TOKENS = 3000
const COMPACTION_THRESHOLD = 0.9 * MAX_CONTEXT_TOKENS

// Crear agente con middleware de resumen automático
export const PeterAgent = createAgent({
  model: Wilson,
  tools: [],
  checkpointer: checkpointer,
  systemPrompt: initSystemPrompt,
  middleware: [
    summarizationMiddleware({
      model: Wilson,
      // trigger: { tokens: 300 },
      trigger: { tokens: COMPACTION_THRESHOLD },
      keep: { messages: 6 },
    }),
  ],
})

function askUser() {
  // Preguntar al usuario por consola
  rl.question('\n🕵️ Usuario:\n', async (input) => {
    // Definición de comandos
    if (input.trim().toLowerCase() === '/bye') {
      console.log('\n🤖 Agente: \nHasta otra!')
      rl.close()
      process.exit(0)
    }

    // Invocar el agente con el mensaje recibido por consola
    try {
      process.stdout.write('\n🤖 Agente:\n')

      let isThinking = false
      for await (const [chunk] of await PeterAgent.stream(
        {
          messages: [
            {
              role: 'user',
              content: input,
            },
          ],
        },
        { ...currentConfig, streamMode: 'messages' },
      )) {
        // Comprobar tokens generados por cada chunk
        const { isProcessing, numTokens } = await checkServerSlots()

        if (isProcessing) {
          // console.log(`[Total Tokens]: `, numTokens)
        }

        // Obtener valor final de la metadata del stream
        if (chunk.response_metadata?.usage || chunk.usageMetadata) {
          const usage = chunk.response_metadata?.usage ?? chunk.usageMetadata

          if (Object.keys(usage).length) {
            console.log('\n[Tokens finales]: ', usage)
          }
        }

        // Obtener hilo de razonamiento y  mensajes generados
        const reasoningChunk = chunk.additional_kwargs?.reasoning_content
        // ||
        // chunk.additional_kwargs?.thinking ||
        // chunk.response_metadata?.thinking ||
        // chunk.additional_kwargs?.reasoningContent ||
        // chunk.reasoning

        if (reasoningChunk) {
          if (!isThinking) {
            process.stdout.write('💭 [Pensando]:\n')
            isThinking = true
          }

          process.stdout.write(reasoningChunk)
        } else if (chunk.content) {
          if (isThinking) {
            process.stdout.write('\n\n💡 [Respuesta]:\n')
            isThinking = false
          }

          if (chunk.content.length) {
            process.stdout.write(chunk.content)
          }
          // console.log(chunk.content.length)
        }
      }

      console.log('\n')
    } catch (error) {
      console.error('Error al procesar la solicitud: ', error)
    }

    askUser()
  })
}

console.log('🤖 ¡Peter ready! Escribe "/bye" para salir.\n')

askUser()
