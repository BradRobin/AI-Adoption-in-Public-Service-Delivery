/**
 * @file CountySelect.tsx
 * @description Accessible, searchable dropdown component for selecting Kenyan counties.
 * Features keyboard navigation, search filtering, and screen reader support.
 * Used in signup, profile, and other forms requiring location selection.
 */

'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { KENYAN_COUNTIES } from '@/data/kenyan-counties'
import { ChevronDown, Search, X } from 'lucide-react'

/**
 * Props for the CountySelect component.
 */
type CountySelectProps = {
  /** Currently selected county value */
  value: string
  /** Callback fired when selection changes */
  onChange: (value: string) => void
  /** Optional input field ID for label association */
  id?: string
  /** Placeholder text when no county is selected */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * CountySelect Component
 * A searchable dropdown for selecting one of the 47 Kenyan counties.
 * Accessible and responsive with keyboard navigation support.
 */
export function CountySelect({
  value,
  onChange,
  id = 'county-select',
  placeholder = 'Select your county',
  className = '',
}: CountySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const sortedCounties = useMemo(
    () => [...KENYAN_COUNTIES].sort((a, b) => a.localeCompare(b)),
    []
  )

  // Filter counties based on search query
  const filteredCounties = useMemo(() => {
    if (!searchQuery.trim()) return sortedCounties

    const query = searchQuery.toLowerCase()
    const startsWithMatches: string[] = []
    const containsMatches: string[] = []

    sortedCounties.forEach((county) => {
      const countyLower = county.toLowerCase()

      if (countyLower.startsWith(query)) {
        startsWithMatches.push(county)
      } else if (countyLower.includes(query)) {
        containsMatches.push(county)
      }
    })

    return [...startsWithMatches, ...containsMatches]
  }, [searchQuery, sortedCounties])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedItem = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setHighlightedIndex(0)
  }

  const handleSelect = (county: string) => {
    onChange(county)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredCounties.length - 1 ? prev + 1 : prev
          )
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        event.preventDefault()
        if (isOpen && filteredCounties[highlightedIndex]) {
          handleSelect(filteredCounties[highlightedIndex])
        } else {
          setIsOpen(true)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchQuery('')
        break
      case 'Tab':
        setIsOpen(false)
        setSearchQuery('')
        break
    }
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-label={value || placeholder}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-left text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-white/40"
      >
        <span className={value ? 'text-white' : 'text-black/60'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-[#101010]/98 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/3 px-3 py-3">
            <Search size={14} className="text-white/45" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search counties..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-black/60"
              aria-label="Search counties"
            />
          </div>

          {/* County List */}
          <div
            ref={listRef}
            className="max-h-52 overflow-y-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {filteredCounties.length === 0 ? (
              <div className="px-3 py-3 text-center text-sm text-white/45">
                No counties found
              </div>
            ) : (
              filteredCounties.map((county, index) => (
                <div
                  key={county}
                  onClick={() => handleSelect(county)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    index === highlightedIndex
                      ? 'bg-green-500/22 text-green-300'
                      : value === county
                        ? 'bg-white/10 text-white'
                        : 'text-white/78 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {county}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
