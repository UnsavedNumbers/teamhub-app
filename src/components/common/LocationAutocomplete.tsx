/**
 * LocationAutocomplete Component
 * 
 * Google Places API autocomplete input with structured address parsing.
 * Provides real-time location suggestions, keyboard navigation, and accessibility.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { LocationAutocompleteProps as BaseProps, StructuredAddress } from '../../types/location'
import { parsePlace, validateStructuredAddress, isPlaceResult, hasAddressComponents } from '../../types/location'
import { loadGoogleMapsScript, isGoogleMapsLoaded } from '../../utils/googleMapsLoader'
import { Input } from '../platformAdmin/Input'

// Extend the props to include the callback with place result
interface LocationAutocompleteProps extends Omit<BaseProps, 'onChange'> {
  onChange: (address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => void
}

/**
 * Debounce function with cancel capability
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null

  const debounced = function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}

/**
 * Get adaptive debounce delay based on input length
 */
function getDebounceDelay(inputLength: number): number {
  if (inputLength < 3) return 300
  if (inputLength < 7) return 500
  return 700
}

/**
 * Check browser compatibility for Google Maps API
 */
function checkBrowserCompatibility(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' }
  }

  if (!window.Promise) {
    return { supported: false, reason: 'Promise not supported' }
  }

  // Check CSP (basic check)
  try {
    const testScript = document.createElement('script')
    testScript.src = 'data:text/javascript,void(0)'
    document.head.appendChild(testScript)
    document.head.removeChild(testScript)
  } catch (e) {
    return { supported: false, reason: 'Content Security Policy may block external scripts' }
  }

  return { supported: true }
}

interface AutocompleteSuggestion {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
  placePrediction?: google.maps.places.PlacePrediction
}

