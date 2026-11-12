import { useState } from 'react'
import { ImagePlus, Video, X, Loader2, Play } from 'lucide-react'
import { api } from '../../lib/api'

// 사진·영상 첨부 고르기 — code를 주면 업체 페이지용(접속 코드로 업로드)
export function MediaPicker({ media, onChange, code, max = 10, compact = false, onBusyChange }) {
  const [uploads, setUploads] = useState([]) // 진행 중: { key, name, progress, kind }
  const [error, setError] = useState(null)

  const pick = async (e) => {
    const files = [...(e.target.files || [])].slice(0, Math.max(0, max - media.length))
    e.target.value = ''
    if (!files.length) return
    setError(null)
    onBusyChange?.(true)
    const added = []
    for (const f of files) {
      const key = `${f.name}-${f.size}-${Math.random()}`
      const kind = f.type?.startsWith('video/') ? 'video' : 'photo'
      setUploads((u) => [...u, { key, name: f.name, progress: 0, kind }])
      try {
        const m = await api.uploadAttachment(f, {
          code,
          onProgress: (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x)))
        })
        added.push(m)
        onChange((prev) => [...prev, m])
      } catch (err) {
        setError(err.message)
      }
      setUploads((u) => u.filter((x) => x.key !== key))
    }
    onBusyChange?.(false)
  }

  const size = compact ? 'h-14 w-14' : 'h-16 w-16'
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {media.map((m, i) => (
          <div key={m.url} className={`relative ${size} overflow-hidden rounded-lg bg-base-900`}>
            {m.kind === 'video' ? (
              <div className="flex h-full w-full items-center justify-center bg-base-200 text-base-950">
                <Play size={18} />
              </div>
            ) : (
              <img src={m.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange((prev) => prev.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className={`flex ${size} flex-col items-center justify-center rounded-lg bg-base-900 text-[10px] text-base-500`}>
            <Loader2 size={16} className="animate-spin" />
            {u.kind === 'video' ? `${u.progress}%` : '올리는 중'}
          </div>
        ))}
        {media.length + uploads.length < max && (
          <label className={`flex ${size} cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-base-700 text-[10px] text-base-500 hover:text-mist-500`}>
            <span className="flex gap-0.5">
              <ImagePlus size={14} />
              <Video size={14} />
            </span>
            사진·영상
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={pick} />
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-amber-500">{error}</p>}
    </div>
  )
}

// 첨부 보기 — 사진은 눌러서 크게, 영상은 바로 재생
export function MediaView({ media = [], size = 'h-20 w-20' }) {
  if (!media.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {media.map((m) =>
        m.kind === 'video' ? (
          <video key={m.url} src={m.url} controls playsInline preload="metadata" className="max-h-56 w-full max-w-xs rounded-lg bg-black" />
        ) : (
          <a key={m.url} href={m.url} target="_blank" rel="noreferrer">
            <img src={m.url} alt="" className={`${size} rounded-md object-cover`} />
          </a>
        )
      )}
    </div>
  )
}
