import { tool, createAgent } from 'langchain'
import * as z from 'zod'

// 1. Definir la herramienta con la función tool y Zod para los argumentos
const calculateTip = tool(
  async ({ billAmount, tipPercentage = 20 }) => {
    const tip = billAmount * (tipPercentage / 100)
    return `Propina: $${tip.toFixed(2)}, Total: $${(billAmount + tip).toFixed(2)}`
  },
  {
    name: 'calculate_tip',
    description: 'Calcula la propina de una cuenta.',
    schema: z.object({
      billAmount: z.number().describe('El monto total de la cuenta'),
      tipPercentage: z
        .number()
        .optional()
        .describe('El porcentaje de propina deseado'),
    }),
  },
)

// 2. Pasar la herramienta al crear el agente
const agent = createAgent({
  model: 'openai:gpt-5.5',
  tools: [calculateTip],
  systemPrompt: 'Eres un asistente servicial.',
})
