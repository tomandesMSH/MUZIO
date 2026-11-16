// CSV the way Czech Excel opens it with a double click: UTF-8 with a BOM (for
// the diacritics), ";" between cells (Czech Excel uses the comma for decimals)
// and CRLF line ends.

export type Cell = string | number | null | undefined

function cell(value: Cell): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return String(value).replace('.', ',')
  // Text that Excel would take for a formula is kept as text.
  let text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[;"\r\n]/.test(text) || text !== text.trim()) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((row) => row.map(cell).join(';')).join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, rows: Cell[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
