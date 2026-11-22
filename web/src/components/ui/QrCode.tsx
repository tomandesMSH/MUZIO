import qrcode from 'qrcode-generator'

// A QR code as an SVG: dark squares on white in every theme (scanners need
// the contrast), with the usual quiet zone around it.
export function QrCode({ value, className = 'w-48 h-48', label }: { value: string; className?: string; label: string }) {
  const qr = qrcode(0, 'M')
  qr.addData(value)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = 4
  const size = n + quiet * 2
  let path = ''
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  )
}
