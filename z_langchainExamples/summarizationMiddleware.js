import { createAgent, summarizationMiddleware } from 'langchain'

const agent = createAgent({
  model: 'gpt-5.5',
  tools: [],
  middleware: [
    summarizationMiddleware({
      model: 'gpt-5.4-mini',
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
})
