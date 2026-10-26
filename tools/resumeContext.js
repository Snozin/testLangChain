import { tool, createAgent, summarizationMiddleware } from 'langchain'
import { Wilson } from '../models/locals'
import * as z from 'zod'

// const summarizeContext = tool(
//   async ({ threadID, history }) => {
//     const history = history
//   },
//   {
//     name: 'summarize_context',
//     description: 'Resume el contexto de la conversación actual.',
//     schema: z.object({}),
//   },
// )


