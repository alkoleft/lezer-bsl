import { EditorView, keymap, highlightActiveLine, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { codeFolding, foldGutter, indentOnInput, foldNodeProp, foldInside, bracketMatching, syntaxTree } from '@codemirror/language'
import { LRLanguage, LanguageSupport } from '@codemirror/language'
import { search, highlightSelectionMatches, searchKeymap } from '@codemirror/search'

import { completionKeymap } from '@codemirror/autocomplete'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { Tree } from '@lezer/common'
import { LezerBslParser } from '../src/parser/LezerBslParser'
import { bslHighlighting } from '../src/highlight'
import { parser as bslParser } from '../src/bslParser'
import { monokai } from '@fsegurai/codemirror-theme-monokai'

const parserInstance = new LezerBslParser()

let autoUpdateEnabled = true

// Создаем языковое расширение BSL с поддержкой fold
const bslLanguage = LRLanguage.define({
  parser: bslParser.configure({
    props: [ 
      bslHighlighting,
      foldNodeProp.add({
        "ProcedureDef FunctionDef": foldInside,
        "IfStmt WhileStmt ForStmt ForEachStmt TryStmt": foldInside,
        "Block": (node) => ({ from: node.from, to: node.to })
      })
    ]
  })
})


const initialCode = `// Демонстрация fold поведения в BSL
Процедура ОсновнаяПроцедура() Экспорт
    // Блок переменных
    Перем Счетчик;
    Перем Результат;
    Перем Массив;
    
    Счетчик = 0;
    Массив = Новый Массив;
    
    // Условная конструкция
    Если Счетчик < 10 Тогда
        Сообщить("Начинаем обработку");
        
        // Вложенное условие
        Если Массив.Количество() = 0 Тогда
            Массив.Добавить("Первый элемент");
            Массив.Добавить("Второй элемент");
        КонецЕсли;
        
    ИначеЕсли Счетчик >= 10 И Счетчик < 20 Тогда
        Сообщить("Средняя обработка");
    Иначе
        Сообщить("Завершающая обработка");
    КонецЕсли;
    
    // Цикл While
    Пока Счетчик < Массив.Количество() Цикл
        Элемент = Массив[Счетчик];
        Сообщить("Обрабатываем: " + Элемент);
        Счетчик = Счетчик + 1;
    КонецЦикла;
    
    // Цикл For
    Для Индекс = 0 По Массив.ВГраница() Цикл
        Если Массив[Индекс] <> Неопределено Тогда
            Результат = ВычислитьЗначение(Массив[Индекс]);
        КонецЕсли;
    КонецЦикла;
    
    // Обработка исключений
    Попытка
        РискованнаяОперация();
        Сообщить("Операция выполнена успешно");
    Исключение
        Сообщить("Произошла ошибка: " + ОписаниеОшибки());
        ВызватьИсключение;
    КонецПопытки;
    
    Возврат Результат;
КонецПроцедуры

Функция ВычислитьЗначение(Знач Параметр) Экспорт
    // Простая функция для демонстрации
    Если ТипЗнч(Параметр) = Тип("Строка") Тогда
        Возврат СтрДлина(Параметр);
    ИначеЕсли ТипЗнч(Параметр) = Тип("Число") Тогда
        Возврат Параметр * 2;
    Иначе
        Возврат 0;
    КонецЕсли;
КонецФункции

Процедура РискованнаяОперация()
    // Имитация операции, которая может вызвать исключение
    СлучайноеЧисло = Окр(Случ() * 10);
    
    Если СлучайноеЧисло > 5 Тогда
        ВызватьИсключение("Случайная ошибка для демонстрации");
    КонецЕсли;
    
    Сообщить("Операция выполнена без ошибок");
КонецПроцедуры`

function walkTree(cursor: ReturnType<Tree['cursor']>, source: string, indent: number = 0): string {
  let html = ''
  const indentStr = '&nbsp;'.repeat(indent * 2)
  
  do {
    const node = cursor.node
    const name = node.name
    const from = node.from
    const to = node.to
    const text = source.slice(from, to)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '\\n')
      .substring(0, 60)
    
    const hasChildren = cursor.firstChild()
    const expandable = hasChildren ? 'expandable' : ''
    const expandIcon = hasChildren ? '▼' : '•'
    const isError = name === '⚠'
    const errorClass = isError ? 'error-node' : ''
    
    html += `<div class="tree-node ${expandable} ${errorClass}" data-from="${from}" data-to="${to}">
      ${indentStr}<span class="expand-icon">${expandIcon}</span>
      <span class="node-name">${name}</span>
      <span class="node-range">[${from}:${to}]</span>
      <span class="node-text">"${text}${text.length >= 60 ? '...' : ''}"</span>
    </div>`
    
    if (hasChildren) {
      html += `<div class="tree-children" style="display: block;">`
      html += walkTree(cursor, source, indent + 1)
      html += `</div>`
      cursor.parent()
    }
  } while (cursor.nextSibling())
  
  return html
}

function createTreeHTML(tree: Tree, source: string): string {
  const cursor = tree.cursor()
  return walkTree(cursor, source, 0)
}

let editorView: EditorView

