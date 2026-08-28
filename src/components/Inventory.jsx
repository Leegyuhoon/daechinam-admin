import { useEffect, useState } from 'react'
import { Plus, Trash2, PackageSearch, TriangleAlert } from 'lucide-react'
import { api } from '../lib/api'

const emptyForm = { name: '', category: '세정용품', quantity: '', unit: '개', minQuantity: '', location: '' }
const CATEGORIES = ['세정용품', '소모품', '장비', '안전보호구', '기타']

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState('전체')

  const load = () => {
    setLoading(true)
    api.listInventory().then(({ items }) => setItems(items)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || form.quantity === '') return
    await api.upsertInventoryItem(form)
    setForm(emptyForm)
    load()
  }

  const remove = async (id) => {
    await api.deleteInventoryItem(id)
    load()
  }

  const visible = filter === '전체' ? items : items.filter((i) => i.category === filter)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-base-100">재고 현황</h1>
        <p className="mt-1 text-sm text-base-400">세정용품·소모품·장비 재고를 등록하고 관리합니다.</p>
      </div>

      <form onSubmit={submit} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-base-800 bg-base-950 p-4 sm:grid-cols-6">
        <input
          className="focus-ring col-span-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm placeholder:text-base-500 sm:col-span-2"
          placeholder="품목명"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
          className="focus-ring col-span-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm sm:col-span-3"
          placeholder="보관 위치"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button
          type="submit"
          className="focus-ring col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-mist-500 px-3 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 sm:col-span-3"
        >
          <Plus size={16} /> 등록
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {['전체', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`focus-ring rounded-full px-3 py-1 text-xs ${
              filter === c ? 'bg-mist-500/15 text-mist-400' : 'border border-base-800 text-base-400 hover:bg-base-800'
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
                <th className="px-4 py-3 font-medium">분류</th>
                <th className="px-4 py-3 font-medium">수량</th>
                <th className="px-4 py-3 font-medium">위치</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const low = item.minQuantity && item.quantity <= item.minQuantity
                return (
                  <tr key={item.id} className="border-b border-base-800/60 last:border-0">
                    <td className="px-4 py-3 text-base-100">{item.name}</td>
                    <td className="px-4 py-3 text-base-400">{item.category}</td>
                    <td className="px-4 py-3">
                      <span className={low ? 'flex items-center gap-1 text-amber-400' : 'text-base-200'}>
                        {low && <TriangleAlert size={13} />}
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-base-400">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(item.id)} className="focus-ring text-base-500 hover:text-red-400">
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
