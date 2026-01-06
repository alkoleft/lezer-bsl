import { TreeFragment, type Tree } from "@lezer/common"
import type { Stack } from "@lezer/lr"
import { parser } from "./bslParser"

type ChangedRange = {
  fromA: number
  toA: number
  fromB: number
  toB: number
}

/**
 * Обёртка над Lezer-парсером с поддержкой инкрементального парсинга
 * через TreeFragment.applyChanges + parser.parse(..., fragments).
 */
export class LezerBslParser {
  private tree: Tree | null = null
  private fragments: readonly TreeFragment[] = []

  constructor() {
    this.patchIdentifierSpecializerToCaseInsensitive()
  }

  parse(text: string): Tree {
    const tree = parser.parse(text)
    this.tree = tree
    this.fragments = TreeFragment.addTree(tree)
    return tree
  }

  /**
   * Инкрементально обновляет дерево с учётом списка изменений Monaco.
   *
   * Важно: offsets в changes интерпретируются как позиции в *старом* тексте.
   */
  update(textAfter: string, changes: IModelContentChange[]): Tree {
    if (!this.tree) {
      return this.parse(textAfter)
    }

    const changedRanges = toChangedRanges(changes)
    this.fragments = TreeFragment.applyChanges(this.fragments, changedRanges)

    const tree = parser.parse(textAfter, this.fragments)
    this.tree = tree
    this.fragments = TreeFragment.addTree(tree, this.fragments)

    return tree
  }

  getLastTree(): Tree | null {
    return this.tree
  }

  /**
   * Делает @specialize<Identifier, "..."> case-insensitive без переписывания грамматики:
   * подменяем функцию specializer'а на свою, которая сравнивает value.toLowerCase().
   */
  private patchIdentifierSpecializerToCaseInsensitive(): void {
    const p: any = parser as any
    const specs: any[] | undefined = p.specializerSpecs
    const specializers: any[] | undefined = p.specializers
    if (!Array.isArray(specs) || !Array.isArray(specializers)) {
      return
    }

    // В нашей грамматике один specializer — для Identifier.
    const index = specs.findIndex(s => typeof s?.get === "function")
    if (index === -1) {
      return
    }

    const originalGet: (value: string) => number = specs[index].get.bind(specs[index])

    const canonicalByLower = new Map<string, string>([
      ["асинх", "Асинх"],
      ["async", "Async"],
      ["ждать", "Ждать"],
      ["await", "Await"],
      ["выполнить", "Выполнить"],
      ["execute", "Execute"],

      ["процедура", "Процедура"],
      ["procedure", "Procedure"],
      ["конецпроцедуры", "КонецПроцедуры"],
      ["endprocedure", "EndProcedure"],
      ["функция", "Функция"],
      ["function", "Function"],
      ["конецфункции", "КонецФункции"],
      ["endfunction", "EndFunction"],
      ["экспорт", "Экспорт"],
      ["export", "Export"],
      ["знач", "Знач"],
      ["val", "Val"],
      ["перем", "Перем"],
      ["var", "Var"],

      ["если", "Если"],
      ["if", "If"],
      ["тогда", "Тогда"],
      ["then", "Then"],
      ["иначеесли", "ИначеЕсли"],
      ["elsif", "ElsIf"],
      ["иначе", "Иначе"],
      ["else", "Else"],
      ["конецесли", "КонецЕсли"],
      ["endif", "EndIf"],

      ["пока", "Пока"],
      ["while", "While"],
      ["цикл", "Цикл"],
      ["do", "Do"],
      ["конеццикла", "КонецЦикла"],
      ["enddo", "EndDo"],
      ["для", "Для"],
      ["for", "For"],
      ["каждого", "Каждого"],
      ["each", "Each"],
      ["из", "Из"],
      ["in", "In"],
      ["по", "По"],
      ["to", "To"],

      ["попытка", "Попытка"],
      ["try", "Try"],
      ["исключение", "Исключение"],
      ["except", "Except"],
      ["конецпопытки", "КонецПопытки"],
      ["endtry", "EndTry"],

      ["возврат", "Возврат"],
      ["return", "Return"],
      ["вызватьисключение", "ВызватьИсключение"],
      ["raise", "Raise"],

      ["перейти", "Перейти"],
      ["goto", "Goto"],
      ["прервать", "Прервать"],
      ["break", "Break"],
      ["продолжить", "Продолжить"],
      ["continue", "Continue"],

      ["добавитьобработчик", "ДобавитьОбработчик"],
      ["addhandler", "AddHandler"],
      ["удалитьобработчик", "УдалитьОбработчик"],
      ["removehandler", "RemoveHandler"],

      ["не", "НЕ"],
      ["not", "NOT"],
      ["и", "И"],
      ["and", "AND"],
      ["или", "ИЛИ"],
      ["or", "OR"],
      ["новый", "Новый"],
      ["new", "New"],

      ["истина", "Истина"],
      ["true", "True"],
      ["ложь", "Ложь"],
      ["false", "False"],
      ["неопределено", "Неопределено"],
      ["undefined", "Undefined"],

      ["null", "Null"],
    ])

    specializers[index] = (value: string, stack: Stack) => {
      // stack может влиять на специализацию у external specializers; у нас он не используется.
      void stack

      const canonical = canonicalByLower.get(value.toLowerCase())
      if (!canonical) {
        return -1
      }
      return originalGet(canonical)
    }
  }
}

export interface IModelContentChange {
  /**
   * The offset of the range that got replaced.
   */
  readonly rangeOffset: number;
  /**
  * The length of the range that got replaced.
  */
  readonly rangeLength: number;
  /**
   * The new text for the range.
   */
  readonly text: string;
}

function toChangedRanges(changes: IModelContentChange[]): ChangedRange[] {
  // Monaco может прислать несколько изменений за один event.
  // Считаем, что offsets относятся к "старому" документу и считаем новую позицию через накопленный diff.
  const sorted = [...changes].sort((a, b) => a.rangeOffset - b.rangeOffset)
  const result: ChangedRange[] = []
  let delta = 0

  for (const ch of sorted) {
    const fromA = ch.rangeOffset
    const toA = ch.rangeOffset + ch.rangeLength
    const fromB = ch.rangeOffset + delta
    const toB = fromB + ch.text.length
    delta += ch.text.length - ch.rangeLength
    result.push({ fromA, toA, fromB, toB })
  }
  return result
}

