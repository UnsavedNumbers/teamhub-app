interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number
  /** Optional label to show above the progress bar */
  label?: string
  /** Optional status message to show below the progress bar */
  status?: string
  /** Optional error message */
  error?: string
  /** Show percentage text */
  showPercentage?: boolean
  /** Custom className */
  className?: string
  /** Override fill color (e.g. 'var(--pa-info)' or '#3b82f6') */
  fillColor?: string
}

/**
 * ProgressBar - Shows async operation progress
 * 
 * Used for long-running operations like feature discovery sync.
 */
export function ProgressBar({
  value,
  label,
  status,
  error,
  showPercentage = true,
  className = '',
  fillColor,
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value))
  const percentage = Math.round(clampedValue)

  return (
    <div className={`pa-progress-bar ${className}`} style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="pa-body-s" style={{ color: 'var(--pa-n700)', fontWeight: 500 }}>
            {label}
          </span>
          {showPercentage && (
            <span className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'var(--pa-n100)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${clampedValue}%`,
            height: '100%',
            backgroundColor: error 
              ? 'var(--pa-danger)' 
              : fillColor ?? 'var(--pa-primary, #3b82f6)',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        />
      </div>
      
      {(status || error) && (
        <div style={{ marginTop: '8px' }}>
          {error ? (
            <span className="pa-body-s" style={{ color: 'var(--pa-danger)' }}>
              {error}
            </span>
          ) : (
            <span className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ProgressStep {
  label: string
  status?: string
}

interface MultiStepProgressBarProps {
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Array of step labels */
  steps: ProgressStep[]
  /** Optional error message */
  error?: string
  /** Custom className */
  className?: string
}

/**
 * MultiStepProgressBar - Shows progress through multiple steps
 * 
 * Used for complex operations with distinct phases.
 */
export function MultiStepProgressBar({
  currentStep,
  totalSteps,
  steps,
  error,
  className = '',
}: MultiStepProgressBarProps) {
  const clampedStep = Math.max(0, Math.min(totalSteps - 1, currentStep))
  const progress = ((clampedStep + 1) / totalSteps) * 100

  return (
    <div className={`pa-multi-step-progress ${className}`} style={{ width: '100%' }}>
      <ProgressBar
        value={progress}
        showPercentage={false}
        error={error}
      />
      
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, index) => {
          const isCompleted = index < clampedStep
          const isCurrent = index === clampedStep
          
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted
                    ? 'var(--pa-success)'
                    : isCurrent
                    ? 'var(--pa-primary)'
                    : 'var(--pa-n200)',
                  color: isCompleted || isCurrent ? 'white' : 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <div
                  className="pa-body-s"
                  style={{
                    color: isCurrent
                      ? 'var(--pa-n900)'
                      : isCompleted
                      ? 'var(--pa-n700)'
                      : 'var(--pa-n500)',
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {step.label}
                </div>
                {step.status && isCurrent && (
                  <div
                    className="pa-body-xs"
                    style={{
                      color: 'var(--pa-n500)',
                      marginTop: '2px',
                    }}
                  >
                    {step.status}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
