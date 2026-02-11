import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { cn } from '../../utils/cn'

export interface EntitySelectOption<T = unknown> {
  id: string
  label: string
  data?: T
}

export interface EntitySelectProps<T = unknown> {
  /** Current selected value (ID) */
  value: string | null
  /** Callback when selection changes */
  onChange: (id: string | null, option: EntitySelectOption<T> | null) => void
  /** Fetch options function - returns promise of options */
  fetchOptions: (query: string) => Promise<EntitySelectOption<T>[]>
  /** Optional: Fetch a single option by ID (for loading selected value label) */
  getOptionById?: (id: string) => Promise<EntitySelectOption<T> | null>
  /** Placeholder text */
  placeholder?: string
  /** Label for the input */
  label?: string
  /** Helper text */
  helper?: string
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Required indicator */
  required?: boolean
  /** Minimum query length before fetching (default: 2) */
  minQueryLength?: number
  /** Debounce delay in ms (default: 350) */
  debounceMs?: number
  /** Custom render function for options */
  renderOption?: (option: EntitySelectOption<T>, isHighlighted: boolean) => React.ReactNode
  /** Custom render function for selected value */
  renderSelected?: (option: EntitySelectOption<T>) => React.ReactNode
  /** Clear button shown when value is selected */
  showClearButton?: boolean
  /** Loading indicator text */
  loadingText?: string
  /** No results text */
  noResultsText?: string
  /** ID for accessibility */
  id?: string
  /** Name for form submission */
  name?: string
  /** Custom class name for the form group */
  className?: string
}

/**
 * EntitySelect - Unified autosuggest/typeahead component
 * 
 * Features:
 * - Clear input behavior (text reflects selection)
 * - No auto-selection on typing
 * - Explicit selection only (click or Enter)
 * - Fixed dropdown positioning (no layout shift)
 * - Keyboard navigation (arrows, Enter, Escape, Tab)
 * - Loading and empty states
 * - Debounced queries with request cancellation
 * - Accessibility (ARIA combobox/listbox)
 * - Consistent styling everywhere
 */