function updateStats() {
  const code = editorView.state.doc.toString()
  const selection = editorView.state.selection.main
  const line = editorView.state.doc.lineAt(selection.head)
  const lineNumber = line.number
  const columnNumber = selection.head - line.from + 1
  
  // Обновляем дерево для подсчета методов
  const currentTree = syntaxTree(editorView.state)
  
  document.getElementById('stats-lines')!.textContent = editorView.state.doc.lines.toString()
  document.getElementById('stats-chars')!.textContent = code.length.toString()
  document.getElementById('stats-position')!.textContent = `${lineNumber}:${columnNumber}`
  
  // Count procedures and functions from AST
  let procedures = 0
  let functions = 0
  
  if (currentTree) {
    currentTree.iterate({
      enter: (node) => {
        if (node.name === 'ProcedureDef') procedures++
        if (node.name === 'FunctionDef') functions++
      }
    })
  }
  
  document.getElementById('stats-procedures')!.textContent = procedures.toString()
  document.getElementById('stats-functions')!.textContent = functions.toString()
}

function filterASTNodes(searchTerm: string) {
  const nodes = document.querySelectorAll('.tree-node')
  const term = searchTerm.toLowerCase()
  
  nodes.forEach(node => {
    const nodeName = node.querySelector('.node-name')?.textContent?.toLowerCase() || ''
    const nodeText = node.querySelector('.node-text')?.textContent?.toLowerCase() || ''
    
    if (!term || nodeName.includes(term) || nodeText.includes(term)) {
      node.classList.remove('filtered-out')
      if (term && (nodeName.includes(term) || nodeText.includes(term))) {
        node.classList.add('highlighted')
      } else {
        node.classList.remove('highlighted')
      }
    } else {
      node.classList.add('filtered-out')
      node.classList.remove('highlighted')
    }
  })
}

function updateTree() {
  const code = editorView.state.doc.toString()
  const treeOutput = document.getElementById('tree-output')!
  const updateTime = document.getElementById('update-time')!
  
  try {
    // Используем уже полученное дерево из расширения
    const tree = syntaxTree(editorView.state)
    const html = createTreeHTML(tree, code)
    treeOutput.innerHTML = html || '<div class="empty-tree">Пустое дерево</div>'
    
    // Apply current search filter
    const searchInput = document.getElementById('ast-search') as HTMLInputElement
    if (searchInput.value) {
      filterASTNodes(searchInput.value)
    }
    
    // Update stats
    updateStats()
    
    // Обработчики для сворачивания узлов
    const nodeNames = treeOutput.querySelectorAll('.expandable .node-name')
    nodeNames.forEach(nodeName => {
      nodeName.addEventListener('click', (e) => {
        e.stopPropagation()
        const node = nodeName.parentElement!
        const children = node.nextElementSibling as HTMLDivElement
        if (children?.classList.contains('tree-children')) {
          const isExpanded = children.style.display !== 'none'
          children.style.display = isExpanded ? 'none' : 'block'
          const icon = node.querySelector('.expand-icon')!
          icon.textContent = isExpanded ? '▶' : '▼'
        }
      })
    })
    
    // Обработчики для выделения текста
    const nodeRanges = treeOutput.querySelectorAll('.node-range')
    nodeRanges.forEach(nodeRange => {
      nodeRange.addEventListener('click', (e) => {
        e.stopPropagation()
        const node = nodeRange.parentElement!
        const from = parseInt(node.getAttribute('data-from')!)
        const to = parseInt(node.getAttribute('data-to')!)
        
        editorView.focus()
        editorView.dispatch({
          selection: { anchor: from, head: to }
        })
      })
    })
  } catch (error) {
    treeOutput.innerHTML = `<div class="error">Ошибка парсинга: ${error instanceof Error ? error.message : String(error)}</div>`
  }
}

function initEditor() {
  const editorElement = document.getElementById('editor')!
  
  if (!editorElement) {
    console.error('Editor element not found')
    return
  }
  
  const state = EditorState.create({
    doc: initialCode,
    extensions: [
      lineNumbers(),
      codeFolding(),
      foldGutter(),
      highlightActiveLine(),
      indentOnInput(),
      closeBrackets(),
      bracketMatching(),
      search(),
      highlightSelectionMatches(),
      keymap.of([
        ...defaultKeymap,
        ...completionKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap
      ]),
      new LanguageSupport(bslLanguage),
      monokai,
      
      EditorView.updateListener.of((update) => {
        if (update.docChanged && autoUpdateEnabled) {
          updateTree()
        }
        if (update.selectionSet) {
          updateStats()
        }
      })
    ]
  })
  
  editorView = new EditorView({
    state,
    parent: editorElement
  })
  
  updateTree()
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  initEditor()
  
  // AST search functionality
  const astSearch = document.getElementById('ast-search') as HTMLInputElement
  astSearch.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    filterASTNodes(target.value)
  })
  
  // Auto-update toggle functionality
  const autoUpdateToggle = document.getElementById('auto-update-toggle') as HTMLButtonElement
  autoUpdateToggle.addEventListener('click', () => {
    autoUpdateEnabled = !autoUpdateEnabled
    autoUpdateToggle.classList.toggle('disabled', !autoUpdateEnabled)
    autoUpdateToggle.title = autoUpdateEnabled ? 'Выключить автообновление' : 'Включить автообновление'
    
    // Если включили автообновление, обновим дерево
    if (autoUpdateEnabled) {
      updateTree()
    }
  })
  
  // Stats overlay toggle
  const statsToggle = document.getElementById('stats-toggle')!
  const statsOverlay = document.getElementById('stats-overlay')!
  
  statsToggle.addEventListener('click', () => {
    statsOverlay.classList.toggle('hidden')
  })
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S to toggle stats
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault()
      statsOverlay.classList.toggle('hidden')
    }
    
    // Ctrl+Shift+F to focus AST search
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      astSearch.focus()
    }
  })
})
