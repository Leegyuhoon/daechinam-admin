import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Plus,
  Trash2,
  Settings2,
  UploadCloud,
  Loader2,
  Sparkles
} from 'lucide-react'
import { api } from '../lib/api'

const emptyCourse = { title: '', description: '', videoUrl: '', passRatio: 80, questions: [] }

function QuestionEditor({ question, onChange, onRemove }) {
  const setOption = (idx, value) => {
    const options = [...question.options]
    options[idx] = value
    onChange({ ...question, options })
  }
  return (
    <div className="rounded-lg border border-base-800 bg-base-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <input
          className="focus-ring flex-1 rounded-md border border-base-700 bg-base-950 px-2 py-1.5 text-sm"
          placeholder="문제"
          value={question.prompt}
          onChange={(e) => onChange({ ...question, prompt: e.target.value })}
        />
        <button onClick={onRemove} className="focus-ring ml-2 text-base-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt, idx) => (
          <label key={idx} className="flex items-center gap-1.5 text-xs text-base-300">
            <input
              type="radio"
              checked={question.correctIndex === idx}
              onChange={() => onChange({ ...question, correctIndex: idx })}
            />
            <input
              className="focus-ring w-full rounded-md border border-base-700 bg-base-950 px-2 py-1 text-xs"
              placeholder={`보기 ${idx + 1}`}
              value={opt}
              onChange={(e) => setOption(idx, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function VideoUploader({ videoUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setFileName(file.name)
    setProgress(0)
    setUploading(true)
    try {
      const { url } = await api.uploadSafetyVideo(file, setProgress)
      onUploaded(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-base-700 px-3 py-4 text-sm text-base-400 hover:border-mist-500 hover:text-mist-500">
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> 업로드 중… {progress}% ({fileName})
          </>
        ) : (
          <>
            <UploadCloud size={16} /> {videoUrl ? '다른 영상으로 교체' : '영상 파일 업로드 (mp4 권장)'}
          </>
        )}
        <input type="file" accept="video/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="mt-2 text-xs text-amber-500">{error}</p>}
      {videoUrl && !uploading && (
        <video src={videoUrl} controls className="mt-3 aspect-video w-full rounded-lg bg-black" />
      )}
      <p className="mt-2 text-[11px] text-base-500">
        영상은 조각으로 나뉘어 업로드돼요 — 용량이 커도 괜찮지만 시간이 좀 걸릴 수 있어요. AI 자동 문제 생성(음성인식)은 25MB 이하 영상만 지원돼요.
      </p>
    </div>
  )
}

function CourseForm({ onSaved, onCancel }) {
  const [course, setCourse] = useState(emptyCourse)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)

  const addQuestion = () =>
    setCourse((c) => ({
      ...c,
      questions: [...c.questions, { id: crypto.randomUUID(), prompt: '', options: ['', '', '', ''], correctIndex: 0 }]
    }))

  const updateQuestion = (id, next) =>
    setCourse((c) => ({ ...c, questions: c.questions.map((q) => (q.id === id ? next : q)) }))

  const removeQuestion = (id) =>
    setCourse((c) => ({ ...c, questions: c.questions.filter((q) => q.id !== id) }))

  const generateWithAI = async () => {
    if (!course.videoUrl) return
    setGenError(null)
    setGenerating(true)
    try {
      const { questions } = await api.generateQuizFromVideo(course.videoUrl, 4)
      setCourse((c) => ({ ...c, questions: [...c.questions, ...questions] }))
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    if (!course.title || !course.videoUrl || course.questions.length === 0) return
    await api.upsertCourse(course)
    onSaved()
  }

  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <p className="mb-3 text-sm font-medium text-base-200">새 안전교육 과정 등록</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="focus-ring rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
          placeholder="과정명 (예: 고소작업 안전수칙)"
          value={course.title}
          onChange={(e) => setCourse({ ...course, title: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-base-400">통과 기준</label>
          <input
            type="number"
            min={1}
            max={100}
            className="focus-ring w-20 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
            value={course.passRatio}
            onChange={(e) => setCourse({ ...course, passRatio: e.target.value })}
          />
          <span className="text-xs text-base-400">점 이상 (100점 만점)</span>
        </div>
      </div>
      <textarea
        className="focus-ring mt-3 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm"
        placeholder="간단한 설명"
        rows={2}
        value={course.description}
        onChange={(e) => setCourse({ ...course, description: e.target.value })}
      />

      <div className="mt-3">
        <VideoUploader videoUrl={course.videoUrl} onUploaded={(url) => setCourse((c) => ({ ...c, videoUrl: url }))} />
      </div>

      <div className="mt-4 space-y-2">
        {course.questions.length === 0 && course.videoUrl && (
          <button
            onClick={generateWithAI}
            disabled={generating}
            className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-lg border border-mist-500/40 bg-mist-500/10 px-3 py-2.5 text-sm text-mist-400 hover:bg-mist-500/15 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" /> 영상 분석 중… (음성인식 + 문제 생성, 시간이 걸려요)
              </>
            ) : (
              <>
                <Sparkles size={15} /> AI로 문제 자동 생성
              </>
            )}
          </button>
        )}
        {genError && <p className="text-xs text-amber-400">{genError}</p>}

        {course.questions.map((q) => (
          <QuestionEditor
            key={q.id}
            question={q}
            onChange={(next) => updateQuestion(q.id, next)}
            onRemove={() => removeQuestion(q.id)}
          />
        ))}
        <button
          onClick={addQuestion}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-dashed border-base-700 px-3 py-2 text-xs text-base-400 hover:border-mist-500 hover:text-mist-400"
        >
          <Plus size={14} /> 문제 추가
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={!course.title || !course.videoUrl || course.questions.length === 0}
          className="focus-ring rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-40"
        >
          과정 저장
        </button>
        <button onClick={onCancel} className="focus-ring rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300">
          취소
        </button>
      </div>
    </div>
  )
}

function QuizRunner({ course, onExit }) {
  const [step, setStep] = useState('video')
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const passRatio = (course.passRatio ?? 80) / 100

  const submit = async () => {
    let score = 0
    course.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) score += 1
    })
    const total = course.questions.length
    const percent = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = total > 0 && score / total >= passRatio
    const r = { score, total, percent, passed }
    setResult(r)
    setStep('result')
    await api.submitQuizResult({ courseId: course.id, userName: '', score, total, passed })
  }

  return (
    <div className="rounded-xl border border-base-800 bg-base-950 p-4">
      <button onClick={onExit} className="focus-ring mb-4 flex items-center gap-1 text-xs text-base-400 hover:text-base-200">
        <ChevronLeft size={14} /> 목록으로
      </button>

      {step === 'video' && (
        <div>
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <video src={course.videoUrl} controls className="h-full w-full" />
          </div>
          <p className="mt-3 text-sm text-base-300">{course.description}</p>
          <button
            onClick={() => setStep('quiz')}
            className="focus-ring mt-4 flex items-center gap-1.5 rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400"
          >
            <PlayCircle size={16} /> 시청 완료, 문제 풀기
          </button>
        </div>
      )}

      {step === 'quiz' && (
        <div className="space-y-4">
          {course.questions.map((q, i) => (
            <div key={q.id}>
              <p className="mb-2 text-sm text-base-100">
                {i + 1}. {q.prompt}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    className={`focus-ring rounded-lg border px-3 py-2 text-left text-sm ${
                      answers[q.id] === idx
                        ? 'border-mist-500 bg-mist-500/10 text-mist-400'
                        : 'border-base-700 text-base-300 hover:bg-base-900'
                    }`}
                  >
                    {opt || `보기 ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            disabled={Object.keys(answers).length < course.questions.length}
            className="focus-ring rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-40"
          >
            제출하기
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {result.passed ? (
            <CheckCircle2 size={40} className="text-mist-400" />
          ) : (
            <XCircle size={40} className="text-amber-400" />
          )}
          <p className="text-lg font-semibold text-base-100">
            {result.percent}점 ({result.score}/{result.total}) — {result.passed ? '이수 완료' : '재교육 필요'}
          </p>
          <p className="text-sm text-base-400">
            {result.passed
              ? '수고하셨습니다. 안전교육이 정상 등록되었습니다.'
              : `${course.passRatio ?? 80}점 이상이어야 이수 처리됩니다. 다시 시청해주세요.`}
          </p>
          {!result.passed && (
            <button
              onClick={() => {
                setAnswers({})
                setStep('video')
              }}
              className="focus-ring mt-2 rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300"
            >
              다시 시청하기
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SafetyTraining() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)

  const load = () => {
    setLoading(true)
    api.listCourses().then(({ courses }) => setCourses(courses)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  if (active) {
    return <QuizRunner course={active} onExit={() => setActive(null)} />
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-base-100">안전교육</h1>
          <p className="mt-1 text-sm text-base-400">영상을 시청하고 문제를 풀어 이수하는 방식입니다.</p>
        </div>
        <button
          onClick={() => setShowAdmin((v) => !v)}
          className="focus-ring flex items-center gap-1.5 rounded-lg border border-base-800 px-3 py-1.5 text-xs text-base-300 hover:bg-base-800"
        >
          <Settings2 size={14} /> 과정 등록
        </button>
      </div>

      {showAdmin && (
        <div className="mb-6">
          <CourseForm
            onSaved={() => {
              setShowAdmin(false)
              load()
            }}
            onCancel={() => setShowAdmin(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-base-800 bg-base-950 p-10 text-base-500">
          <ShieldCheck size={28} />
          <p className="text-sm">등록된 안전교육 과정이 없어요.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className="focus-ring rounded-xl border border-base-800 bg-base-950 p-4 text-left hover:border-mist-500/50"
            >
              <div className="mb-2 flex items-center gap-2 text-mist-400">
                <PlayCircle size={16} />
                <span className="text-xs">{c.questions.length}문제 · {c.passRatio ?? 80}점 이상 이수</span>
              </div>
              <p className="font-medium text-base-100">{c.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-base-400">{c.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
