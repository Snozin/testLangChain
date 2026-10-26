async function getContextUsage(agent, config) {
  const currentState = await agent.getState(config)

  // Respuesta en caso de que no haya historial de mensajes
  if (!currentState || !currentState.values.messages) {
    console.log('No hay historial de mensajes para calcular tokens.')
    return
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalSessionTokens = 0
  let currentContextTokens = 0

  // Recorrer los mensajes del hilo buscando las respuestas del Agente
  for (const msg of currentState.values.messages) {
    if (msg.getType() === 'ai' && msg.usage_metadata) {
      totalInputTokens += msg.usage_metadata.input_tokens || 0
      totalOutputTokens += msg.usage_metadata.output_tokens || 0
      totalSessionTokens += msg.usage_metadata.total_tokens || 0

      // El contexto activo enviado al modelo es el input_tokens de la última respuesta del Agente
      currentContextTokens = msg.usage_metadata.input_tokens || 0
    }
  }

  // Calcular porcentaje ocupado del buffer de Ollama
  const usagePercentage = ((currentContextTokens / 24576) * 100).toFixed(2)

  if (currentContextTokens >= 24576 * 0.9) {
    console.log('⚠️ ALERTA! La converación está cerca del límite del contexto')
  }

  console.log(`Porcentaje de uso: ${usagePercentage}%`)
  console.log(`Contexto actual: ${currentContextTokens} / ${24576} tokens`)
}

export { getContextUsage }
