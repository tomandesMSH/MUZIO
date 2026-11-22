import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Badge } from './Badge'
import { Progress } from './Progress'
import { DEFAULT_CUSTOM_STYLE, getCustomStyle, setCustomStyle, type CustomStyle } from '../../lib/theme'

export const ACCENTS: { hex: string; label: string }[] = [
  { hex: '#e14432', label: 'Červená' },
  { hex: '#2f6fdb', label: 'Modrá' },
  { hex: '#2e9e5b', label: 'Zelená' },
  { hex: '#7a5cd6', label: 'Fialová' },
  { hex: '#e07b1a', label: 'Oranžová' },
  { hex: '#d6457f', label: 'Růžová' },
]

const FONT_PREVIEW: Record<CustomStyle['font'], string> = {
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  atkinson: "'Atkinson Hyperlegible', sans-serif",
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string; font?: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1 rounded-xl bg-bg-card-alt p-1 shadow-clay-press" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            style={o.font ? { fontFamily: o.font } : undefined}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              value === o.id ? 'bg-bg-card text-text-primary shadow-clay-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Nastavení -> Styl -> Custom: the person's own look. Every change applies
// right away (the whole app is the preview); it's kept on this device.
export function CustomStyleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [style, setStyle] = useState<CustomStyle>(getCustomStyle)

  function update(patch: Partial<CustomStyle>) {
    const next = { ...style, ...patch }
    setStyle(next)
    setCustomStyle(next)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg">Vlastní styl</h2>

        <Segmented
          label="Základ"
          value={style.base}
          options={[
            { id: 'classic', label: 'Classic' },
            { id: 'modern', label: 'Moderní' },
          ]}
          onChange={(base) => update({ base })}
        />

        <div className="space-y-2">
          <span className="text-sm">Barva</span>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                type="button"
                aria-label={a.label}
                aria-pressed={style.accent === a.hex}
                title={a.label}
                onClick={() => update({ accent: a.hex })}
                className={`h-8 w-8 rounded-full transition-transform active:scale-95 ${
                  style.accent === a.hex ? 'ring-2 ring-offset-2 ring-text-primary ring-offset-bg-card' : ''
                }`}
                style={{ backgroundColor: a.hex }}
              />
            ))}
            <label className="flex items-center gap-1.5 text-xs text-text-muted">
              <input
                type="color"
                aria-label="Vlastní barva"
                value={style.accent}
                onChange={(e) => update({ accent: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
              />
              Vlastní
            </label>
          </div>
        </div>

        <Segmented
          label="Písmo"
          value={style.font}
          options={[
            { id: 'inter', label: 'Inter', font: FONT_PREVIEW.inter },
            { id: 'poppins', label: 'Poppins', font: FONT_PREVIEW.poppins },
            { id: 'atkinson', label: 'Atkinson', font: FONT_PREVIEW.atkinson },
          ]}
          onChange={(font) => update({ font })}
        />
        <Segmented
          label="Zaoblení"
          value={style.radius}
          options={[
            { id: 'sharp', label: 'Ostré' },
            { id: 'medium', label: 'Střední' },
            { id: 'round', label: 'Kulaté' },
          ]}
          onChange={(radius) => update({ radius })}
        />
        <Segmented
          label="Plochy"
          value={style.surfaces}
          options={[
            { id: 'clay', label: 'Stíny' },
            { id: 'lines', label: 'Linky' },
          ]}
          onChange={(surfaces) => update({ surfaces })}
        />
        <Segmented
          label="Velikost textu"
          value={style.textSize}
          options={[
            { id: 'small', label: 'Menší' },
            { id: 'normal', label: 'Normální' },
            { id: 'large', label: 'Větší' },
          ]}
          onChange={(textSize) => update({ textSize })}
        />

        <div className="rounded-2xl bg-bg-card-alt p-4 space-y-3" aria-label="Ukázka">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading font-semibold text-sm">Ukázka</span>
            <Badge tone="xp">12 XP</Badge>
          </div>
          <Progress value={0.6} />
          <div className="flex items-center gap-3">
            <Button type="button" className="!py-2">
              Nahrát
            </Button>
            <span className="text-sm font-semibold text-coral-dark">Odkaz</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setStyle(DEFAULT_CUSTOM_STYLE)
              setCustomStyle(DEFAULT_CUSTOM_STYLE)
            }}
          >
            Vrátit výchozí
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Hotovo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
