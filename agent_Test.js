import { createAgent, tool } from 'langchain'
import { ChatOllama } from '@langchain/ollama'
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

// 3. Crear el agente combinando el modelo y las tools.
const agent = createAgent({
  model: model,
  tools: [weatherTool],
})

// 4. Ejecutar el agente con una consulta del usuario
async function run() {
  const result = await agent.invoke({
    messages: [
      {
        role: 'user',
        content: '¿Qué tiempo hace ahora en Las Palmas de GC?',
      },
    ],
  })

  // Obtener toda la respuesta generada
  // console.log('Respuesta del Agente: ')
  // console.log(result)

  // Obtener solo la respuesta final:
  const lastMessage = result.messages[result.messages.length - 1]
  console.log('Respuesta final del agente: ')
  console.log(lastMessage.content)
}

run().catch(console.error)
