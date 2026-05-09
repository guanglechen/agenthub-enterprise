import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, X } from 'lucide-react'
import { MAX_SEARCH_QUERY_LENGTH } from '@/shared/lib/search-query'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'

interface SearchBarProps {
  defaultValue?: string
  value?: string
  placeholder?: string
  isSearching?: boolean
  onChange?: (query: string) => void
  onSearch?: (query: string) => void
}

/**
 * Shared search bar used by search-driven pages and landing surfaces.
 *
 * It supports both controlled and uncontrolled usage so page-level containers can decide whether
 * query text should be driven from URL state or local form state.
 */
export function SearchBar({ defaultValue = '', value, placeholder, isSearching = false, onChange, onSearch }: SearchBarProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(defaultValue)
  const isControlled = value !== undefined
  const currentQuery = isControlled ? value : query

  useEffect(() => {
    if (!isControlled) {
      setQuery(defaultValue)
    }
  }, [defaultValue, isControlled])

  const handleChange = (nextQuery: string) => {
    if (!isControlled) {
      setQuery(nextQuery)
    }
    onChange?.(nextQuery)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(currentQuery)
    }
  }

  const handleClear = () => {
    handleChange('')
    onSearch?.('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-3 rounded-[22px] border border-slate-200/90 bg-white/95 p-2 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.45)]"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={currentQuery}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          placeholder={placeholder || t('searchBar.placeholder')}
          className="h-12 rounded-2xl border-0 bg-transparent pl-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {currentQuery ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            aria-label={t('searchBar.clear')}
            title={t('searchBar.clear')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="px-8 min-w-28" disabled={isSearching}>
        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('searchBar.button')}
      </Button>
    </form>
  )
}
