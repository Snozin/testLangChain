import { createAgent } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import { Qwen3, Wilson } from '../models/locals.js'
import { getContextUsage } from '../utils/calcTokens.js'
import readline from 'readline'

// Crear memoria para mantener entre sesiones
const checkpointer = new MemorySaver()

// Crear agente usando el modelo y la memoria
const agent = createAgent({
  // model: Qwen3,
  model: Wilson,
  tools: [],
  checkpointer: checkpointer,
})

// Configurar la interfaz de lectura por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Definir identificador de la sesión
const config = {
  configurable: {
    thread_id: 'sesion-1',
  },
}

console.log(
  "Agente listo. Envía un mensaje. (Escribe 'taluego' para salir): \n",
)

// Definir bucle de chat interactivo
function askUser() {
  rl.question('Tú: ', async (input) => {
    // Condición de salida del bucle de chat
    if (input.trim().toLowerCase() === '/bye') {
      console.log('Hasta otra!')
      rl.close()
      process.exit(0)
    }

    // Comando calcular tokens de la sesión
    if (input.trim().toLowerCase() === '/tokens') {
      await getContextUsage(agent, config)
      askUser()
      return
    }

    // Invocar el agente pasando el mensaje y la configuración de la sesión
    try {
      const result = await agent.invoke(
        {
          messages: [{ role: 'user', content: input }],
        },
        config,
      )

      // Obtener la última respuesta del agente y mostrarla en consola
      const AIMessage = result.messages[result.messages.length - 1]

      // Devolver objeto completo para test
      // console.log(`\nAgente:\n`)
      // console.log(result)

      console.log(`\nAgente: ${AIMessage.content}\n`)

      await getContextUsage(agent, config)
    } catch (error) {
      console.error('Error al procesar la solicitud:', error)
    }

    // Volver a preguntar para mantener la interacción
    askUser()
  })
}

// async function calculateTokens() {
//   const currentState = await agent.getState(config)

//   // Respuesta en caso de que no haya historial de mensajes
//   if (!currentState || !currentState.values.messages) {
//     console.log('No hay historial de mensajes para calcular tokens.')
//     return
//   }

//   let totalInputTokens = 0
//   let totalOutputTokens = 0
//   let totalSessionTokens = 0
//   let currentContextTokens = 0

//   // Recorrer los mensajes del hilo buscando las respuestas del Agente
//   for (const msg of currentState.values.messages) {
//     if (msg.getType() === 'ai' && msg.usage_metadata) {
//       totalInputTokens += msg.usage_metadata.input_tokens || 0
//       totalOutputTokens += msg.usage_metadata.output_tokens || 0
//       totalSessionTokens += msg.usage_metadata.total_tokens || 0

//       // El contexto activo enviado al modelo es el input_tokens de la última respuesta del Agente
//       currentContextTokens = msg.usage_metadata.input_tokens || 0
//     }
//   }

//   // Calcular porcentaje ocupado del buffer de Ollama
//   const usagePercentage = ((currentContextTokens / 24576) * 100).toFixed(2)

//   // console.log('Tokens de la sesión:')
//   // console.log(`  - Tokens de entrada: ${totalInputTokens}`)
//   // console.log(`  - Tokens de salida: ${totalOutputTokens}`)
//   // console.log(`  - Tokens totales: ${totalSessionTokens}`)
//   // console.log(`  - Porcentaje de uso: ${usagePercentage}%`)
//   console.log(
//     `Ventana de contexto activa: ${currentContextTokens} / ${24576} tokens`,
//   )
//   console.log(`Porcentaje de uso: ${usagePercentage}%`)

//   if (currentContextTokens >= 24576 * 0.9) {
//     console.log('⚠️ ALERTA! LA converación está cerca del límite del contexto')
//   }
// }

// Iniciar el bucle de chat
askUser()