export function LocationAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = 'Enter an address',
  label,
  required = false,
  error,
  helper,
  disabled = false,
  countryRestrictions,
  types = ['address'],
}: LocationAutocompleteProps) {
  // State
  const [inputValue, setInputValue] = useState(value || '')
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<StructuredAddress | null>(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)
  const requestIdRef = useRef(0)
  const previousValueRef = useRef<string>('')
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const placesLibraryRef = useRef<typeof google.maps.places | null>(null)
  const mountedRef = useRef(true)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // Update dropdown position
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return

    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
  }, [])

  // Sync with external value changes
  useEffect(() => {
    // Always sync when external value changes
    // This allows parent to control the display value after selection
    if (value !== previousValueRef.current) {
      setInputValue(value || '')
      previousValueRef.current = value || ''
      // Clear selectedPlace when syncing to allow future syncs
      if (selectedPlace && value !== selectedPlace.formatted_address) {
        setSelectedPlace(null)
      }
    }
  }, [value, selectedPlace])

  // Load Google Maps API
  useEffect(() => {
    mountedRef.current = true

    // Check browser compatibility
    const compatibility = checkBrowserCompatibility()
    if (!compatibility.supported) {
      setFallbackMode(true)
      setApiError(compatibility.reason || 'Browser not supported')
      return
    }

    // Check if already loaded
    if (isGoogleMapsLoaded()) {
      // Import places library
      google.maps.importLibrary('places')
        .then((places) => {
          if (mountedRef.current) {
            placesLibraryRef.current = places as typeof google.maps.places
            setIsLoaded(true)
            setApiError(null)
          }
        })
        .catch((err) => {
          if (mountedRef.current) {
            setFallbackMode(true)
            setApiError(err instanceof Error ? err.message : 'Failed to load Places library')
          }
        })
      return
    }

    // Get API key
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    if (!apiKey || apiKey.length < 20) {
      setFallbackMode(true)
      setApiError('Google Places API key not configured')
      return
    }

    // Load script
    loadGoogleMapsScript(apiKey)
      .then(async () => {
        if (!mountedRef.current) return
        
        // Check if Google Maps API is available
        if (!window.google?.maps) {
          if (mountedRef.current) {
            setFallbackMode(true)
            setApiError('Google Maps API not available')
          }
          return
        }

        // Check if places is already available
        if (window.google.maps.places) {
          if (mountedRef.current) {
            placesLibraryRef.current = window.google.maps.places
            setIsLoaded(true)
            setApiError(null)
          }
          return
        }

        // Try to import places library
        if (window.google.maps.importLibrary) {
          try {
            const places = await window.google.maps.importLibrary('places')
            if (mountedRef.current) {
              placesLibraryRef.current = places as typeof google.maps.places
              setIsLoaded(true)
              setApiError(null)
            }
          } catch (err) {
            if (mountedRef.current) {
              setFallbackMode(true)
              setApiError('Places library could not be loaded. You can enter the address manually below.')
            }
          }
        } else {
          // importLibrary not available, check if places becomes available
          let attempts = 0
          const maxAttempts = 50 // 5 seconds
          const checkInterval = setInterval(() => {
            attempts++
            if (window.google?.maps?.places) {
              clearInterval(checkInterval)
              if (mountedRef.current) {
                placesLibraryRef.current = window.google.maps.places
                setIsLoaded(true)
                setApiError(null)
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              if (mountedRef.current) {
                setFallbackMode(true)
                setApiError('Places library could not be loaded. You can enter the address manually below.')
              }
            }
          }, 100)
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setFallbackMode(true)
          setApiError(err instanceof Error ? err.message : 'Failed to load Google Maps API')
        }
      })

    return () => {
      mountedRef.current = false
    }
  }, [])

  // Handle input change with adaptive debounce
  const handleInputChange = useCallback((newValue: string) => {
    // Skip if value hasn't actually changed
    if (newValue === previousValueRef.current) {
      return
    }

    previousValueRef.current = newValue
    setInputValue(newValue)
    setSelectedIndex(-1)
    setSelectedPlace(null)
    onInputChange?.(newValue)

    // Cancel previous debounced call
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current.cancel()
    }

    // Clear suggestions if input is too short
    if (newValue.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setIsLoading(false)
      return
    }

    // Increment request ID
    const currentRequestId = ++requestIdRef.current
    setIsLoading(true)

    // Create new debounced function with adaptive delay
    const delay = getDebounceDelay(newValue.length)
    const debouncedFn = debounce(async (searchValue: string) => {
      if (!placesLibraryRef.current || !mountedRef.current) return

      try {
        // Create or reuse session token
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLibraryRef.current.AutocompleteSessionToken()
        }

        const request: google.maps.places.AutocompleteRequest = {
          input: searchValue,
          sessionToken: sessionTokenRef.current,
          includedPrimaryTypes: types.length > 0 ? types.map(t => t === 'address' ? 'geocode' : t) as string[] : undefined,
          includedRegionCodes: countryRestrictions && countryRestrictions.length > 0
            ? countryRestrictions.map(code => code.toUpperCase())
            : undefined,
        }

        // Use the new AutocompleteSuggestion API
        const { suggestions: apiSuggestions } = await placesLibraryRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

        // Only update if this is still the latest request
        if (currentRequestId !== requestIdRef.current || !mountedRef.current) {
          return
        }

        if (apiSuggestions && apiSuggestions.length > 0) {
          const formattedResults = apiSuggestions
            .map((suggestion) => {
              const prediction = suggestion.placePrediction
              if (!prediction) {
                // Skip suggestions without placePrediction
                return null
              }
              // Use mainText and secondaryText from the new API
              const mainText = prediction.mainText?.text || prediction.text.text
              const secondaryText = prediction.secondaryText?.text || ''
              const fullText = prediction.text.text
              
              return {
                place_id: prediction.placeId,
                description: fullText,
                structured_formatting: {
                  main_text: mainText,
                  secondary_text: secondaryText,
                },
                placePrediction: prediction,
              } as AutocompleteSuggestion
            })
            .filter((result): result is AutocompleteSuggestion => result !== null)
          setSuggestions(formattedResults)
          setShowSuggestions(true)
          setIsLoading(false)
          updatePosition()
        } else {
          setSuggestions([])
          setShowSuggestions(true)
          setIsLoading(false)
          updatePosition()
        }
      } catch (err: any) {
        if (currentRequestId === requestIdRef.current && mountedRef.current) {
          console.error('Autocomplete error:', err)
          // Check for specific error types
          if (err?.code === 'OVER_QUERY_LIMIT' || err?.code === 'REQUEST_DENIED') {
            setFallbackMode(true)
            setApiError('Autocomplete temporarily unavailable')
          } else {
            setApiError('Failed to fetch suggestions')
          }
          setIsLoading(false)
        }
      }
    }, delay)

    debouncedSearchRef.current = debouncedFn
    debouncedFn(newValue)
  }, [types, countryRestrictions, onInputChange, updatePosition])

  // Handle place selection
  const handlePlaceSelect = useCallback(
    async (suggestion: AutocompleteSuggestion) => {
      if (!placesLibraryRef.current || !mountedRef.current || !suggestion.placePrediction) return

      try {
        setIsLoading(true)

        // Convert PlacePrediction to Place using the new API
        const place = suggestion.placePrediction.toPlace()
        
        // Fetch required fields including displayName
        await place.fetchFields({
          fields: ['id', 'formattedAddress', 'addressComponents', 'location', 'displayName'],
        })

        if (!mountedRef.current) return

        // Extract displayName - it might be a LocalizedText object with a text property
        let placeName = ''
        if (place.displayName) {
          // displayName can be a string or a LocalizedText object with a text property
          placeName = typeof place.displayName === 'string' 
            ? place.displayName 
            : (place.displayName as any)?.text || ''
        }
        
        // Fallback to main_text from suggestion if displayName is not available
        // main_text from autocomplete should be the place name (e.g., "Hilton Hotel")
        // not the address (e.g., "515 15th St NW")
        if (!placeName && suggestion.structured_formatting?.main_text) {
          placeName = suggestion.structured_formatting.main_text
        }

        // Convert new Place object to legacy PlaceResult format for compatibility
        // The new Place API uses different property names and structures
        // Place.location is a LatLng object with lat() and lng() methods
        const location = place.location
        const formattedAddress = place.formattedAddress || ''
        
        // Only use placeName if it's different from the formatted address
        // Also check if placeName looks like an address (contains numbers and common address words)
        // This prevents using the address as the name
        const looksLikeAddress = placeName && (
          placeName === formattedAddress ||
          /^\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Cir|Circle)/i.test(placeName)
        )
        const finalName = placeName && !looksLikeAddress ? placeName : ''
        
        const placeResult: google.maps.places.PlaceResult = {
          place_id: place.id || suggestion.place_id,
          name: finalName,
          formatted_address: formattedAddress,
          address_components: place.addressComponents?.map((comp) => ({
            long_name: comp.longText || '',
            short_name: comp.shortText || '',
            types: comp.types || [],
          })) || [],
          geometry: location
            ? {
                location: location, // LatLng object is compatible
              }
            : undefined,
        }

        // Validate place has required data
        if (!isPlaceResult(placeResult) || !placeResult.place_id) {
          setApiError('Invalid place data received')
          setIsLoading(false)
          return
        }

        // Fetch details if missing
        if (!hasAddressComponents(placeResult)) {
          setApiError('Place details incomplete')
          setIsLoading(false)
          return
        }

        // Parse address
        const address = parsePlace(placeResult)
        if (!address || !validateStructuredAddress(address)) {
          setApiError('Could not parse address components')
          setIsLoading(false)
          return
        }

        // Validate country restrictions
        if (countryRestrictions && countryRestrictions.length > 0) {
          const countryComponent = placeResult.address_components?.find((c) =>
            c.types.includes('country')
          )
          if (
            countryComponent &&
            !countryRestrictions.includes(countryComponent.short_name.toLowerCase())
          ) {
            setApiError(`This location is outside the allowed countries`)
            setIsLoading(false)
            return
          }
        }

        // Reset session token after successful selection
        sessionTokenRef.current = null

        // Update state
        setSelectedPlace(address)
        // Don't set inputValue here - let the parent control it via onChange callback
        // The parent can call onInputChange with whatever display value they want
        setShowSuggestions(false)
        setSelectedIndex(-1)
        setIsLoading(false)
        setApiError(null)

        // Call onChange - parent is responsible for setting the display value
        // via calling onInputChange with their desired value (name or address)
        onChange(address, placeResult)
        
        // Update previousValueRef to prevent sync effect from overwriting
        // after parent sets the value
        previousValueRef.current = ''
      } catch (err) {
        if (mountedRef.current) {
          console.error('Place selection error:', err)
          setApiError(err instanceof Error ? err.message : 'Failed to select place')
          setIsLoading(false)
        }
      }
    },
    [onChange, onInputChange, countryRestrictions]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === 'ArrowDown' && inputValue.length >= 2) {
          e.preventDefault()
          setShowSuggestions(true)
          setSelectedIndex(0)
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => {
          if (suggestions.length === 0) return -1
          return Math.min(prev + 1, suggestions.length - 1)
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handlePlaceSelect(suggestions[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    },
    [showSuggestions, suggestions, selectedIndex, inputValue, handlePlaceSelect]
  )

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Update dropdown position on scroll/resize
  useEffect(() => {
    if (showSuggestions) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showSuggestions, updatePosition])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel()
      }
    }
  }, [])

  // Fallback mode: render as regular input
  if (fallbackMode) {
    return (
      <>
        {apiError && (
          <div
            className="pa-card pa-mb-2"
            style={{
              background: 'var(--pa-warning-bg, #fff3cd)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            {apiError}. You can enter the address manually below.
          </div>
        )}
        <Input
          label={label}
          helper={helper}
          error={error}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            onInputChange?.(e.target.value)
          }}
        />
      </>
    )
  }

  // Render autocomplete
  return (
    <div ref={containerRef} className="pa-form-group" style={{ position: 'relative' }}>
      {label && (
        <label className={`oa-label ${required ? 'oa-label--required' : ''}`}>{label}</label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className={`pa-input ${error ? 'pa-input--error' : ''}`.trim()}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
              updatePosition()
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => {
              if (
                !suggestionsRef.current?.contains(document.activeElement) &&
                !containerRef.current?.contains(document.activeElement)
              ) {
                setShowSuggestions(false)
              }
            }, 200)
          }}
          placeholder={placeholder}
          disabled={disabled || !isLoaded}
          required={required}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
          aria-controls="suggestions-list"
          aria-label={label || placeholder}
          aria-autocomplete="list"
        />

        {isLoading && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pa-n500)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              hourglass_empty
            </span>
          </span>
        )}

        {inputValue && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setInputValue('')
              setSuggestions([])
              setShowSuggestions(false)
              setSelectedPlace(null)
              onInputChange?.('')
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--pa-n500)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Clear input"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        )}
      </div>

      {(helper || error || apiError) && (
        <div className={`pa-helper ${error || apiError ? 'pa-helper--error' : ''}`}>
          {error || apiError || helper}
        </div>
      )}

      {/* Suggestions dropdown via portal */}
      {showSuggestions &&
        (suggestions.length > 0 || isLoading) &&
        createPortal(
          <ul
            ref={suggestionsRef}
            id="suggestions-list"
            role="listbox"
            aria-live="polite"
            style={{
              position: 'absolute',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 1500,
              background: 'white',
              border: '1px solid var(--pa-n200, #e0e0e0)',
              borderRadius: '8px',
              marginTop: '4px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              listStyle: 'none',
              padding: '4px 0',
              margin: 0,
            }}
          >
            {isLoading && (
              <li
                style={{
                  padding: '12px 16px',
                  color: 'var(--pa-n500)',
                  fontSize: '14px',
                }}
              >
                Searching...
              </li>
            )}
            {!isLoading && suggestions.length === 0 && (
              <li
                style={{
                  padding: '12px 16px',
                  color: 'var(--pa-n500)',
                  fontSize: '14px',
                }}
              >
                No results found
              </li>
            )}
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.place_id}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handlePlaceSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? 'var(--pa-n100, #f5f5f5)' : 'transparent',
                  fontSize: '14px',
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--pa-n900, #212121)' }}>
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </div>
                {suggestion.structured_formatting?.secondary_text && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--pa-n600, #757575)',
                      marginTop: '2px',
                    }}
                  >
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                )}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  )
}

