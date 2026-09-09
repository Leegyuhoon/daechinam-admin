import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  X,
  Users,
  Wallet,
  Image as ImageIcon,
  Video,
  UploadCloud,
  Loader2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Lock
} from 'lucide-react'
import { api } from '../lib/api'

const emptyJob = {
  siteName: '',
  date: '',
  employeeCount: '',
  dayWorkerCount: '',
  dayWorkerRate: '',
  workDescription: '',
  media: []
}

const won = (n) => `${(n || 0).toLocaleString('ko-KR')}원`

function MediaUploader({ media, onAdd }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setError(null)
    for (const file of files) {
      const kind = file.type.startsWith('video') ? 'video' : 'photo'
      setUploading(true)
      setProgress(0)
      try {
        const res = await api.uploadSpotMedia(file, kind, setProgress)
        onAdd({ id: res.id, url: res.url, kind: res.kind, filename: res.filename })
      } catch (err) {
        setError(err.message)
      } finally {
        setUploading(false)
      }
    }
    e.target.value = ''
  }

  return (
    <div>
      <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-base-700 px-3 py-4 text-sm text-base-400 hover:border-mist-500 hover:text-mist-500">
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> 업로드 중… {progress}%
          </>
        ) : (
          <>
            <UploadCloud size={16} /> 사진·영상 추가 (여러 개 선택 가능)
          </>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFiles}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border border-base-800 bg-base-900">
              {m.kind === 'video' ? (
                <video src={m.url} className="aspect-square w-full object-cover" muted />
              ) : (
                <img src={m.url} alt={m.filename} className="aspect-square w-full object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function JobForm({ initialJob, onSaved, onCancel }) {
  const [job, setJob] = useState(initialJob || emptyJob)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const total = (Number(job.dayWorkerCount) || 0) * (Number(job.dayWorkerRate) || 0)

  const save = async () => {
    setError(null)
    if (!job.siteName.trim() || !job.date) {
      setError('현장명과 날짜를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await api.upsertSpotJob(job)
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
        {initialJob ? '일회성 현장근무 수정' : '일회성 현장근무 등록'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="현장명 (예: 은혜교회 대청소)"
          value={job.siteName}
          onChange={(e) => setJob({ ...job, siteName: e.target.value })}
        />
        <input
          type="date"
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          value={job.date}
          onChange={(e) => setJob({ ...job, date: e.target.value })}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-base-400">직원 인원</label>
          <input
            type="number"
            min={0}
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
            value={job.employeeCount}
            onChange={(e) => setJob({ ...job, employeeCount: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-base-400">일용직 인원</label>
          <input
            type="number"
            min={0}
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
            value={job.dayWorkerCount}
            onChange={(e) => setJob({ ...job, dayWorkerCount: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-base-400">일용직 인당 금액</label>
          <input
            type="number"
            min={0}
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
            placeholder="원"
            value={job.dayWorkerRate}
            onChange={(e) => setJob({ ...job, dayWorkerRate: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-base-400">
        <Wallet size={13} className="text-red-500" />
        일용직 총액: <span className="font-medium text-base-200">{won(total)}</span>
      </div>

      <textarea
        className="focus-ring mt-3 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
        placeholder="작업 내용"
        rows={3}
        value={job.workDescription}
        onChange={(e) => setJob({ ...job, workDescription: e.target.value })}
      />

      <div className="mt-3">
        <MediaUploader
          media={job.media}
          onAdd={(m) => setJob((j) => ({ ...j, media: [...j.media, m] }))}
        />
      </div>

      {error && <p className="mt-3 text-xs text-amber-500">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="focus-ring rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-50"
        >
          {saving ? '저장 중…' : initialJob ? '수정 저장' : '등록'}
        </button>
        <button onClick={onCancel} className="focus-ring rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300">
          취소
        </button>
      </div>
    </div>
  )
}

function PasswordGate({ onOk }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setChecking(true)
    try {
      await api.verifySpotPassword(pw)
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
          <p className="text-sm font-semibold text-base-100">일회성 현장근무</p>
        </div>
        <p className="mb-4 text-xs text-base-400">
          이름·연락처 등 개인정보가 포함된 화면이라 비밀번호가 필요해요.
        </p>
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
          {checking ? '확인 중…' : '들어가기'}
        </button>
      </form>
    </div>
  )
}

export default function SpotJobs() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [checkingStored, setCheckingStored] = useState(true)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [openId, setOpenId] = useState(null)

  const load = () => {
    setLoading(true)
    api.listSpotJobs().then(({ items }) => setJobs(items)).finally(() => setLoading(false))
  }

  useEffect(() => {
    const stored = localStorage.getItem('daechinam_spot_pw')
    if (stored) {
      api
        .verifySpotPassword(stored)
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
    setEditingJob(null)
    setShowForm(true)
  }
  const openEdit = (job) => {
    setEditingJob(job)
    setShowForm(true)
  }
  const remove = async (id) => {
    if (!confirm('이 기록을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    await api.deleteSpotJob(id)
    load()
  }

  if (checkingStored) return null
  if (!unlocked) return <PasswordGate onOk={() => setUnlocked(true)} />

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-page-text">일회성 현장근무</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <button
            onClick={load}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => (showForm ? setShowForm(false) : openNew())}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <Plus size={14} /> 등록
          </button>
          <button
            onClick={() => {
              api.clearSpotPassword()
              setUnlocked(false)
            }}
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-page-border bg-page-soft px-3 py-1.5 text-xs text-page-sub hover:bg-page-border hover:text-page-text"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <JobForm
            key={editingJob?.id || 'new'}
            initialJob={editingJob}
            onSaved={() => {
              setShowForm(false)
              setEditingJob(null)
              load()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingJob(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-base-800 bg-base-950 p-10 text-base-500">
          <CalendarDays size={28} />
          <p className="text-sm">등록된 일회성 현장근무가 없어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => {
            const isOpen = openId === j.id
            const photoCount = j.media.filter((m) => m.kind === 'photo').length
            const videoCount = j.media.filter((m) => m.kind === 'video').length

            return (
              <div key={j.id} className="rounded-xl border border-base-800 bg-base-950 shadow-sm">
                <button
                  onClick={() => setOpenId(isOpen ? null : j.id)}
                  className="focus-ring flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-base-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-base-500" />
                    )}
                    <div>
                      <p className="font-medium text-base-100">{j.siteName}</p>
                      <p className="flex items-center gap-2 text-xs text-base-400">
                        <span>{j.date}</span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> 직원 {j.employeeCount} · 일용 {j.dayWorkerCount}
                        </span>
                        {(photoCount > 0 || videoCount > 0) && (
                          <span className="flex items-center gap-1 text-base-500">
                            {photoCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <ImageIcon size={11} /> {photoCount}
                              </span>
                            )}
                            {videoCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Video size={11} /> {videoCount}
                              </span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-base-400">
                    <Wallet size={12} className="text-red-500" />
                    {won(j.dayWorkerTotal)}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-base-800 p-4 pt-3">
                    {j.workDescription && (
                      <p className="mb-3 whitespace-pre-line text-sm text-base-300">{j.workDescription}</p>
                    )}

                    {j.media.length > 0 && (
                      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {j.media.map((m) =>
                          m.kind === 'video' ? (
                            <video key={m.id} src={m.url} controls className="aspect-square w-full rounded-lg bg-black object-cover" />
                          ) : (
                            <img
                              key={m.id}
                              src={m.url}
                              alt={m.filename}
                              className="aspect-square w-full rounded-lg object-cover"
                            />
                          )
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(j)}
                        className="focus-ring flex items-center gap-1 text-xs text-base-500 hover:text-mist-500"
                      >
                        <Pencil size={12} /> 수정
                      </button>
                      <button
                        onClick={() => remove(j.id)}
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
