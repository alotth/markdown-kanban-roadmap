const vscode = acquireVsCodeApi()
const DEFAULT_DURATION_DAYS = 7
const RANGE_PADDING_DAYS = 7
const MAX_VISIBLE_DAYS = 92
const MIN_DAY_WIDTH_PX = 6
const MAX_DAY_WIDTH_PX = 16
const ONE_DAY_MS = 24 * 60 * 60 * 1000

let currentData = null

window.addEventListener('message', event => {
  const message = event.data
  if (message.type === 'updateRoadmap') {
    currentData = message
    renderRoadmap()
  }
})

function renderRoadmap () {
  if (!currentData) return

  const titleElement = document.getElementById('board-title')
  titleElement.textContent = currentData.title || 'Roadmap'

  const container = document.getElementById('roadmap-container')
  container.innerHTML = ''

  const tasks = normalizeTasks(currentData.tasks || [])
  
  if (tasks.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty-state'
    empty.textContent = 'No tasks with dates to show.'
    container.appendChild(empty)
    return
  }

  const range = getDateRange(tasks)
  const layout = computeTimelineLayout(range)
  const timeline = document.createElement('div')
  timeline.className = 'timeline'
  timeline.style.width = `${layout.totalWidth}px`

  const header = createTimelineHeader(range)
  timeline.appendChild(header)

  const groups = groupByMilestone(tasks)
  let globalTaskIndex = 0
  groups.forEach(group => {
    const groupElement = createMilestoneGroup(group, range, globalTaskIndex)
    timeline.appendChild(groupElement)
    globalTaskIndex += group.items.length
  })

  addTodayMarker(timeline, range, layout)
  container.appendChild(timeline)
}

function getLabelColumnWidthPx () {
  // Keep JS consistent with CSS breakpoint in `roadmapStyle.css` (@media max-width: 900px)
  return window.matchMedia && window.matchMedia('(max-width: 900px)').matches ? 180 : 260
}

function normalizeTasks (tasks) {
  const normalized = []

  tasks.forEach(task => {
    let startDate = task.startDate ? parseDate(task.startDate) : null
    const dueDate = task.dueDate ? parseDate(task.dueDate) : null
    const completedDate = task.completedDate ? parseDate(task.completedDate) : null
    const updatedDate = task.updatedDate ? parseDate(task.updatedDate) : null
    
    // Prioridade: completedDate > dueDate > updatedDate
    const endRaw = completedDate || dueDate || updatedDate
    const endDate = endRaw || null

    // Se não tem start nem end, não mostra no roadmap
    if (!startDate && !endDate) return
    
    // Se não tem start mas tem end, calcula start retrocedendo 1 semana
    if (!startDate && endDate) {
      startDate = addDays(endDate, -DEFAULT_DURATION_DAYS)
    }
    
    // Se não tem start nem end, não mostra
    if (!startDate) return

    // Calcula end: prioriza dueDate, depois completedDate, depois start + 1 semana
    const effectiveEnd = endDate || addDays(startDate, DEFAULT_DURATION_DAYS)
    
    // Garante que start <= end
    if (startDate > effectiveEnd) {
      startDate = addDays(effectiveEnd, -DEFAULT_DURATION_DAYS)
    }

    // Flag para indicar que não tem start original
    const hasNoStart = !task.startDate

    normalized.push({
      ...task,
      start: startDate,
      end: effectiveEnd,
      progress: clamp(task.progress || 0, 0, 1),
      hasNoStart: hasNoStart
    })
  })

  return normalized
}

function groupByMilestone (tasks) {
  const groups = new Map()
  tasks.forEach(task => {
    const milestone = task.milestone && task.milestone.trim() ? task.milestone.trim() : 'default'
    if (!groups.has(milestone)) {
      groups.set(milestone, [])
    }
    groups.get(milestone).push(task)
  })
  
  // Ordenar grupos pela data de início mais antiga das tarefas
  // Tarefas sem milestone (default) sempre aparecem por último
  return Array.from(groups.entries())
    .map(([milestone, items]) => ({ milestone, items }))
    .sort((a, b) => {
      // Se um é 'default', ele sempre vem por último
      if (a.milestone === 'default' && b.milestone !== 'default') return 1
      if (b.milestone === 'default' && a.milestone !== 'default') return -1
      if (a.milestone === 'default' && b.milestone === 'default') return 0
      
      // Encontrar a data de início mais antiga em cada grupo
      const getEarliestStart = (group) => {
        const starts = group.items
          .map(item => item.start)
          .filter(start => start != null)
        return starts.length > 0 ? Math.min(...starts.map(d => d.getTime())) : Infinity
      }
      
      const aStart = getEarliestStart(a)
      const bStart = getEarliestStart(b)
      
      // Se ambos têm datas, ordenar por data
      if (aStart !== Infinity && bStart !== Infinity) {
        return aStart - bStart
      }
      // Se apenas um tem data, ele vem primeiro
      if (aStart !== Infinity) return -1
      if (bStart !== Infinity) return 1
      // Se nenhum tem data, manter ordem alfabética
      return a.milestone.localeCompare(b.milestone)
    })
}

