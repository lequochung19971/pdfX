export const translateText = async (text: string, targetLang = "es"): Promise<string> => {
  // This is a mock translation function
  // In a real application, you would integrate with a translation service like Google Translate API

  const mockTranslations: Record<string, string> = {
    hello: "hola",
    world: "mundo",
    document: "documento",
    page: "página",
    text: "texto",
    annotation: "anotación",
  }

  // Simple mock translation
  const words = text.toLowerCase().split(" ")
  const translatedWords = words.map((word) => {
    const cleanWord = word.replace(/[^\w]/g, "")
    return mockTranslations[cleanWord] || word
  })

  return translatedWords.join(" ")
}
