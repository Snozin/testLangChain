import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import {
  // threadHistory,
  newThreadPrompt,
  summarizePrompt,
} from '../utils/utils.js'
import { getContextUsage } from '../utils/calcTokens.js'
import { MemorySaver } from '@langchain/langgraph'
import { Qwen3, Wilson } from '../models/locals.js'
import { createAgent } from 'langchain'
import readline from 'readline'

// Configuración de límites de contexto y umbral de compactación
// const MAX_CONTEXT_TOKENS = 24576
const MAX_CONTEXT_TOKENS = 2000
const UMBRAL_COMPACTION = 0.9 * MAX_CONTEXT_TOKENS

// Crear memoria para mantener entre sesiones
const checkpointer = new MemorySaver()

// Crear agente usando el modelo y la memoria
const agent = createAgent({
  // model: Qwen3,
  model: Wilson,
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

  console.log(
    `Contexto actual: ${currentContextTokens} / ${MAX_CONTEXT_TOKENS}`,
  )

  // Si no supera el 90% de uso de contexto, no se hace nada
  if (currentContextTokens < UMBRAL_COMPACTION) return // <--- Descomentar

  console.log(
    `\n⚠️ [AUTO-COMPACTACIÓN] Se ha alcanzado el ${((currentContextTokens / MAX_CONTEXT_TOKENS) * 100).toFixed(2)} del contexto.`,
  )
  // console.log(`🔄 Iniciando proceso de resumen y nuevo hilo...\n`)
  console.log(`\n⚙️ Resumiendo contexto...\n`)

  // Extraer la transcripción de la conversación actual y crear array de
  // mensajes enviados por el usuario y respuestas del agente.
  const transcript = currentState?.values?.messages

  const historyMessages = []
  for (let element of transcript) {
    // console.log('\n⚠️⚠️⚠️ element: ', element.getType())

    if (element.getType() === 'ai') {
      historyMessages.push(`ai: ${element.content}`)
    }
    if (element.getType() === 'human') {
      historyMessages.push(`human: ${element.content}`)
    }
  }

  // 1. Pedir al LLM que resuma los mensajes extraídos
  const summaryMessages = {
    messages: [
      //Sólo es posible usar un SystemPrompt cuando se inicia el agente con createAgent()
      // new SystemMessage(sumarizePrompt),
      // new HumanMessage(threadHistory(...[historyMessages])),
      new HumanMessage(summarizePrompt(...[historyMessages])),
    ],
  }

  // Invocar nuevo hilo de ejecución del agente usando el resumen de
  // la conversación previa y la config con el ID de la sesión anterior.
  const summaryResponse = await agent.invoke(summaryMessages, currentConfig)

  const summaryText = summaryResponse.messages.at(-1)?.content

  console.log(`\n⚙️ Resumen:\n${summaryText}\n`)

  // Se define un nuevo trheadID para lanzar un nuevo hilo de ejecución del
  // agente y que tenga el contexto en blanco.
  const newThreadID = `sesion-${Date.now()}`
  currentConfig = { configurable: { thread_id: newThreadID } }

  // Inyectar el resumen como punto de partida del nuevo hilo
  const response = await agent.invoke(
    {
      messages: [
        {
          role: 'user',
          content: newThreadPrompt(summaryText),
        },
      ],
    },
    currentConfig,
  )

  // console.log(`\n✨ Compactación finalizada!\n`)

  console.log(`\n🔄 Compactación finalizada \n`)
  console.log(`\n🤖 Agente:\n${response.messages.at(-1)?.content}\n`)
}

console.log('🤖 ¡Agente ready! Escribe "/bye" para salir.\n')

// Definir bucle de chat interactivo
function askUser() {
  rl.question('\n✨ Tú:\n ', async (input) => {
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
      // Comprobar disponibilidad de contexto antes de cada respuesta para
      // prevenir posible desbordamiento de contexto
      // await checkContextAndCompact()

      // Iniciar streaming de eventos para ver respuesta en tiempo real
      process.stdout.write('\n🤖 Agente:\n ')

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
        // Extraer el hilo de razonamiento si el modelo lo expone
        const reasoningChunk =
          chunk.additional_kwargs?.reasoning_content ||
          chunk.additional_kwargs?.reasoningContent ||
          chunk.additional_kwargs?.thinking ||
          chunk.response_metadata?.thinking ||
          chunk.reasoning

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
          process.stdout.write(chunk.content)
        }
      }

      console.log('\n')

      // 3. Importante: como el streaming de eventos no actualiza automáticamente
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
