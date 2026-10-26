import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  sumarizePrompt,
  threadHistory,
  newThreadUserPrompt,
} from '../utils/utils.js'
import { getContextUsage } from '../utils/calcTokens.js'
import { MemorySaver } from '@langchain/langgraph'
import { Qwen3 } from '../models/locals.js'
import { createAgent } from 'langchain'
import readline from 'readline'

/**
 * Sólo ejemplo. NO FUNCIONA: sumarizePrompt ya no existe
 **/

// Configuración de límites de contexto y umbral de compactación
const MAX_CONTEXT_TOKENS = 24576
const UMBRAL_COMPACTION = 0.9 * MAX_CONTEXT_TOKENS

// Crear memoria para mantener entre sesiones
const checkpointer = new MemorySaver()

// Crear agente usando el modelo y la memoria
const agent = createAgent({
  model: Qwen3,
  tools: [],
  checkpointer: checkpointer,
})

// Definir identificador de la sesión
let currentConfig = {
  configurable: {
    // Generar un ID único basado en la marca de tiempo
    thread_id: `sesion-${Date.now()}`,
  },
}

// Configurar la interfaz de lectura por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Comprobar el uso del contexto y compactar si es necesario
async function checkContextAndCompact() {
  const currentState = await agent.getState(currentConfig)

  if (!currentState || !currentState.values.messages) return

  let currentContextTokens = 0

  for (const msg of currentState.values.messages) {
    if (msg.getType() === 'ai' && msg.usage_metadata) {
      currentContextTokens = msg.usage_metadata.input_tokens || 0
    }
  }

  // Si no supera el 90% de uso de contexto, no se hace nada
  if (currentContextTokens < UMBRAL_COMPACTION) return

  console.log(
    `\n⚠️ [AUTO-COMPACTACIÓN] Se ha alcanzado el ${((currentContextTokens / MAX_CONTEXT_TOKENS) * 100).toFixed(2)} del contexto.`,
  )
  console.log(`🔄 Iniciando proceso de resumen y nuevo hilo...\n`)

  // Extraer la transcripción de la conversación actual
  const transcript = currentState.values.messages
    .map((msg) => {
      const role =
        msg.getType() === 'human'
          ? 'Usuario'
          : msg.getType() === 'ai'
            ? 'Asistente'
            : 'Sistema'
      return `${role}: ${msg.content}`
    })
    .join('\n')

  // 1. Pedir al LLM que resuma la conversación extraída
  const summaryMessages = [
    new SystemMessage(sumarizePrompt),
    new HumanMessage(threadHistory(transcript)),
  ]

  const summaryResponse = await model.invoke(summaryMessages)
  const summaryText = summaryResponse.content

  // 2. Cambiar a un nuevo hilo de conversación en blanco
  const newThreadID = `sesion-${Date.now()}`
  currentConfig = { configurable: { thread_id: newThreadID } }

  // 3. Inyectar el resumen como punto de partida del nuevo hilo
  await agent.invoke(
    {
      messages: [
        {
          role: 'system',
          content: `[Memory of previous session summarized automatically]:\n${summaryText}
        This summary is provided to maintain context in the new conversation thread.`,
        },
        {
          role: 'user',
          content: newThreadUserPrompt,
        },
      ],
    },
    currentConfig,
  )

  console.log(`\n✨ Compactación completada!\n`)
}

console.log('🤖 ¡Agente ready! Escribe "/bye" para salir.\n')

// Definir bucle de chat interactivo
function askUser() {
  rl.question('Tú:\n ', async (input) => {
    // Condición de salida del bucle de chat
    if (input.trim().toLowerCase() === '/bye') {
      console.log('Hasta otra!')
      rl.close()
      process.exit(0)
    }

    // Comando calcular tokens de la sesión
    if (input.trim().toLowerCase() === '/tokens') {
      await getContextUsage(agent, currentConfig)
      askUser()
      return
    }

    // Invocar el agente pasando el mensaje y la configuración de la sesión
    try {
      // 1. Iniciar streaming de eventos para ver respuesta en tiempo real
      process.stdout.write('\nAgente:\n ')

      const stream = await agent.stream(
        {
          messages: [{ role: 'user', content: input }],
        },
        {
          ...currentConfig,
          streamMode: 'messages',
        },
      )

      let isThinking = false

      for await (const [chunk] of stream) {
        // Extraer los tokens de razonamiento si el modelo los emite
        const reasoningChunk =
          chunk.additional_kwargs?.reasoningContent || chunk.reasoning

        if (reasoningChunk) {
          if (!isThinking) {
            process.stdout.write('💭 [Pensando]:')
            isThinking = true
          }
          process.stdout.write(reasoningChunk)
        } else if (chunk.content) {
          if (isThinking) {
            process.stdout.write('\n\n💡 [Respuesta]:\n')
            isThinking = false
          }
          process.stdout.write(chunk.content)
        }
      }

      console.log('\n')

      // 3. Importante: como el straming de eventos no actualiza automáticamente
      //  el estado de memoria, ejecutamos la verificación de tokens justo después
      await checkContextAndCompact()
    } catch (error) {
      console.error('Error al procesar la solicitud:', error)
    }

    // Volver a preguntar para mantener la interacción
    askUser()
  })
}

askUser()
