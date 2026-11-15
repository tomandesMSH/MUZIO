import { useState, type InputHTMLAttributes } from 'react'
import { Input } from './Input'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

// A password field with an eye button that shows what you typed - on a phone
// the keyboard often covers the field, so pupils couldn't check their typing.
export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`!pr-12 ${className}`}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? 'Skrýt heslo' : 'Zobrazit heslo'}
        aria-pressed={visible}
        title={visible ? 'Skrýt heslo' : 'Zobrazit heslo'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary"
        // Keep focus (and the phone keyboard) in the field while toggling.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  )
}
