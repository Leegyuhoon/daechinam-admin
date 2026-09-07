import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Plus,
  Trash2,
  Pencil,
  X,
  Copy,
  Check,
  Building2,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  Table2
} from 'lucide-react'
import { api } from '../lib/api'

const emptySection = () => ({
  id: crypto.randomUUID(),
  type: 'text', // 'text' | 'table'
  title: '',
  body: '',
  columns: ['항목', '내용'],
  rows: [['', '']]
})
const emptyReport = () => ({ companyName: '', password: '', sections: [emptySection()] })

function PasswordGate({ onOk }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setChecking(true)
    try {
      await api.verifyClientAdminPassword(pw)
      onOk()
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-base-800 bg-base-950 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
            <Lock size={16} />
          </div>
          <p className="text-sm font-semibold text-base-100">업체 보고 관리</p>
        </div>
        <p className="mb-4 text-xs text-base-400">업체별 보고 카테고리를 만들고 관리하려면 비밀번호가 필요해요.</p>
        <input
          type="password"
          autoFocus
          className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm"
          placeholder="관리자 비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}
        <button
          type="submit"
          disabled={checking}
          className="focus-ring mt-3 w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
        >
          {checking ? '확인 중…' : '들어가기'}
        </button>
      </form>
    </div>
  )
}

