import { ExternalTokenizer, InputStream } from "@lezer/lr"
import { String, MultilineStringStart, MultilineStringContinue } from "./bslParser.terms"

// External tokenizer для строк
const stringTokenizer = new ExternalTokenizer((input: InputStream) => {
  // Проверяем начало строки " или продолжение |
  const first = input.peek(0)
  
  if (first === 124) { // | - продолжение многострочной строки
    let pos = 1
    
    while (true) {
      const ch = input.peek(pos)
      
      if (ch < 0 || ch === 10) {
        input.acceptToken(MultilineStringContinue, pos)
        return
      }
      
      if (ch === 34) { // "
        let quoteCount = 1
        while (input.peek(pos + quoteCount) === 34) quoteCount++
        
        if (quoteCount % 2 === 0) {
          pos += quoteCount
          continue
        }
        
        input.acceptToken(MultilineStringContinue, pos + quoteCount)
        return
      }
      
      pos++
    }
  }
  
  if (first !== 34) return // Не " и не | - не наш токен
  
  // Начало строки "
  let pos = 1
  let hasNewline = false
  
  while (true) {
    const ch = input.peek(pos)
    
    if (ch < 0) {
      input.acceptToken(hasNewline ? MultilineStringStart : String, pos)
      return
    }
    
    if (ch === 10) { // \n
      hasNewline = true
      let ahead = pos + 1
      
      // Пропускаем пробелы
      while (input.peek(ahead) === 32 || input.peek(ahead) === 9) ahead++
      
      if (input.peek(ahead) === 124) { // |
        // Продолжение многострочной строки - останавливаемся здесь
        input.acceptToken(MultilineStringStart, pos)
        return
      }
      
      // Нет | - конец строки
      input.acceptToken(hasNewline ? MultilineStringStart : String, pos)
      return
    }
    
    if (ch === 34) { // "
      let quoteCount = 1
      while (input.peek(pos + quoteCount) === 34) quoteCount++
      
      if (quoteCount % 2 === 0) {
        pos += quoteCount
        continue
      }
      
      input.acceptToken(hasNewline ? MultilineStringStart : String, pos + quoteCount)
      return
    }
    
    pos++
  }
})

export { stringTokenizer as stringTokens }
