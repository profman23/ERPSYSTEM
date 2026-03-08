import * as React from "react"

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}

interface RadioGroupItemProps {
  value: string
  id?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

const RadioGroupContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  disabled: boolean
} | null>(null)

export function RadioGroup({ value, onValueChange, className = "", disabled = false, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export function RadioGroupItem({ value, id, className = "", disabled: itemDisabled, children }: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)

  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup")
  }

  const { value: selectedValue, onValueChange, disabled: groupDisabled } = context
  const isSelected = value === selectedValue
  const isDisabled = itemDisabled ?? groupDisabled
  const itemId = id || `radio-${value}`

  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        id={itemId}
        disabled={isDisabled}
        className={`
          h-4 w-4 rounded-full border
          ${isSelected
            ? 'border-blue-600 bg-blue-600'
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors
          flex items-center justify-center
        `}
        onClick={() => !isDisabled && onValueChange(value)}
      >
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-white" />
        )}
      </button>
      {children && (
        <label
          htmlFor={itemId}
          className={`ml-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {children}
        </label>
      )}
    </div>
  )
}
