import { EditorView, keymap, highlightActiveLine, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'
import { foldGutter, indentOnInput } from '@codemirror/language'
import { LRLanguage, LanguageSupport } from '@codemirror/language'

import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { Tree } from '@lezer/common'
import { LezerBslParser } from '../src/parser/LezerBslParser'
import { bslHighlighting } from '../src/highlight'
import { parser as bslParser } from '../src/bslParser'
import { monokai } from '@fsegurai/codemirror-theme-monokai'

const parserInstance = new LezerBslParser()

// Создаем языковое расширение BSL
const bslLanguage = LRLanguage.define({
  parser: bslParser.configure({
    props: [ bslHighlighting ]
  })
})

function bsl() {
  return new LanguageSupport(bslLanguage, [
    autocompletion({
      override: [
        (context) => {
          const word = context.matchBefore(/\w*/)
          if (!word) return null
          
          const bslKeywords = [
            'Процедура', 'КонецПроцедуры', 'Функция', 'КонецФункции',
            'Если', 'Тогда', 'Иначе', 'ИначеЕсли', 'КонецЕсли',
            'Пока', 'Цикл', 'КонецЦикла', 'Для', 'По', 'КонецЦикла',
            'Попытка', 'Исключение', 'КонецПопытки',
            'Возврат', 'ВызватьИсключение', 'Прервать', 'Продолжить',
            'Перем', 'Экспорт', 'Знач', 'Истина', 'Ложь', 'Неопределено',
            'И', 'ИЛИ', 'НЕ', 'Новый',
            // English keywords
            'Procedure', 'EndProcedure', 'Function', 'EndFunction',
            'If', 'Then', 'Else', 'ElsIf', 'EndIf',
            'While', 'Do', 'EndDo', 'For', 'To', 'Each', 'In',
            'Try', 'Except', 'EndTry',
            'Return', 'Raise', 'Break', 'Continue',
            'Var', 'Export', 'Val', 'True', 'False', 'Undefined',
            'And', 'Or', 'Not', 'New'
          ]
          
          return {
            from: word.from,
            options: bslKeywords.map(keyword => ({
              label: keyword,
              type: 'keyword'
            }))
          }
        }
      ]
    })
  ])
}

const initialCode = `// Это комментарий
Процедура Тест() // Еще комментарий
    Перем а; // Комментарий переменной
    а = 1;
    б = 2 + a;
    Значение = new Array(2);
    Значение[0] = а;
    Значение[1] = б;
    Значение = Новый ("Массив", 2);

    Если а > 0 И б >= 2 and (true Или Истина) Тогда
        Сообщить("Положительное число");
    КонецЕсли;
    Возврат а + 2;
КонецПроцедуры

Функция ВычислитьСумму(Знач Число1, Знач Число2) Экспорт
    Возврат Число1 + Число2;
КонецФункции`

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

function updateTree() {
  const code = editorView.state.doc.toString()
  const treeOutput = document.getElementById('tree-output')!
  const updateTime = document.getElementById('update-time')!
  
  try {
    const startTime = performance.now()
    const tree = parserInstance.parse(code)
    const parseTime = performance.now() - startTime
    const html = createTreeHTML(tree, code)
    treeOutput.innerHTML = html || '<div class="empty-tree">Пустое дерево</div>'
    
    const now = new Date()
    const timeStr = now.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
    updateTime.textContent = `Обновлено: ${timeStr} (${parseTime.toFixed(2)} мс)`
    
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
      foldGutter(),
      highlightActiveLine(),
      indentOnInput(),
      closeBrackets(),
      keymap.of([
        ...defaultKeymap,
        ...completionKeymap,
        ...closeBracketsKeymap
      ]),
      bsl(),
      monokai,

      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          updateTree()
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
document.addEventListener('DOMContentLoaded', initEditor)