function getDateRange (tasks) {
  let minStart = tasks[0].start
  let maxEnd = tasks[0].end

  tasks.forEach(task => {
    if (task.start < minStart) minStart = task.start
    if (task.end > maxEnd) maxEnd = task.end
  })

  // Garantir que a data de hoje seja incluída no range
  const today = new Date()
  // Criar data local meia-noite para garantir precisão
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  
  // Normalizar minStart e maxEnd para comparação
  const minStartNormalized = new Date(minStart.getFullYear(), minStart.getMonth(), minStart.getDate(), 0, 0, 0, 0)
  const maxEndNormalized = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), maxEnd.getDate(), 0, 0, 0, 0)
  
  if (todayLocal < minStartNormalized) {
    minStart = todayLocal
  }
  if (todayLocal > maxEndNormalized) {
    maxEnd = todayLocal
  }

  // Garantir que o range sempre use meia-noite para consistência
  const startWithPadding = new Date(minStart.getTime() - RANGE_PADDING_DAYS * ONE_DAY_MS)
  startWithPadding.setHours(0, 0, 0, 0)
  const endWithPadding = new Date(maxEnd.getTime() + (RANGE_PADDING_DAYS + 1) * ONE_DAY_MS)
  endWithPadding.setHours(0, 0, 0, 0)

  return { start: startWithPadding, end: endWithPadding }
}

function computeTimelineLayout (range) {
  const surface = document.querySelector('.roadmap-surface')
  const labelWidthPx = getLabelColumnWidthPx()
  const availableWidth = Math.max(320, (surface ? surface.clientWidth : 0) - labelWidthPx - 16)
  const totalDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / ONE_DAY_MS))
  const visibleDays = Math.min(totalDays, MAX_VISIBLE_DAYS)
  const dayWidth = clamp(availableWidth / visibleDays, MIN_DAY_WIDTH_PX, MAX_DAY_WIDTH_PX)
  const totalWidth = labelWidthPx + totalDays * dayWidth

  return { totalDays, visibleDays, dayWidth, totalWidth, labelWidthPx }
}

function createTimelineHeader (range) {
  const header = document.createElement('div')
  header.className = 'timeline-header'

  const label = document.createElement('div')
  label.className = 'timeline-label'
  label.textContent = 'Task'

  const grid = document.createElement('div')
  grid.className = 'timeline-grid'

  const monthTicks = buildMonthTicks(range)
  const dayTicks = buildDayTicks(range)
  const dayGridLines = buildDayGridLines(range)
  const weekGridLines = buildWeekGridLines(range)

  // Priorizar linhas de grade diárias quando disponíveis, senão usar semanas ou meses
  const gridLines = dayGridLines.length > 0 ? dayGridLines : (weekGridLines.length > 0 ? weekGridLines : monthTicks)
  appendGridLines(grid, gridLines)
  appendGridLabels(grid, monthTicks, 'month')
  // Sempre mostrar labels de dias (todos os dias ou primeiro dia de cada semana)
  appendGridLabels(grid, dayTicks, 'day')

  header.appendChild(label)
  header.appendChild(grid)
  return header
}

