import { useState, useEffect } from 'react'
import { X, TrendingDown, TrendingUp, Briefcase, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ipc } from '../lib/ipc'
import { Field, inputCls } from './Modal'

type EntryType = 'debit' | 'credit' | 'project'

interface Props {
  onClose: () => void
}

const todayStr = () => new Date().toISOString().split('T')[0]

export default function QuickAddModal({ onClose }: Props) {
  const [step, setStep] = useState<'pick' | 'form'>('pick')
  const [type, setType] = useState<EntryType | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [debit, setDebit] = useState({ date: todayStr(), particulars: '', amount: '' })
  const [credit, setCredit] = useState({ date: todayStr(), reference: '', purpose: '', particulars: '', amount: '' })
  const [project, setProject] = useState({
    projectCode: '', subject: '', submitDate: todayStr(), receiveDate: '',
    chequeNumber: '', chequeDate: '', bank: '', amount: ''
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function selectType(t: EntryType) {
    setType(t)
    setStep('form')
  }

  async function handleSubmit() {
    if (type === 'debit') {
      if (!debit.date || !debit.particulars || !debit.amount) return toast.error('All fields are required')
      const amount = parseFloat(debit.amount)
      if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount')
      setSubmitting(true)
      try {
        await ipc.debit.add({ date: debit.date, particulars: debit.particulars, amount })
        toast.success('Debit entry added')
        window.dispatchEvent(new CustomEvent('quick-add-success', { detail: { type: 'debit' } }))
        onClose()
      } catch (e: any) { toast.error(e.message ?? 'Failed to add') }
      setSubmitting(false)
    } else if (type === 'credit') {
      if (!credit.date || !credit.particulars || !credit.amount) return toast.error('Date, Particulars and Amount are required')
      const amount = parseFloat(credit.amount)
      if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount')
      setSubmitting(true)
      try {
        await ipc.credit.add({
          date: credit.date,
          reference: credit.reference || undefined,
          purpose: credit.purpose || undefined,
          particulars: credit.particulars,
          amount
        })
        toast.success('Credit entry added')
        window.dispatchEvent(new CustomEvent('quick-add-success', { detail: { type: 'credit' } }))
        onClose()
      } catch (e: any) { toast.error(e.message ?? 'Failed to add') }
      setSubmitting(false)
    } else if (type === 'project') {
      if (!project.projectCode || !project.subject || !project.submitDate || !project.bank || !project.amount)
        return toast.error('Required fields missing')
      const amount = parseFloat(project.amount)
      if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount')
      setSubmitting(true)
      try {
        await ipc.project.add({
          projectCode: project.projectCode, subject: project.subject,
          submitDate: project.submitDate, receiveDate: project.receiveDate || undefined,
          chequeNumber: project.chequeNumber ? parseInt(project.chequeNumber) : undefined,
          chequeDate: project.chequeDate || undefined,
          bank: project.bank, amount
        })
        toast.success('Project added — credit entry auto-created (90%)')
        window.dispatchEvent(new CustomEvent('quick-add-success', { detail: { type: 'project' } }))
        onClose()
      } catch (e: any) { toast.error(e.message ?? 'Failed to add') }
      setSubmitting(false)
    }
  }

  const previewReceived = project.amount ? (parseFloat(project.amount) * 0.9).toFixed(2) : '0.00'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <button
                onClick={() => setStep('pick')}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors mr-1"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-800">
              {step === 'pick'
                ? 'Add Entry'
                : type === 'debit' ? 'Add Debit (খরচ)' : type === 'credit' ? 'Add Credit (জমা)' : 'Add Project'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 'pick' ? (
            <div className="grid grid-cols-3 gap-3">
              <TypeCard
                label="Debit"
                sub="খরচ"
                icon={<TrendingDown size={28} />}
                color="red"
                onClick={() => selectType('debit')}
              />
              <TypeCard
                label="Credit"
                sub="জমা"
                icon={<TrendingUp size={28} />}
                color="green"
                onClick={() => selectType('credit')}
              />
              <TypeCard
                label="Project"
                sub="প্রজেক্ট"
                icon={<Briefcase size={28} />}
                color="blue"
                onClick={() => selectType('project')}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {type === 'debit' && (
                <>
                  <Field label="Date" required>
                    <input type="date" value={debit.date} onChange={e => setDebit(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Particulars" required>
                    <input type="text" value={debit.particulars} onChange={e => setDebit(f => ({ ...f, particulars: e.target.value }))} className={inputCls} placeholder="Description" />
                  </Field>
                  <Field label="Amount (Tk)" required>
                    <input type="number" min="0.01" step="0.01" value={debit.amount} onChange={e => setDebit(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                  </Field>
                </>
              )}
              {type === 'credit' && (
                <>
                  <Field label="Date" required>
                    <input type="date" value={credit.date} onChange={e => setCredit(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Reference">
                    <input type="text" value={credit.reference} onChange={e => setCredit(f => ({ ...f, reference: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </Field>
                  <Field label="Purpose">
                    <input type="text" value={credit.purpose} onChange={e => setCredit(f => ({ ...f, purpose: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </Field>
                  <Field label="Particulars" required>
                    <input type="text" value={credit.particulars} onChange={e => setCredit(f => ({ ...f, particulars: e.target.value }))} className={inputCls} placeholder="Description" />
                  </Field>
                  <Field label="Amount (Tk)" required>
                    <input type="number" min="0.01" step="0.01" value={credit.amount} onChange={e => setCredit(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                  </Field>
                </>
              )}
              {type === 'project' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Project Code" required>
                      <input type="text" value={project.projectCode} onChange={e => setProject(f => ({ ...f, projectCode: e.target.value }))} className={inputCls} placeholder="e.g. PRJ-001" />
                    </Field>
                    <Field label="Bank" required>
                      <input type="text" value={project.bank} onChange={e => setProject(f => ({ ...f, bank: e.target.value }))} className={inputCls} placeholder="Bank name" />
                    </Field>
                  </div>
                  <Field label="Subject" required>
                    <input type="text" value={project.subject} onChange={e => setProject(f => ({ ...f, subject: e.target.value }))} className={inputCls} placeholder="Project subject / description" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Submit Date" required>
                      <input type="date" value={project.submitDate} onChange={e => setProject(f => ({ ...f, submitDate: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Receive Date">
                      <input type="date" value={project.receiveDate} onChange={e => setProject(f => ({ ...f, receiveDate: e.target.value }))} className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Cheque Number">
                      <input type="number" value={project.chequeNumber} onChange={e => setProject(f => ({ ...f, chequeNumber: e.target.value }))} className={inputCls} placeholder="Optional" />
                    </Field>
                    <Field label="Cheque Date">
                      <input type="date" value={project.chequeDate} onChange={e => setProject(f => ({ ...f, chequeDate: e.target.value }))} className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Amount (Tk)" required>
                      <input type="number" min="0.01" step="0.01" value={project.amount} onChange={e => setProject(f => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                    </Field>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Received Amount (90%)</label>
                      <div className={`${inputCls} bg-slate-50 text-green-700 font-semibold cursor-not-allowed`}>{previewReceived} Tk</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    A Credit (জমা) entry will be automatically created for the 90% received amount when you save.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface TypeCardProps {
  label: string
  sub: string
  icon: React.ReactNode
  color: 'red' | 'green' | 'blue'
  onClick: () => void
}

const colorMap = {
  red:   { card: 'border-red-200 hover:border-red-400 hover:bg-red-50',   icon: 'bg-red-100 text-red-600',   label: 'text-red-700' },
  green: { card: 'border-green-200 hover:border-green-400 hover:bg-green-50', icon: 'bg-green-100 text-green-600', label: 'text-green-700' },
  blue:  { card: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50', icon: 'bg-blue-100 text-blue-600', label: 'text-blue-700' },
}

function TypeCard({ label, sub, icon, color, onClick }: TypeCardProps) {
  const c = colorMap[color]
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer ${c.card}`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${c.icon}`}>
        {icon}
      </div>
      <div className="text-center">
        <p className={`font-semibold text-sm ${c.label}`}>{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
    </button>
  )
}
