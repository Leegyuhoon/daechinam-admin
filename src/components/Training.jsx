import { useEffect, useState } from 'react'
import { ShieldCheck, PlayCircle, CheckCircle2, XCircle, ChevronLeft, Sparkles } from 'lucide-react'
import { api } from '../lib/api'

const NAME_KEY = 'daechinam_training_name'

function QuizRunner({ course, name, onExit }) {
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
    setResult({ score, total, percent, passed })
    setStep('result')
    await api.submitQuizResult({ courseId: course.id, userName: name, score, total, passed })
  }

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={onExit} className="focus-ring mb-4 flex items-center gap-1 text-sm text-base-400 hover:text-base-200">
        <ChevronLeft size={16} /> 과정 목록으로
      </button>

      <div className="rounded-xl border border-base-800 bg-base-950 p-5 shadow-sm">
        <p className="mb-1 text-xs text-base-500">{name}님</p>
        <h1 className="mb-4 text-lg font-semibold text-base-100">{course.title}</h1>

        {step === 'video' && (
          <div>
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <video src={course.videoUrl} controls className="h-full w-full" />
            </div>
            <p className="mt-3 text-sm text-base-400">{course.description}</p>
            <button
              onClick={() => setStep('quiz')}
              className="focus-ring mt-4 flex items-center gap-1.5 rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400"
            >
              <PlayCircle size={16} /> 시청 완료, 문제 풀기
            </button>
          </div>
        )}

        {step === 'quiz' && (
          <div className="space-y-5">
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
                          ? 'border-mist-500 bg-mist-500/10 text-mist-500'
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
              className="focus-ring w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400 disabled:opacity-40"
            >
              제출하기
            </button>
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            {result.passed ? (
              <CheckCircle2 size={44} className="text-mist-500" />
            ) : (
              <XCircle size={44} className="text-amber-500" />
            )}
            <p className="text-xl font-semibold text-base-100">
              {result.percent}점 ({result.score}/{result.total})
            </p>
            <p className="text-sm text-base-400">
              {result.passed
                ? '이수 완료! 수고하셨습니다.'
                : `${course.passRatio ?? 80}점 이상이어야 이수 처리돼요. 다시 시청해주세요.`}
            </p>
            {result.passed ? (
              <button
                onClick={onExit}
                className="focus-ring mt-2 rounded-lg border border-base-700 px-4 py-2 text-sm text-base-300"
              >
                과정 목록으로
              </button>
            ) : (
              <button
                onClick={() => {
                  setAnswers({})
                  setStep('video')
                }}
                className="focus-ring mt-2 rounded-lg bg-mist-500 px-4 py-2 text-sm font-medium text-base-950 hover:bg-mist-400"
              >
                다시 시청하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Training() {
  const [name, setName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(NAME_KEY)
    if (saved) setName(saved)
  }, [])

  useEffect(() => {
    api.listCourses().then(({ courses }) => setCourses(courses)).finally(() => setLoading(false))
  }, [])

  const confirmName = (e) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    localStorage.setItem(NAME_KEY, nameInput.trim())
    setName(nameInput.trim())
  }

  if (!name) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-900 px-4">
        <form onSubmit={confirmName} className="w-full max-w-sm rounded-xl border border-base-800 bg-base-950 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-base-100">(주)이엘씨_대치남</p>
              <p className="text-xs text-base-400">안전교육</p>
            </div>
          </div>
          <label className="mb-1.5 block text-sm text-base-300">이름을 입력해주세요</label>
          <input
            autoFocus
            className="focus-ring w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 text-sm"
            placeholder="홍길동"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button
            type="submit"
            className="focus-ring mt-3 w-full rounded-lg bg-mist-500 px-4 py-2.5 text-sm font-medium text-base-950 hover:bg-mist-400"
          >
            시작하기
          </button>
        </form>
      </div>
    )
  }

  if (active) {
    return (
      <div className="min-h-screen bg-base-900 px-4 py-8">
        <QuizRunner course={active} name={name} onExit={() => setActive(null)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-900 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-500/15 text-mist-500">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">(주)이엘씨_대치남 안전교육</p>
            <p className="text-xs text-base-400">{name}님, 반갑습니다.</p>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-base-500">불러오는 중…</p>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-base-800 bg-base-950 p-10 text-base-500">
            <ShieldCheck size={28} />
            <p className="text-sm">등록된 안전교육 과정이 없어요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className="focus-ring w-full rounded-xl border border-base-800 bg-base-950 p-4 text-left shadow-sm hover:border-mist-500/50"
              >
                <div className="mb-1.5 flex items-center gap-2 text-mist-500">
                  <PlayCircle size={16} />
                  <span className="text-xs">
                    {c.questions.length}문제 · {c.passRatio ?? 80}점 이상 이수
                  </span>
                </div>
                <p className="font-medium text-base-100">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-base-400">{c.description}</p>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            localStorage.removeItem(NAME_KEY)
            setName('')
          }}
          className="focus-ring mt-6 text-xs text-base-500 hover:text-base-300"
        >
          다른 이름으로 다시 시작
        </button>
      </div>
    </div>
  )
}
