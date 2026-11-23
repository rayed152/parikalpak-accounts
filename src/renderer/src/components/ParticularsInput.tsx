import { useState, useEffect, useMemo, useRef } from 'react'
import { Bookmark, X } from 'lucide-react'
import { ipc } from '../lib/ipc'
import { inputCls } from './Modal'

interface Props {
  type: 'debit' | 'credit' | 'project'
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function ParticularsInput({ type, value, onChange, placeholder }: Props) {
  const [items, setItems] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ipc.particulars.getAll(type).then(setItems)
  }, [type])

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => i.toLowerCase().includes(q))
  }, [items, value])

  const isSaved = items.some(i => i.toLowerCase() === value.trim().toLowerCase())
  const canSave = !!value.trim() && !isSaved

  async function saveItem() {
    if (!canSave) return
    const updated = await ipc.particulars.add(type, value.trim())
    setItems(updated)
  }

  async function deleteItem(label: string) {
    const updated = await ipc.particulars.delete(type, label)
    setItems(updated)
  }

  function selectItem(label: string) {
    onChange(label)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder={placeholder}
          className={`${inputCls} ${canSave ? 'pr-9' : ''}`}
        />
        {canSave && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); saveItem() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors"
            title="Save for reuse"
          >
            <Bookmark size={14} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <div
              key={item}
              className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 group cursor-pointer"
            >
              <span
                onMouseDown={e => { e.preventDefault(); selectItem(item) }}
                className="flex-1 text-sm text-slate-700 truncate select-none"
              >
                {item}
              </span>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); deleteItem(item) }}
                className="ml-2 p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Remove from saved"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
