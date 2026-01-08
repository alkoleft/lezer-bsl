import { describe, bench } from "vitest"
import { LezerBslParser } from "../src/parser/LezerBslParser"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const benchmarksDir = path.dirname(fileURLToPath(import.meta.url))
const modulesDir = path.join(benchmarksDir, "modules")

/**
 * Находит ближайшую строку в середине кода
 */
function findMiddleLine(code: string): number {
  const lines = code.split('\n')
  const middleLineIndex = Math.floor(lines.length / 2)
  let position = 0
  for (let i = 0; i < middleLineIndex; i++) {
    position += lines[i].length + 1 // +1 для символа новой строки
  }
  return position
}

describe("Бенчмарки производительности парсера", () => {
  // Читаем все модули из каталога
  const moduleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith('.bsl'))
  
  if (moduleFiles.length === 0) {
    return
  }

  for (const moduleFile of moduleFiles) {
    const modulePath = path.join(modulesDir, moduleFile)
    const moduleName = path.basename(moduleFile, '.bsl')
    const code = fs.readFileSync(modulePath, 'utf8')
    const codeSize = code.length

    describe(`Модуль: ${moduleName} (${codeSize} символов)`, () => {
      // Полный парсинг
      bench(
        `Полный парсинг: ${moduleName}`,
        () => {
          const parser = new LezerBslParser()
          parser.parse(code)
        },
        { time: 500, iterations: 10 }
      )

      // Инкрементальное обновление - вставка
      {
        let parserForInsert: LezerBslParser
        
        bench(
          `Инкрементальное обновление - вставка: ${moduleName}`,
          () => {
           
            // Измеряется только операция update
            const insertPosition = findMiddleLine(code)
            const codeToInsert = "\n    // Вставленный комментарий для теста\n    Перем Тест = 1;"
            const codeAfterInsert = code.slice(0, insertPosition) + codeToInsert + code.slice(insertPosition)

            parserForInsert.update(codeAfterInsert, [{
              rangeOffset: insertPosition,
              rangeLength: 0,
              text: codeToInsert
            }])
          },
          {
            time: 500,
            iterations: 10,
            setup: () => {
              parserForInsert = new LezerBslParser()
              parserForInsert.parse(code)
            }
          }
        )
      }

      // Инкрементальное обновление - удаление
      {
        let parserForDelete: LezerBslParser
        const insertPosition = findMiddleLine(code)
        const codeToInsert = "\n    // Код для удаления\n    Перем Временная = 999;"
        const codeWithExtra = code.slice(0, insertPosition) + codeToInsert + code.slice(insertPosition)
        
        bench(
          `Инкрементальное обновление - удаление: ${moduleName}`,
          () => {
           
            // Измеряется только операция update
            parserForDelete.update(code, [{
              rangeOffset: insertPosition,
              rangeLength: codeToInsert.length,
              text: ""
            }])
          },
          {
            time: 500,
            iterations: 10,
            setup: () => {
              parserForDelete = new LezerBslParser()
              parserForDelete.parse(codeWithExtra)
            }
          }
        )
      }
    })
  }
})