function createMilestoneGroup (group, range, startIndex) {
  const wrapper = document.createElement('div')
  wrapper.className = 'milestone-group'

  const header = document.createElement('div')
  header.className = 'milestone-header'
  header.innerHTML = `<div class="milestone-label">${group.milestone}</div><div class="milestone-line"></div>`
  wrapper.appendChild(header)

  // Usar linhas de grade diárias em vez de semanais quando disponíveis
  let ticks = buildDayGridLines(range)
  if (ticks.length === 0) {
    // Fallback para semanas se o range for muito grande
    ticks = buildWeekGridLines(range)
  }

  group.items.forEach((task, index) => {
    const row = document.createElement('div')
    const globalIndex = startIndex + index
    row.className = 'task-row'
    if (globalIndex % 2 === 1) {
      row.classList.add('task-row-alt')
    }

    const label = document.createElement('div')
    label.className = 'task-label'
    label.innerHTML = `<div>${formatTaskLabel(task)}</div><div class="task-status">${task.status}</div>`

    const barArea = document.createElement('div')
    barArea.className = 'task-bar-area'
    appendGridLines(barArea, ticks)

    const bar = document.createElement('div')
    bar.className = 'task-bar'
    if (task.hasNoStart) {
      bar.classList.add('task-bar-no-start')
    }

    const left = getPosition(task.start, range)
    const width = getWidth(task.start, task.end, range)
    bar.style.left = `${left}%`
    bar.style.width = `${width}%`
    bar.title = `${formatTaskTooltipTitle(task)}\nStatus: ${task.status}\nMilestone: ${group.milestone}\nProgress: ${Math.round(task.progress * 100)}%`
    bar.addEventListener('click', () => {
      vscode.postMessage({ type: 'openTask', taskId: task.id })
    })

    const progress = document.createElement('div')
    progress.className = 'task-bar-progress'
    progress.style.width = `${Math.round(task.progress * 100)}%`

    bar.appendChild(progress)
    barArea.appendChild(bar)

    row.appendChild(label)
    row.appendChild(barArea)
    wrapper.appendChild(row)
  })

  return wrapper
}

function formatTaskLabel (task) {
  if (task.id) {
    return `<span class="task-id">[${task.id}]</span> ${task.title}`
  }
  return task.title
}

function formatTaskTooltipTitle (task) {
  let tooltip = task.id ? `[${task.id}] ${task.title}` : task.title
  if (task.dueDate) {
    tooltip += `\nDue: ${task.dueDate}`
  }
  if (task.hasNoStart) {
    tooltip += `\n⚠️ No start date (estimated)`
  }
  return tooltip
}

function addTodayMarker (timeline, range, layout) {
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  const rangeStart = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate(), 0, 0, 0, 0)
  const rangeEnd = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate(), 0, 0, 0, 0)
  if (todayLocal < rangeStart || todayLocal > rangeEnd) return

  // IMPORTANT: `getPosition()` returns a percentage for the *date grid area*.
  // The timeline also includes the left label column. To avoid shifting the marker
  // left (e.g. showing Dec 15 instead of Dec 27), position the marker in pixels
  // with the label column offset applied.
  const span = rangeEnd.getTime() - rangeStart.getTime()
  const labelWidthPx = typeof layout.labelWidthPx === 'number' ? layout.labelWidthPx : getLabelColumnWidthPx()
  const gridWidthPx = Math.max(0, layout.totalWidth - labelWidthPx)
  const progress = span > 0 ? (todayLocal.getTime() - rangeStart.getTime()) / span : 0
  const leftPx = labelWidthPx + (progress * gridWidthPx)

  const line = document.createElement('div')
  line.className = 'today-line'
  line.style.left = `${leftPx}px`

  const badge = document.createElement('div')
  badge.className = 'today-badge'
  badge.style.left = `${leftPx}px`
  badge.textContent = 'Today'

  timeline.appendChild(line)
  timeline.appendChild(badge)
}

function appendGridLines (container, ticks) {
  ticks.forEach(tick => {
    const line = document.createElement('div')
    line.className = 'timeline-grid-line'
    line.style.left = `${tick.percent}%`
    container.appendChild(line)
  })
}

function appendGridLabels (container, ticks, kind) {
  ticks.forEach(tick => {
    const label = document.createElement('div')
    label.className = `timeline-grid-label timeline-grid-label-${kind}`
    label.style.left = `${tick.percent}%`
    label.textContent = tick.label
    container.appendChild(label)
  })
}

