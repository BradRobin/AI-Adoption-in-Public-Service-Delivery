'use client'

import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Controller } from 'react-hook-form'

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
] as const

type LikertScaleProps<T extends FieldValues> = {
  name: FieldPath<T>
  control: Control<T>
  label: string
  error?: string
}

export function LikertScale<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: LikertScaleProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: 'This question is required.' }}
      render={({ field }) => (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-white/90">{label}</legend>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {LIKERT_OPTIONS.map((opt) => {
              const isSelected = field.value === opt.value
              return (
                <label
                  key={opt.value}
                  className={`flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-xs transition-colors sm:min-w-0 sm:flex-1 sm:px-4 sm:text-sm ${
                    isSelected
                      ? 'border-white/50 bg-white/10'
                      : 'border-white/10 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                    onBlur={field.onBlur}
                    className="sr-only"
                  />
                  <span className="text-center font-medium text-white">
                    {opt.value}
                  </span>
                  <span className="ml-1 hidden text-white/80 sm:inline">
                    — {opt.label}
                  </span>
                </label>
              )
            })}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </fieldset>
      )}
    />
  )
}
