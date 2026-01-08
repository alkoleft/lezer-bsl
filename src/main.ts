import { LezerBslParser } from './parser/LezerBslParser'
import { Tree } from '@lezer/common'

const parser = new LezerBslParser()

// Функция для обхода узлов дерева и создания HTML
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
    
    // Проверяем, есть ли у узла дети
    const hasChildren = cursor.firstChild()
    const expandable = hasChildren ? 'expandable' : ''
    const expandIcon = hasChildren ? '▼' : '•'
    // Проверяем, является ли узел ошибочным
    const isError = name === '⚠'
    const errorClass = isError ? 'error-node' : ''
    
    html += `<div class="tree-node ${expandable} ${errorClass}" data-from="${from}" data-to="${to}">
      ${indentStr}<span class="expand-icon">${expandIcon}</span>
      <span class="node-name">${name}</span>
      <span class="node-range">[${from}:${to}]</span>
      <span class="node-text">"${text}${text.length >= 60 ? '...' : ''}"</span>
    </div>`
    
    // Если есть дети, обходим их рекурсивно
    if (hasChildren) {
      html += `<div class="tree-children" style="display: block;">`
      html += walkTree(cursor, source, indent + 1)
      html += `</div>`
      cursor.parent()
    }
  } while (cursor.nextSibling())
  
  return html
}

// Функция для создания HTML представления дерева
function createTreeHTML(tree: Tree, source: string): string {
  const cursor = tree.cursor()
  return walkTree(cursor, source, 0)
}

// Инициализация приложения
function initApp() {
  const codeInput = document.getElementById('code-input') as HTMLTextAreaElement
  const treeOutput = document.getElementById('tree-output') as HTMLDivElement
  const updateTime = document.getElementById('update-time') as HTMLSpanElement
  
  if (!codeInput || !treeOutput) return

  function updateTree() {
    const startTime = performance.now()
    const code = codeInput.value
    try {
      const tree = parser.parse(code)
      const parseTime = performance.now() - startTime
      const html = createTreeHTML(tree, code)
      treeOutput.innerHTML = html || '<div class="empty-tree">Пустое дерево</div>'
      
      // Обновляем время обновления
      if (updateTime) {
        const now = new Date()
        const timeStr = now.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          fractionalSecondDigits: 3
        })
        updateTime.textContent = `Обновлено: ${timeStr} (${parseTime.toFixed(2)} мс)`
      }
      
      // Добавляем обработчики для сворачивания/разворачивания узлов
      // Сворачивание только при клике на node-name
      const nodeNames = treeOutput.querySelectorAll('.expandable .node-name')
      nodeNames.forEach(nodeName => {
        nodeName.addEventListener('click', (e) => {
          e.stopPropagation()
          const node = nodeName.parentElement
          if (!node) return
          
          const children = node.nextElementSibling as HTMLDivElement
          if (children && children.classList.contains('tree-children')) {
            const isExpanded = children.style.display !== 'none'
            children.style.display = isExpanded ? 'none' : 'block'
            const icon = node.querySelector('.expand-icon')
            if (icon) {
              icon.textContent = isExpanded ? '▶' : '▼'
            }
          }
        })
      })
      
      // Добавляем обработчики для выделения текста при клике на node-range
      const nodeRanges = treeOutput.querySelectorAll('.node-range')
      nodeRanges.forEach(nodeRange => {
        nodeRange.addEventListener('click', (e) => {
          e.stopPropagation()
          const node = nodeRange.parentElement
          if (!node) return
          
          const from = parseInt(node.getAttribute('data-from') || '0')
          const to = parseInt(node.getAttribute('data-to') || '0')
          
          // Выделяем текст в редакторе
          codeInput.focus()
          codeInput.setSelectionRange(from, to)
          
          // Прокручиваем к выделенному фрагменту
          const lineHeight = parseInt(window.getComputedStyle(codeInput).lineHeight)
          const linesBeforeCursor = codeInput.value.substring(0, from).split('\n').length
          codeInput.scrollTop = (linesBeforeCursor - 1) * lineHeight - codeInput.clientHeight / 2
        })
      })
    } catch (error) {
      treeOutput.innerHTML = `<div class="error">Ошибка парсинга: ${error instanceof Error ? error.message : String(error)}</div>`
      if (updateTime) {
        const now = new Date()
        const timeStr = now.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          fractionalSecondDigits: 3
        })
        updateTime.textContent = `Ошибка: ${timeStr}`
      }
    }
  }

  // Обновляем дерево при изменении кода
  codeInput.addEventListener('input', updateTree)
  
  // Первоначальное обновление
  updateTree()
}

// Запускаем приложение после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}