function buildMonthTicks (range) {
  const ticks = []
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1)
  while (cursor <= range.end) {
    const percent = getPosition(cursor, range)
    ticks.push({
      percent,
      label: formatMonth(cursor)
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return ticks
}

function buildWeekTicks (range) {
  const ticks = []
  const days = Math.round((range.end.getTime() - range.start.getTime()) / ONE_DAY_MS)
  // Mostrar semanas até 365 dias (1 ano) para melhor visualização
  if (days > 365) return ticks

  const cursor = new Date(range.start.getTime())
  const dayOfWeek = cursor.getDay()
  const offset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  cursor.setDate(cursor.getDate() + offset)

  while (cursor <= range.end) {
    // Calcular o meio da semana (3.5 dias após o início) para posicionar o label
    const weekMiddle = new Date(cursor.getTime() + (3.5 * ONE_DAY_MS))
    ticks.push({
      percent: getPosition(weekMiddle, range),
      label: `W${getIsoWeek(cursor)}`
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  return ticks
}

function buildWeekGridLines (range) {
  const ticks = []
  const days = Math.round((range.end.getTime() - range.start.getTime()) / ONE_DAY_MS)
  // Linhas de grade aparecem até 365 dias (1 ano)
  if (days > 365) return ticks

  const cursor = new Date(range.start.getTime())
  const dayOfWeek = cursor.getDay()
  const offset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  cursor.setDate(cursor.getDate() + offset)

  // Linhas de grade no início de cada semana (sem label, só posição)
  while (cursor <= range.end) {
    ticks.push({
      percent: getPosition(cursor, range),
      label: '' // Linhas não precisam de label
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  return ticks
}

function buildDayTicks (range) {
  const ticks = []
  const days = Math.round((range.end.getTime() - range.start.getTime()) / ONE_DAY_MS)
  
  // Se o range for muito grande (>90 dias), mostrar apenas o primeiro dia de cada semana
  if (days > 90) {
    const cursor = new Date(range.start.getTime())
    // Encontrar a próxima segunda-feira (ou domingo se for domingo)
    const dayOfWeek = cursor.getDay()
    const offset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    cursor.setDate(cursor.getDate() + offset)
    
    // Garantir que começamos dentro do range
    if (cursor < range.start) {
      cursor.setDate(cursor.getDate() + 7)
    }
    
    while (cursor <= range.end) {
      ticks.push({
        percent: getPosition(cursor, range),
        label: cursor.getDate().toString()
      })
      cursor.setDate(cursor.getDate() + 7)
    }
    return ticks
  }

  // Para ranges menores, mostrar todos os dias
  const cursor = new Date(range.start.getTime())
  cursor.setDate(cursor.getDate() + 1)
  while (cursor <= range.end) {
    // Mostrar apenas o número do dia para melhor legibilidade
    ticks.push({
      percent: getPosition(cursor, range),
      label: cursor.getDate().toString()
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return ticks
}

function buildDayGridLines (range) {
  const ticks = []
  const days = Math.round((range.end.getTime() - range.start.getTime()) / ONE_DAY_MS)
  // Linhas de grade diárias aparecem até 90 dias
  if (days > 90) return ticks

  const cursor = new Date(range.start.getTime())
  cursor.setDate(cursor.getDate() + 1)
  while (cursor <= range.end) {
    ticks.push({
      percent: getPosition(cursor, range),
      label: '' // Linhas não precisam de label
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return ticks
}

function formatMonth (date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
}

function formatDayMonth (date) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return months[date.getMonth()]
}

function parseDate (dateString) {
  if (!dateString) return null
  const parts = dateString.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function getIsoWeek (date) {
  const temp = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = temp.getDay() || 7
  temp.setDate(temp.getDate() + 4 - day)
  const yearStart = new Date(temp.getFullYear(), 0, 1)
  return Math.ceil((((temp - yearStart) / ONE_DAY_MS) + 1) / 7)
}

function addDays (date, days) {
  return new Date(date.getTime() + days * ONE_DAY_MS)
}

function getPosition (date, range) {
  const span = range.end.getTime() - range.start.getTime()
  if (span <= 0) return 0
  const dateTime = date.getTime()
  const startTime = range.start.getTime()
  return ((dateTime - startTime) / span) * 100
}

function getWidth (start, end, range) {
  const span = range.end.getTime() - range.start.getTime()
  if (span <= 0) return 0
  return ((end.getTime() - start.getTime() + ONE_DAY_MS) / span) * 100
}

function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

window.addEventListener('resize', () => {
  if (currentData) {
    renderRoadmap()
  }
})
