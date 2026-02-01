import { TreeFragment, type Tree } from "@lezer/common"
import type { Stack } from "@lezer/lr"
import { parser } from "../bslParser"

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
      // Русские ключевые слова
      ["асинх", "async"],
      ["ждать", "await"],
      ["выполнить", "execute"],
      ["процедура", "procedure"],
      ["конецпроцедуры", "endProcedure"],
      ["функция", "function"],
      ["конецфункции", "endFunction"],
      ["экспорт", "export"],
      ["знач", "val"],
      ["перем", "var"],
      ["если", "if"],
      ["тогда", "then"],
      ["иначеесли", "elseIf"],
      ["иначе", "else"],
      ["конецесли", "endIf"],
      ["пока", "while"],
      ["цикл", "do"],
      ["конеццикла", "endDo"],
      ["для", "for"],
      ["каждого", "each"],
      ["из", "in"],
      ["по", "to"],
      ["попытка", "try"],
      ["исключение", "except"],
      ["конецпопытки", "endTry"],
      ["возврат", "return"],
      ["вызватьисключение", "raise"],
      ["перейти", "goto"],
      ["прервать", "break"],
      ["продолжить", "continue"],
      ["добавитьобработчик", "addHandler"],
      ["удалитьобработчик", "removeHandler"],
      ["не", "not"],
      ["и", "and"],
      ["или", "or"],
      ["новый", "new"],
      ["истина", "true"],
      ["ложь", "false"],
      ["неопределено", "undefined"],
      ["нуль", "null"],
      
      // Английские ключевые слова (для case-insensitive парсинга)
      ["async", "async"],
      ["await", "await"],
      ["execute", "execute"],
      ["procedure", "procedure"],
      ["endprocedure", "endProcedure"],
      ["function", "function"],
      ["endfunction", "endFunction"],
      ["export", "export"],
      ["val", "val"],
      ["var", "var"],
      ["if", "if"],
      ["then", "then"],
      ["elseif", "elseIf"],
      ["else", "else"],
      ["endif", "endIf"],
      ["while", "while"],
      ["do", "do"],
      ["enddo", "endDo"],
      ["for", "for"],
      ["each", "each"],
      ["in", "in"],
      ["to", "to"],
      ["try", "try"],
      ["except", "except"],
      ["endtry", "endTry"],
      ["return", "return"],
      ["raise", "raise"],
      ["goto", "goto"],
      ["break", "break"],
      ["continue", "continue"],
      ["addhandler", "addHandler"],
      ["removehandler", "removeHandler"],
      ["not", "not"],
      ["and", "and"],
      ["or", "or"],
      ["new", "new"],
      ["true", "true"],
      ["false", "false"],
      ["undefined", "undefined"],
      ["null", "null"],
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

