import { useEffect, useState } from 'react'
import { Plus, Trash2, PackageSearch, TriangleAlert, Building2 } from 'lucide-react'
import { api } from '../lib/api'

const emptyForm = {
  name: '',
  category: '세정용품',
  scope: '본사',
  quantity: '',
  unit: '개',
  minQuantity: '',
  location: ''
}
const CATEGORIES = ['세정용품', '소모품', '장비', '안전보호구', '기타']

export default function Inventory() {
  const [items, setItems] = useState([])
  const [siteNames, setSiteNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [category, setCategory] = useState('전체')
  const [scopeFilter, setScopeFilter] = useState('전체')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([api.listInventory(), api.getAttendanceSummary().catch(() => ({ allSiteNames: [] }))])
      .then(([inv, att]) => {
        setItems(inv.items || [])
        setSiteNames(att.allSiteNames || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const scopeOptions = ['본사', ...siteNames]

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('품목명을 입력해주세요.')
      return
    }
    if (form.quantity === '') {
      setError('수량을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      await api.upsertInventoryItem(form)
      setForm((f) => ({ ...emptyForm, scope: f.scope })) // 방금 고른 위치는 유지
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id) => {
    try {
      await api.deleteInventoryItem(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const visible = items.filter((i) => {
    if (category !== '전체' && i.category !== category) return false
    if (scopeFilter !== '전체' && (i.scope || '본사') !== scopeFilter) return false
    return true
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-base-100">재고 현황</h1>
        <p className="mt-1 text-sm text-base-400">본사·현장별로 세정용품·소모품·장비 재고를 등록하고 관리합니다.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-500">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-base-800 bg-base-950 p-4 sm:grid-cols-6">
        <input
          className="focus-ring col-span-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm placeholder:text-base-500 sm:col-span-2"
          placeholder="품목명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          value={form.scope}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
        >
          {scopeOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="수량"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="단위 (개/box..)"
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <input
          type="number"
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="최소 재고"
          value={form.minQuantity}
          onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
        />
        <input
          className="focus-ring col-span-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm sm:col-span-4"
          placeholder="세부 위치 (예: 창고 A, 2층 청소함)"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-mist-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50 sm:col-span-2"
        >
          <Plus size={16} /> {submitting ? '등록 중…' : '등록'}
        </button>
      </form>

      <div className="mb-3 flex flex-wrap gap-2">
        {['전체', '본사', ...siteNames].map((s) => (
          <button
            key={s}
            onClick={() => setScopeFilter(s)}
            className={`focus-ring flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
              scopeFilter === s ? 'bg-mist-500/15 text-mist-500' : 'border border-base-800 text-base-400 hover:bg-base-800'
            }`}
          >
            {s !== '전체' && <Building2 size={11} />}
            {s}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['전체', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`focus-ring rounded-full px-3 py-1 text-xs ${
              category === c ? 'bg-base-800 text-base-100' : 'border border-base-800 text-base-400 hover:bg-base-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-base-800 bg-base-950">
        {loading ? (
          <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-base-500">
            <PackageSearch size={28} />
            <p className="text-sm">등록된 재고가 없어요.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-800 text-left text-xs text-base-500">
                <th className="px-4 py-3 font-medium">품목</th>
                <th className="px-4 py-3 font-medium">위치</th>
                <th className="px-4 py-3 font-medium">분류</th>
                <th className="px-4 py-3 font-medium">수량</th>
                <th className="px-4 py-3 font-medium">세부위치</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const low = item.minQuantity && item.quantity <= item.minQuantity
                return (
                  <tr key={item.id} className="border-b border-base-800/60 last:border-0">
                    <td className="px-4 py-3 text-base-100">{item.name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-base-400">
                        <Building2 size={11} className="text-teal-500" /> {item.scope || '본사'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base-400">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'flex items-center gap-1 text-amber-500' : 'text-base-200'}>
                        {low && <TriangleAlert size={13} />}
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base-400">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(item.id)} className="focus-ring text-base-500 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
