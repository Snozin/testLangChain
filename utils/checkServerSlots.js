export const checkServerSlots = async () => {
  try {
    const response = await fetch('http://localhost:8080/slots')
    const data = await response.json()

    const result = {
      isProcessing: data.at(-1).is_processing,
      numTokens: data.at(-1).n_prompt_tokens,
    }

    return result
  } catch (error) {
    console.error('Error SLOTS: ', error)
  }
}

// checkSlots()

// Ejecutar en cada 0,5 secs
// const interval = setInterval(checkSlots, 500)

// // Detener la ejecución después de 15 segundos
// setTimeout(() => {
//   clearInterval(interval)
//   console.log('Fin ejecución')
// }, 15000)