function TableEditor({ section, onChange }) {
  const columns = section.columns?.length ? section.columns : ['항목', '내용']
  const rows = section.rows?.length ? section.rows : [columns.map(() => '')]

  const updateColumn = (i, value) => {
    const next = [...columns]
    next[i] = value
    onChange({ ...section, columns: next })
  }
  const addColumn = () => onChange({ ...section, columns: [...columns, ''], rows: rows.map((r) => [...r, '']) })
  const removeColumn = (i) =>
    onChange({
      ...section,
      columns: columns.filter((_, idx) => idx !== i),
      rows: rows.map((r) => r.filter((_, idx) => idx !== i))
    })

  const updateCell = (ri, ci, value) => {
    const next = rows.map((r) => [...r])
    next[ri][ci] = value
    onChange({ ...section, rows: next })
  }
  const addRow = () => onChange({ ...section, rows: [...rows, columns.map(() => '')] })
  const removeRow = (ri) => onChange({ ...section, rows: rows.filter((_, idx) => idx !== ri) })

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="border border-base-700 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={c}
                      onChange={(e) => updateColumn(i, e.target.value)}
                      className="focus-ring w-full rounded bg-base-950 px-1.5 py-1 text-xs"
                      placeholder={`열 ${i + 1}`}
                    />
                    {columns.length > 1 && (
                      <button onClick={() => removeColumn(i)} className="text-base-500 hover:text-red-500">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 border border-base-700 p-1">
                <button onClick={addColumn} className="text-base-500 hover:text-mist-500">
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {columns.map((_, ci) => (
                  <td key={ci} className="border border-base-700 p-1">
                    <input
                      value={row[ci] || ''}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="focus-ring w-full rounded bg-base-950 px-1.5 py-1 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-base-700 p-1 text-center">
                  <button onClick={() => removeRow(ri)} className="text-base-500 hover:text-red-500">
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="focus-ring mt-1.5 flex items-center gap-1 text-[11px] text-base-400 hover:text-mist-500"
      >
        <Plus size={11} /> 행 추가
      </button>
    </div>
  )
}

function SectionEditor({ section, onChange, onRemove }) {
  const setType = (type) => onChange({ ...section, type })

  return (
    <div className="rounded-lg border border-base-800 bg-base-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <input
          className="focus-ring flex-1 rounded-md border border-base-700 bg-base-950 px-2 py-1.5 text-sm"
          placeholder="섹션 제목 (예: 서비스 품질지표(KPI))"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
        />
        <div className="flex items-center rounded-md border border-base-700 bg-base-950 p-0.5">
          <button
            onClick={() => setType('text')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
              section.type !== 'table' ? 'bg-mist-500/15 text-mist-500' : 'text-base-400'
            }`}
          >
            <AlignLeft size={12} /> 텍스트
          </button>
          <button
            onClick={() => setType('table')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
              section.type === 'table' ? 'bg-mist-500/15 text-mist-500' : 'text-base-400'
            }`}
          >
            <Table2 size={12} /> 표
          </button>
        </div>
        <button onClick={onRemove} className="focus-ring text-base-500 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>

      {section.type === 'table' ? (
        <TableEditor section={section} onChange={onChange} />
      ) : (
        <textarea
          className="focus-ring w-full rounded-md border border-base-700 bg-base-950 px-2 py-1.5 text-sm"
          placeholder="내용"
          rows={4}
          value={section.body}
          onChange={(e) => onChange({ ...section, body: e.target.value })}
        />
      )}
    </div>
  )
}

function ReportForm({ initialReport, onSaved, onCancel }) {
  const [report, setReport] = useState(initialReport || emptyReport())
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const updateSection = (id, next) =>
    setReport((r) => ({ ...r, sections: r.sections.map((s) => (s.id === id ? next : s)) }))
  const addSection = () => setReport((r) => ({ ...r, sections: [...r.sections, emptySection()] }))
  const removeSection = (id) => setReport((r) => ({ ...r, sections: r.sections.filter((s) => s.id !== id) }))

  const save = async () => {
    setError(null)
    if (!report.companyName.trim() || !report.password.trim()) {
      setError('업체명과 비밀번호를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await api.upsertClientReport(report)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <p className="mb-3 text-sm font-medium text-base-200">
        {initialReport ? '업체 보고 수정' : '새 업체 보고 등록'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="업체명 (예: 메트라이프 본사)"
          value={report.companyName}
          onChange={(e) => setReport({ ...report, companyName: e.target.value })}
        />
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="이 업체 담당자에게 알려줄 비밀번호"
          value={report.password}
          onChange={(e) => setReport({ ...report, password: e.target.value })}
        />
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-medium text-base-300">보고 내용 (섹션마다 텍스트 또는 표 선택)</p>
        {report.sections.map((s) => (
          <SectionEditor
            key={s.id}
            section={s}
            onChange={(next) => updateSection(s.id, next)}
            onRemove={() => removeSection(s.id)}
          />
        ))}
        <button
          onClick={addSection}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-dashed border-base-700 px-3 py-2 text-xs text-base-400 hover:border-mist-500 hover:text-mist-500"
        >
          <Plus size={14} /> 섹션 추가
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-amber-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="focus-ring rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
        >
          {saving ? '저장 중…' : initialReport ? '수정 저장' : '등록'}
        </button>
        <button onClick={onCancel} className="focus-ring rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300">
          취소
        </button>
      </div>
    </div>
  )
}

function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한이 없으면 조용히 무시
    }
  }
  return (
    <button
      onClick={copy}
      className="focus-ring flex items-center gap-1 rounded-full border border-base-800 px-2 py-1 text-[11px] text-base-400 hover:bg-base-800"
    >
      {copied ? <Check size={11} className="text-mist-500" /> : <Copy size={11} />}
      {copied ? '복사됨' : '링크 복사'}
    </button>
  )
}

function SectionPreview({ s }) {
  if (s.type === 'table') {
    const columns = s.columns || []
    const rows = s.rows || []
    return (
      <div className="overflow-x-auto rounded-lg bg-base-900 p-3">
        <p className="mb-2 text-xs font-medium text-base-200">{s.title}</p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="border border-base-800 bg-base-950 p-1.5 text-left text-base-300">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-base-800 p-1.5 text-base-400">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <div className="rounded-lg bg-base-900 p-3">
      <p className="mb-1 text-xs font-medium text-base-200">{s.title}</p>
      <p className="whitespace-pre-line text-xs text-base-400">{s.body}</p>
    </div>
  )
}

export default function ClientReports() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [checkingStored, setCheckingStored] = useState(true)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    api.listClientReports().then(({ items }) => setReports(items)).finally(() => setLoading(false))
  }

  useEffect(() => {
    const stored = localStorage.getItem('daechinam_client_admin_pw')
    if (stored) {
      api
        .verifyClientAdminPassword(stored)
        .then(() => setUnlocked(true))
        .catch(() => {})
        .finally(() => setCheckingStored(false))
    } else {
      setCheckingStored(false)
    }
  }, [])

  useEffect(() => {
    if (unlocked) load()
  }, [unlocked])

  const openNew = () => {
    setEditingReport(null)
    setShowForm(true)
  }
  const openEdit = (r) => {
    setEditingReport(r)
    setShowForm(true)
  }
  const remove = async (id) => {
    if (!confirm('이 업체 보고를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    await api.deleteClientReport(id)
    load()
  }

  if (checkingStored) return null
  if (!unlocked) return <PasswordGate onOk={() => setUnlocked(true)} />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-base-100">업체 보고</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            onClick={() => (showForm ? setShowForm(false) : openNew())}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <Plus size={14} /> 업체 추가
          </button>
          <button
            onClick={() => {
              api.clearClientAdminPassword()
              setUnlocked(false)
            }}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ReportForm
            key={editingReport?.id || 'new'}
            initialReport={editingReport}
            onSaved={() => {
              setShowForm(false)
              setEditingReport(null)
              load()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingReport(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-base-800 bg-base-950 p-10 text-base-500">
          <Building2 size={28} />
          <p className="text-sm">등록된 업체 보고가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const isOpen = openId === r.id
            const link = `${window.location.origin}/client-report?id=${r.id}`
            return (
              <div key={r.id} className="rounded-xl border border-base-800 bg-base-950 shadow-sm">
                <button
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <div>
                      <p className="font-medium text-base-100">{r.companyName}</p>
                      <p className="text-xs text-base-400">섹션 {r.sections?.length || 0}개</p>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-base-800 p-4 pt-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-base-900 px-3 py-2">
                      <span className="truncate text-xs text-base-400">{link}</span>
                      <CopyLinkButton url={link} />
                    </div>
                    <p className="mb-3 text-xs text-base-500">
                      비밀번호: <span className="font-medium text-base-300">{r.password}</span> — 이 링크와 비밀번호를 업체 담당자에게 전달하세요.
                    </p>

                    <div className="mb-3 space-y-2">
                      {(r.sections || []).map((s) => (
                        <SectionPreview key={s.id} s={s} />
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="focus-ring flex items-center gap-1 text-xs text-base-500 hover:text-mist-500"
                      >
                        <Pencil size={12} /> 수정
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="focus-ring flex items-center gap-1 text-xs text-base-500 hover:text-red-500"
                      >
                        <X size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
