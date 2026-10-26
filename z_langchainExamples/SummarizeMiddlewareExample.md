```js
import { SystemMessage, RemoveMessage } from '@langchain/core/messages'

const DEFAULT_SUMMARY_PROMPT = `
Eres un asistente que resume conversaciones.

Resume la conversación anterior de forma breve y estructurada.

Conserva:
- hechos relevantes
- decisiones
- preferencias del usuario
- contexto necesario para continuar

No inventes información.
`

function messageToText(content) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part.text === 'string') return part.text
        return JSON.stringify(part)
      })
      .join(' ')
  }

  return JSON.stringify(content)
}

function estimateTokens(text) {
  // Estimación simple: 1 token ≈ 4 caracteres.
  // Para producción, usa tiktoken o el contador de tokens de tu proveedor.
  return Math.ceil(text.length / 4)
}

function countTokens(messages) {
  return messages.reduce((total, message) => {
    const text = messageToText(message.content)
    return total + estimateTokens(text)
  }, 0)
}

export class SummarizeMiddleware {
  constructor({
    model,
    maxTokensBeforeSummary = 4000,
    keepLast = 6,
    summaryPrompt = DEFAULT_SUMMARY_PROMPT,
    langGraphCompatible = false,
  } = {}) {
    if (!model) {
      throw new Error('Debes pasar un model, por ejemplo ChatOpenAI.')
    }

    this.model = model
    this.maxTokensBeforeSummary = maxTokensBeforeSummary
    this.keepLast = keepLast
    this.summaryPrompt = summaryPrompt
    this.langGraphCompatible = langGraphCompatible
  }

  async summarize(state) {
    const messages = state?.messages ?? []

    // Conservamos los system messages originales.
    const systemMessages = messages.filter((m) => m._getType?.() === 'system')

    // Solo resumimos la conversación, no los system messages.
    const conversation = messages.filter((m) => m._getType?.() !== 'system')

    const totalTokens = countTokens(conversation)

    // Si no hay suficiente contexto, no hacemos nada.
    if (
      totalTokens < this.maxTokensBeforeSummary ||
      conversation.length <= this.keepLast
    ) {
      return {}
    }

    // Mensajes antiguos que vamos a resumir.
    const toSummarize = conversation.slice(
      0,
      conversation.length - this.keepLast,
    )

    // Mensajes recientes que conservamos tal cual.
    const recent = conversation.slice(-this.keepLast)

    const summaryResponse = await this.model.invoke([
      new SystemMessage(this.summaryPrompt),
      ...toSummarize,
    ])

    const summaryText = messageToText(summaryResponse.content).trim()

    const summaryMessage = new SystemMessage(
      `Resumen de la conversación anterior:\n${summaryText}`,
    )

    // Modo compatible con LangGraph:
    // Si el estado usa el reducer add_messages, normalmente conviene
    // eliminar los mensajes antiguos con RemoveMessage y añadir el resumen.
    if (this.langGraphCompatible) {
      const removable = toSummarize.filter((m) => m.id)

      if (removable.length !== toSummarize.length) {
        console.warn(
          'Algunos mensajes no tienen id; no se podrán eliminar con RemoveMessage.',
        )
      }

      const removals = removable.map((m) => new RemoveMessage(m.id))

      return {
        messages: [...removals, summaryMessage],
      }
    }

    // Modo simple: devolvemos una lista nueva de mensajes.
    return {
      messages: [...systemMessages, summaryMessage, ...recent],
    }
  }

  // Si tu framework espera un middleware con beforeModel.
  async beforeModel(state) {
    return this.summarize(state)
  }

  // Si tu framework espera una función invoke.
  async invoke(state) {
    return this.summarize(state)
  }
}
```

## Ejemplo de uso simple

```js
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { SummarizeMiddleware } from './SummarizeMiddleware.js'

const model = new ChatOpenAI({
  model: 'gpt-4o-mini',
})

const summarize = new SummarizeMiddleware({
  model,
  maxTokensBeforeSummary: 3000,
  keepLast: 4,
  langGraphCompatible: false,
})

const state = {
  messages: [
    new HumanMessage('Hola, quiero aprender JavaScript.'),
    new AIMessage('Claro, ¿por dónde quieres empezar?'),
    new HumanMessage('Funciones.'),
    new AIMessage('Las funciones son bloques de código reutilizables.'),
    new HumanMessage('¿Y qué son las closures?'),
    new AIMessage(
      'Una closure es una función que recuerda su contexto léxico.',
    ),
  ],
}

const update = await summarize.beforeModel(state)

console.log(update.messages ?? state.messages)
```

## Si lo quieres usar como middleware de LangGraph

```js
const summarize = new SummarizeMiddleware({
  model,
  maxTokensBeforeSummary: 4000,
  keepLast: 6,
  langGraphCompatible: true,
})

// Si tu API de agentes acepta middleware como función:
const middleware = summarize.beforeModel.bind(summarize)

// Ejemplo conceptual:
// const agent = createAgent({
//   model,
//   tools,
//   middleware: [middleware],
// });
```

## Notas importantes

- Esta versión usa una estimación simple de tokens: `caracteres / 4`.
- Si necesitas precisión, usa `tiktoken` o el contador de tokens de tu proveedor.
- Si usas LangGraph con `add_messages`, normalmente es mejor usar `RemoveMessage` para borrar los mensajes antiguos y añadir el resumen.
- Si no usas LangGraph, deja `langGraphCompatible: false` y el middleware devolverá directamente la lista de mensajes actualizada.
