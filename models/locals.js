import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'

// Definir modelo con Ollama

const Qwen3 = new ChatOllama({
  //El nombre del modelo debe ser tal como se ha creado en Ollama
  model: 'qwen3.8-27B-GSQ-RCO-IQ3_S-MTP-local',
  temperature: 0.1,
  // reasoning: true,
  client_kwargs: {
    think: true,
  },
  // baseUrl: "http://127.0.0.1:11434" //Opcional, es el valor por defecto de Ollama
})

const Wilson = new ChatOpenAI({
  modelName: 'Wilson-3.8',
  temperature: 0.1,
  apiKey: 'llamacpp',
  configuration: {
    baseURL: 'http://localhost:8080/v1',
  },
})

export { Qwen3, Wilson }