export function EntitySelect<T = unknown>({
  value,
  onChange,
  fetchOptions,
  getOptionById,
  placeholder = 'Search...',
  label,
  helper,
  error,
  disabled = false,
  required = false,
  minQueryLength = 2,
  debounceMs = 350,
  renderOption,
  renderSelected,
  showClearButton = true,
  loadingText = 'Loading...',
  noResultsText = 'No results found',
  id,
  name,
  className,
}: EntitySelectProps<T>) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<EntitySelectOption<T>[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selectedOption, setSelectedOption] = useState<EntitySelectOption<T> | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track previous value to detect external changes
  const prevValueRef = useRef<string | null>(null)
  const isUserTypingRef = useRef(false)

  // Load selected option when value changes externally (not from user typing)
  useEffect(() => {
    // Only sync if value changed externally (not from our own onChange)
    if (value !== prevValueRef.current && !isUserTypingRef.current) {
      prevValueRef.current = value
      
      if (value) {
        // First try to find in current options
        const option = options.find((opt) => opt.id === value)
        if (option) {
          setSelectedOption(option)
          setQuery(option.label)
        } else if (getOptionById) {
          // If not found and we have getOptionById, fetch it
          getOptionById(value)
            .then((opt) => {
              if (opt && value === prevValueRef.current && !isUserTypingRef.current) {
                setSelectedOption(opt)
                setQuery(opt.label)
              }
            })
            .catch((err) => {
              console.error('Error fetching option by ID:', err)
            })
        }
      } else {
        setSelectedOption(null)
        // Only clear query if we're not currently typing
        if (!isUserTypingRef.current) {
          setQuery('')
        }
      }
    }
  }, [value, getOptionById, options])

  // Fetch options when query changes
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Don't fetch if query is too short
    if (query.length < minQueryLength) {
      setOptions([])
      setLoading(false)
      setIsOpen(false)
      return
    }

    // Don't fetch if we have a selection and query matches it
    if (selectedOption && query === selectedOption.label) {
      setOptions([])
      setIsOpen(false)
      return
    }

    // Debounce the fetch
    setLoading(true)
    setIsOpen(true)

    debounceTimeoutRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const results = await fetchOptions(query)
        
        // Only update if request wasn't aborted
        if (!controller.signal.aborted) {
          setOptions(results)
          setHighlightedIndex(-1)
          setLoading(false)
          setIsOpen(results.length > 0)
        }
      } catch (err) {
        if (!controller.signal.aborted && err instanceof Error && err.name !== 'AbortError') {
          console.error('Error fetching options:', err)
          setOptions([])
          setLoading(false)
          setIsOpen(false)
        }
      }
    }, debounceMs)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, fetchOptions, minQueryLength, debounceMs, selectedOption])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        // Reset query to selected option label if we have a selection
        if (selectedOption) {
          setQuery(selectedOption.label)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, selectedOption])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    isUserTypingRef.current = true
    setQuery(newQuery)
    
    // Clear selection if user is typing something different from selected option
    if (selectedOption && newQuery !== selectedOption.label) {
      setSelectedOption(null)
      prevValueRef.current = null
      onChange(null, null)
    }
    
    // Reset typing flag after a short delay to allow external value updates
    setTimeout(() => {
      isUserTypingRef.current = false
    }, 200)
  }

  const handleInputFocus = () => {
    if (query.length >= minQueryLength && options.length > 0) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // Use setTimeout to allow click events on dropdown items to fire first
    setTimeout(() => {
      // When blurring, if we have a selection, show it; otherwise keep the query
      if (selectedOption && query !== selectedOption.label) {
        setQuery(selectedOption.label)
      }
    }, 150)
  }

  const handleSelect = (option: EntitySelectOption<T>) => {
    isUserTypingRef.current = false
    setSelectedOption(option)
    setQuery(option.label)
    setOptions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    prevValueRef.current = option.id
    onChange(option.id, option)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    isUserTypingRef.current = false
    setSelectedOption(null)
    setQuery('')
    setOptions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    prevValueRef.current = null
    onChange(null, null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen && options.length > 0) {
          setIsOpen(true)
        }
        if (isOpen && options.length > 0) {
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          )
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isOpen && options.length > 0) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        }
        break

      case 'Enter':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        if (selectedOption) {
          setQuery(selectedOption.label)
        }
        inputRef.current?.blur()
        break

      case 'Tab':
        // If highlighted, select it; otherwise just tab away
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
          e.preventDefault()
          handleSelect(options[highlightedIndex])
        } else {
          setIsOpen(false)
        }
        break

      default:
        // Allow typing
        break
    }
  }


  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }
  }, [highlightedIndex])

  const defaultRenderOption = (option: EntitySelectOption<T>, isHighlighted: boolean) => {
    // Highlight matched substring
    const queryLower = query.toLowerCase()
    const labelLower = option.label.toLowerCase()
    const matchIndex = labelLower.indexOf(queryLower)
    
    let labelParts: React.ReactNode[] = []
    if (matchIndex >= 0) {
      const before = option.label.substring(0, matchIndex)
      const match = option.label.substring(matchIndex, matchIndex + query.length)
      const after = option.label.substring(matchIndex + query.length)
      
      labelParts = [
        before,
        <strong key="match" style={{ fontWeight: 600 }}>{match}</strong>,
        after,
      ]
    } else {
      labelParts = [option.label]
    }

    return (
      <div
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          background: isHighlighted ? 'var(--pa-n50)' : 'var(--pa-n0)',
          borderBottom: '1px solid var(--pa-n100)',
          color: 'var(--pa-n900)',
        }}
        className="pa-body-m"
      >
        {labelParts}
      </div>
    )
  }

  const defaultRenderSelected = (option: EntitySelectOption<T>) => {
    return option.label
  }

  const displayValue = selectedOption
    ? (renderSelected ? renderSelected(selectedOption) : defaultRenderSelected(selectedOption))
    : query

  const hasError = !!error

  return (
    <div className={cn("pa-form-group", className)} ref={containerRef}>
      {label && (
        <label className={cn('pa-label', required && 'pa-label--required')} htmlFor={id}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={displayValue as string}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!!selectedOption}
          className={cn('pa-input', hasError && 'pa-input--error')}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={id ? `${id}-listbox` : undefined}
          role="combobox"
          style={selectedOption ? { cursor: 'default', userSelect: 'none' } : undefined}
        />

        {showClearButton && selectedOption && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pa-n500)',
            }}
            aria-label="Clear selection"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        )}

        {isOpen && (
          <div
            ref={dropdownRef}
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            aria-label="Options"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--pa-n0)',
              border: '1px solid var(--pa-n100)',
              borderRadius: 'var(--pa-radius-md)',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 9999,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: 'var(--pa-n700)',
                }}
                className="pa-body-s"
              >
                {loadingText}
              </div>
            ) : options.length === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  color: 'var(--pa-n700)',
                }}
                className="pa-body-s"
              >
                {noResultsText}
              </div>
            ) : (
              options.map((option, index) => (
                <div
                  key={option.id}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {renderOption
                    ? renderOption(option, highlightedIndex === index)
                    : defaultRenderOption(option, highlightedIndex === index)}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {(helper || error) && (
        <div className={cn('pa-helper', error && 'pa-helper--error')}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

export default EntitySelect
