import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, Building2 } from 'lucide-react'
import { api } from '../lib/api'

export default function ClientReportView() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [data, setData] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!id) {
      setError('링크가 올바르지 않아요. 전달받은 링크로 다시 접속해주세요.')
      return
    }
    setChecking(true)
    try {
      const res = await api.viewClientReport(id, pw)
      setData(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-900 px-4">
        <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-base-800 bg-base-950 p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
              <Lock size={16} />
            </div>
            <p className="text-sm font-semibold text-base-100">업체 보고 조회</p>
          </div>
          <p className="mb-4 text-xs text-base-400">전달받으신 비밀번호를 입력해주세요.</p>
          <input
            type="password"
            autoFocus
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="focus-ring mt-3 w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
          >
            {checking ? '확인 중…' : '확인하기'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-900 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">{data.companyName}</p>
            <p className="text-xs text-base-400">업체 보고</p>
          </div>
        </div>

        <div className="space-y-3">
          {(data.sections || []).map((s, i) => (
            <div key={i} className="rounded-xl border border-base-800 bg-base-950 p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-base-100">{s.title}</p>
              <p className="whitespace-pre-line text-sm text-base-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
