import type { InputHTMLAttributes } from 'react'

type MdFormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  inputGroup?: boolean
}

export function MdFormInput({ 
  label, 
  error, 
  helperText, 
  fullWidth = false,
  inputGroup = false,
  className = '',
  id,
  ...props 
}: MdFormInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  const inputClasses = [
    inputGroup ? 'form-control' : 'form-control',
    hasError ? 'is-invalid' : '',
    className,
  ].filter(Boolean).join(' ')

  if (inputGroup) {
    return (
      <div className={fullWidth ? 'w-100' : ''}>
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <div className="input-group input-group-outline">
          <input
            id={inputId}
            className={inputClasses}
            {...props}
          />
        </div>
        {error && <div className="invalid-feedback d-block">{error}</div>}
        {helperText && !error && <div className="form-text">{helperText}</div>}
      </div>
    )
  }

  return (
    <div className={fullWidth ? 'w-100' : ''}>
      {label && <label htmlFor={inputId} className="form-label">{label}</label>}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      {error && <div className="invalid-feedback d-block">{error}</div>}
      {helperText && !error && <div className="form-text">{helperText}</div>}
    </div>
  )
}
