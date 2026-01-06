import { describe, expect, test, beforeEach } from "vitest"
import { LezerBslParser } from "../src/parser/LezerBslParser"

describe("LezerBslParser", () => {
  let parser: LezerBslParser

  beforeEach(() => {
    parser = new LezerBslParser()
  })

  describe("базовый парсинг", () => {
    test("парсит простую процедуру (RU keywords, case-insensitive)", () => {
      const tree = parser.parse("пРОцЕдУрА Тест()\n  а = 1;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("ProcedureDef")
      expect(text).toContain("Identifier")
    })

    test("парсит процедуру с EN ключевыми словами", () => {
      const tree = parser.parse("Procedure Test()\n  a = 1;\nEndProcedure")

      const text = tree.toString()
      expect(text).toContain("ProcedureDef")
      expect(text).toContain("Identifier")
    })

    test("парсит функцию", () => {
      const tree = parser.parse("Функция Сумма(a, b)\n  Возврат a + b;\nКонецФункции")

      const text = tree.toString()
      expect(text).toContain("FunctionDef")
      expect(text).toContain("ReturnStmt")
    })

    test("парсит пустой модуль", () => {
      const tree = parser.parse("")
      expect(tree).toBeDefined()
      // Пустое дерево имеет длину 0 или содержит только корневой узел Module
      expect(tree.length).toBeGreaterThanOrEqual(0)
    })

    test("парсит процедуру с параметрами", () => {
      const code = "Процедура Тест(Параметр1, Знач Параметр2)\nКонецПроцедуры"
      const tree = parser.parse(code)

      const text = tree.toString()
      expect(text).toContain("ParamList")
      expect(text).toContain("Param")
    })

    test("парсит процедуру с экспортом", () => {
      const tree = parser.parse("Процедура Тест() Экспорт\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("ProcedureDef")
    })
  })

  describe("операторы и выражения", () => {
    test("парсит присваивание", () => {
      const tree = parser.parse("Процедура Тест()\n  а = 1;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("Assignment")
    })

    test("парсит бинарные выражения", () => {
      const tree = parser.parse("Процедура Тест()\n  а = 1 + 2 * 3;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("AddExpr")
      expect(text).toContain("MulExpr")
    })

    test("парсит логические выражения", () => {
      const tree = parser.parse("Процедура Тест()\n  Если а И б Или в Тогда\n  КонецЕсли;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("AndExpr")
      expect(text).toContain("OrExpr")
    })

    test("парсит выражения сравнения", () => {
      const tree = parser.parse("Процедура Тест()\n  Если а > 0 Тогда\n  КонецЕсли;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("CompareExpr")
    })

    test("парсит унарные выражения", () => {
      const tree = parser.parse("Процедура Тест()\n  а = -1;\n  б = НЕ Ложь;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("UnaryExpr")
    })

    test("парсит вызов метода", () => {
      const tree = parser.parse("Процедура Тест()\n  Результат = Метод(1, 2);\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("CallArgs")
    })

    test("парсит доступ к свойству", () => {
      const tree = parser.parse("Процедура Тест()\n  Результат = Объект.Свойство;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("MemberAccess")
    })

    test("парсит индексацию", () => {
      const tree = parser.parse("Процедура Тест()\n  Элемент = Массив[0];\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("IndexAccess")
    })

    test("парсит создание объекта", () => {
      const tree = parser.parse("Процедура Тест()\n  Объект = Новый Структура;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("NewExpr")
    })

    test("парсит скобки в выражениях", () => {
      const tree = parser.parse("Процедура Тест()\n  а = (1 + 2) * 3;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("ParenExpr")
    })
  })

  describe("литералы", () => {
    test("парсит числа", () => {
      const tree = parser.parse("Процедура Тест()\n  а = 123;\n  б = 45.67;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("Number")
    })

    test("парсит строки", () => {
      const tree = parser.parse('Процедура Тест()\n  а = "Привет";\nКонецПроцедуры')

      const text = tree.toString()
      expect(text).toContain("String")
    })

    test("парсит логические константы", () => {
      const tree = parser.parse("Процедура Тест()\n  а = Истина;\n  б = Ложь;\nКонецПроцедуры")

      const text = tree.toString()
      // Специализированные токены kwTrue/kwFalse представлены как Literal в дереве
      expect(text).toContain("Literal")
      expect(text).toContain("ProcedureDef")
    })

    test("парсит Неопределено", () => {
      const tree = parser.parse("Процедура Тест()\n  а = Неопределено;\nКонецПроцедуры")

      const text = tree.toString()
      // Специализированный токен kwUndefined представлен как Literal в дереве
      expect(text).toContain("Literal")
      expect(text).toContain("ProcedureDef")
    })
  })

  describe("условные операторы", () => {
    test("парсит Если-Тогда", () => {
      const tree = parser.parse("Процедура Тест()\n  Если а Тогда\n    б = 1;\n  КонецЕсли;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("IfStmt")
    })

    test("парсит Если-Иначе", () => {
      const tree = parser.parse("Процедура Тест()\n  Если а Тогда\n  Иначе\n  КонецЕсли;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("IfStmt")
    })

    test("парсит Если-ИначеЕсли", () => {
      const tree = parser.parse("Процедура Тест()\n  Если а Тогда\n  ИначеЕсли б Тогда\n  КонецЕсли;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("IfStmt")
    })
  })

  describe("циклы", () => {
    test("парсит цикл Пока", () => {
      const tree = parser.parse("Процедура Тест()\n  Пока а Цикл\n  КонецЦикла;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("WhileStmt")
    })

    test("парсит цикл Для", () => {
      const tree = parser.parse("Процедура Тест()\n  Для а = 1 По 10 Цикл\n  КонецЦикла;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("ForStmt")
    })

    test("парсит цикл Для Каждого", () => {
      const tree = parser.parse("Процедура Тест()\n  Для Каждого Элемент Из Коллекция Цикл\n  КонецЦикла;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("ForStmt")
    })
  })

  describe("обработка исключений", () => {
    test("парсит Попытка-Исключение", () => {
      const tree = parser.parse("Процедура Тест()\n  Попытка\n  Исключение\n  КонецПопытки;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("TryStmt")
    })

    test("парсит ВызватьИсключение", () => {
      const tree = parser.parse("Процедура Тест()\n  ВызватьИсключение;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("RaiseStmt")
    })
  })

  describe("объявление переменных", () => {
    test("парсит Перем", () => {
      const tree = parser.parse("Процедура Тест()\n  Перем а, б = 1;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("VarDecl")
    })
  })

  describe("препроцессор", () => {
    test("парсит директивы препроцессора", () => {
      const tree = parser.parse("#Область Тест\nПроцедура Метод()\nКонецПроцедуры\n#КонецОбласти")

      const text = tree.toString()
      expect(text).toContain("PreprocLine")
    })
  })

  describe("комментарии", () => {
    test("парсит однострочные комментарии внутри процедуры", () => {
      const tree = parser.parse("Процедура Тест()\n  // Комментарий\n  а = 1;\nКонецПроцедуры")

      const text = tree.toString()
      // Комментарии пропускаются через @skip и не должны появляться в дереве
      // Но если они появляются, они не должны быть Statement
      expect(text).not.toContain("Statement(LineComment")
    })

    test("комментарии на верхнем уровне модуля не определяются как Statement", () => {
      const tree = parser.parse("// Комментарий на верхнем уровне\nПроцедура Тест()\nКонецПроцедуры")

      const text = tree.toString()
      // Комментарии на верхнем уровне не должны определяться как Statement
      expect(text).not.toContain("Statement(LineComment")
      // Должна быть процедура
      expect(text).toContain("ProcedureDef")
    })

    test("несколько комментариев на верхнем уровне", () => {
      const tree = parser.parse("// Первый комментарий\n// Второй комментарий\nПроцедура Тест()\nКонецПроцедуры")

      const text = tree.toString()
      // Комментарии не должны определяться как Statement
      expect(text).not.toContain("Statement(LineComment")
      expect(text).toContain("ProcedureDef")
    })
  })

  describe("множественные методы", () => {
    test("парсит несколько процедур", () => {
      const code = `Процедура Метод1()
КонецПроцедуры

Процедура Метод2()
КонецПроцедуры`
      const tree = parser.parse(code)

      const text = tree.toString()
      const procedureCount = (text.match(/ProcedureDef/g) || []).length
      expect(procedureCount).toBe(2)
    })

    test("парсит процедуры и функции вместе", () => {
      const code = `Процедура Процедура1()
КонецПроцедуры

Функция Функция1()
КонецФункции`
      const tree = parser.parse(code)

      const text = tree.toString()
      expect(text).toContain("ProcedureDef")
      expect(text).toContain("FunctionDef")
    })
  })

  describe("инкрементальное обновление", () => {
    test("инкрементально обновляет дерево по изменениям", () => {
      const before = "Процедура Тест()\n  а = 1;\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Тест()\n  а = 10;\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 23, rangeLength: 1, text: "10" }])
      expect(tree.toString()).toContain("ProcedureDef")
    })

    test("обновляет дерево при вставке", () => {
      const before = "Процедура Тест()\n  а = 1;\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Тест()\n  а = 1 + 2;\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 23, rangeLength: 0, text: " + 2" }])
      expect(tree.toString()).toContain("AddExpr")
    })

    test("обновляет дерево при удалении", () => {
      const before = "Процедура Тест()\n  а = 1 + 2;\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Тест()\n  а = 1;\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 23, rangeLength: 4, text: "" }])
      expect(tree.toString()).toContain("ProcedureDef")
    })

    test("обновляет дерево при изменении имени процедуры", () => {
      const before = "Процедура Тест()\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура НовыйТест()\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 10, rangeLength: 4, text: "НовыйТест" }])
      expect(tree.toString()).toContain("ProcedureDef")
    })

    test("обновляет дерево при добавлении нового оператора", () => {
      const before = "Процедура Тест()\n  а = 1;\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Тест()\n  а = 1;\n  б = 2;\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 25, rangeLength: 0, text: "\n  б = 2;" }])
      expect(tree.toString()).toContain("Assignment")
    })

    test("обновляет дерево при добавлении нового метода", () => {
      const before = "Процедура Метод1()\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Метод1()\nКонецПроцедуры\n\nПроцедура Метод2()\nКонецПроцедуры"
      const tree = parser.update(after, [{ rangeOffset: 35, rangeLength: 0, text: "\n\nПроцедура Метод2()\nКонецПроцедуры" }])
      const text = tree.toString()
      const procedureCount = (text.match(/ProcedureDef/g) || []).length
      expect(procedureCount).toBe(2)
    })

    test("обрабатывает множественные изменения", () => {
      const before = "Процедура Тест()\n  а = 1;\n  б = 2;\nКонецПроцедуры"
      parser.parse(before)

      const after = "Процедура Тест()\n  а = 10;\n  б = 20;\nКонецПроцедуры"
      const tree = parser.update(after, [
        { rangeOffset: 23, rangeLength: 1, text: "10" },
        { rangeOffset: 32, rangeLength: 1, text: "20" }
      ])
      expect(tree.toString()).toContain("ProcedureDef")
    })
  })

  describe("case-insensitive ключевые слова", () => {
    test("распознаёт ключевые слова в разных регистрах (RU)", () => {
      const variants = [
        "ПРОЦЕДУРА Тест() КОНЕЦПРОЦЕДУРЫ",
        "процедура Тест() конецпроцедуры",
        "ПрОцЕдУрА Тест() КоНеЦпРоЦеДуРы"
      ]

      for (const code of variants) {
        const tree = parser.parse(code)
        expect(tree.toString()).toContain("ProcedureDef")
      }
    })

    test("распознаёт ключевые слова в разных регистрах (EN)", () => {
      const variants = [
        "PROCEDURE Test() ENDPROCEDURE",
        "procedure Test() endprocedure",
        "PrOcEdUrE Test() EnDpRoCeDuRe"
      ]

      for (const code of variants) {
        const tree = parser.parse(code)
        expect(tree.toString()).toContain("ProcedureDef")
      }
    })

    test("распознаёт смешанные RU/EN ключевые слова", () => {
      const tree = parser.parse("Процедура Test() EndProcedure")
      expect(tree.toString()).toContain("ProcedureDef")
    })
  })

  describe("сложные сценарии", () => {
    test("парсит вложенные условия", () => {
      const code = `Процедура Тест()
  Если а Тогда
    Если б Тогда
    КонецЕсли;
  КонецЕсли;
КонецПроцедуры`
      const tree = parser.parse(code)

      const text = tree.toString()
      const ifCount = (text.match(/IfStmt/g) || []).length
      expect(ifCount).toBe(2)
    })

    test("парсит сложное выражение с приоритетами", () => {
      const tree = parser.parse("Процедура Тест()\n  а = 1 + 2 * 3 - 4 / 2;\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("AddExpr")
      expect(text).toContain("MulExpr")
    })

    test("парсит цепочку вызовов методов", () => {
      const tree = parser.parse("Процедура Тест()\n  Результат = Объект.Метод1().Метод2();\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("MemberAccess")
      expect(text).toContain("CallArgs")
    })

    test("парсит доступ к вложенным свойствам и индексам", () => {
      const tree = parser.parse("Процедура Тест()\n  Элемент = Массив[0].Свойство[1];\nКонецПроцедуры")

      const text = tree.toString()
      expect(text).toContain("IndexAccess")
      expect(text).toContain("MemberAccess")
    })
  })
})

