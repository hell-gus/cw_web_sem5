// records.js

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`
}

function renderRecords() {
  const key = 'catGameRecords'
  let records = []
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      records = JSON.parse(raw) || []
    } catch (e) {
      console.warn('Ошибка парсинга рекордов', e)
    }
  }

  const tbody = document.querySelector('#records-table-body')
  if (!tbody) return
  tbody.innerHTML = ''

  records.forEach((r, idx) => {
    const tr = document.createElement('tr')

    const tdIdx = document.createElement('td')
    tdIdx.textContent = String(idx + 1)

    const tdName = document.createElement('td')
    tdName.textContent = r.name || 'Игрок'

    const tdScore = document.createElement('td')
    tdScore.textContent = r.score ?? ''

    const tdDate = document.createElement('td')
    tdDate.textContent = formatDate(r.date)

    tr.appendChild(tdIdx)
    tr.appendChild(tdName)
    tr.appendChild(tdScore)
    tr.appendChild(tdDate)

    tbody.appendChild(tr)
  })

  const lastBox = document.querySelector('#last-result')
  if (lastBox) {
    const rawLast = localStorage.getItem('catGameLastResult')
    if (rawLast) {
      try {
        const last = JSON.parse(rawLast)
        lastBox.textContent = `Последняя игра: ${last.name || 'Игрок'} — ${last.score || 0} очков`
      } catch {
        lastBox.textContent = ''
      }
    } else {
      lastBox.textContent = ''
    }
  }
}

function playWinSound() {
  try {
    const a = new Audio('./sounds/win.mp3')
    a.volume = 0.8
    a.play().catch(() => {})
  } catch (e) {
    console.warn('Не удалось проиграть win.mp3', e)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  renderRecords()
  playWinSound()
})
