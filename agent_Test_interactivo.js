import { createAgent, tool } from 'langchain'
import { ChatOllama } from '@langchain/ollama'
import { MemorySaver } from '@langchain/langgraph'
import readline from 'readline'
import { z } from 'zod'

// 1. Inicializar modelo local con Ollama
const model = new ChatOllama({
  model: 'qwen3.8-27B-GSQ-RCO-IQ3_S-MTP-local',
  temperature: 0,
  // baseUrl: "http://127.0.0.1:11434" //Opcional, es el valor por defecto de Ollama
})

// 2. Definir tools que el agente podrá usar
const weatherTool = tool(
  async ({ city }) => {
    // Conectar API real o simular respuesta
    return `El clima actual de ${city} es de 22ºC y el cielo está despejado.`
  },
  {
    name: 'get_weather',
    description: 'Obtiene el clima actual de la ciudad especificada.',
    schema: z.object({
      city: z
        .string()
        .describe(
          'El nombre de la ciudad, por ejemplo: Las Palmas de GC, Barcelona',
        ),
    }),
  },
)

// 3. Configurar la memoria para mantener el hilo (Checkpointer)
const checkpointer = new MemorySaver()

// 4. Crear el agente combinando el modelo y las tools.
const agent = createAgent({
  model: model,
  tools: [weatherTool],
  checkpointSaver: checkpointer,
})

// 5. COnfigurar la interfaz de lectura por consola (Readline)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Definir identificacdor del hilo para la sesión de chat
const config = {
  configurable: {
    thread_id: 'sesion-1',
  },
}

console.log(
  "Agente ready. Envía tu mensaje. (Escribe 'taluego' para terminar): \n",
)

function askUser() {
  rl.question('Tú: ', async (input) => {
    // Condición para salir del chat
    if (input.trim().toLowerCase() === 'taluego') {
      console.log('Hasta luego!')
      rl.close()
      process.exit(0)
    }

    try {
      // Invocar al agente pasandole el mensaje y la config del hilo
      const result = await agent.invoke(
        {
          messages: [{ role: 'user', content: input }],
        },
        config,
      )

      // Obtener la última respuesta del agente
      const lastMessage = result.messages[result.messages.length - 1]
      console.log(`\nAgente: ${lastMessage.content}\n`)
    } catch (error) {
      console.log('Error al procesar solicitud: ', error)
    }

    // Volver a preguntar para mantener la interacción
    askUser()
  })
}

// Iniciar el bucle de chat
askUser()
