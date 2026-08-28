const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${path} 실패 (${res.status}) ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const api = {
  // 출퇴근 대시보드 — 기존 attendance 스토어 어댑터 (netlify/functions/attendance.js 참고)
  getAttendanceSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/attendance${qs ? `?${qs}` : ''}`)
  },

  // 재고 현황
  listInventory: () => request('/inventory'),
  upsertInventoryItem: (item) =>
    request('/inventory', { method: 'POST', body: JSON.stringify(item) }),
  deleteInventoryItem: (id) => request(`/inventory?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // 안전교육 — 영상을 여러 조각(청크)으로 나눠 순서대로 업로드 (대용량 지원)
  uploadSafetyVideo: async (file, onProgress) => {
    const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB
    const uploadId = crypto.randomUUID()
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE))

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(file.size, start + CHUNK_SIZE)
      const chunk = file.slice(start, end)

      const res = await fetch('/api/safety-video-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Upload-Id': uploadId,
          'X-Chunk-Index': String(i)
        },
        body: chunk
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`영상 업로드 실패 (조각 ${i + 1}/${totalChunks}) (${res.status}) ${text}`)
      }
      if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100))
    }

    const finalizeRes = await fetch('/api/safety-video-finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        totalChunks,
        contentType: file.type || 'video/mp4',
        filename: file.name || 'video'
      })
    })
    if (!finalizeRes.ok) {
      const text = await finalizeRes.text().catch(() => '')
      throw new Error(`영상 업로드 마무리 실패 (${finalizeRes.status}) ${text}`)
    }
    return finalizeRes.json() // { id, url }
  },
  listCourses: () => request('/safety-courses'),
  identifyTrainee: async (name, birth) => {
    const res = await fetch('/api/training-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birth })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      throw new Error(data.error || '확인에 실패했습니다')
    }
    return data // { ok:true, verified, name }
  },
  listTrainingRoster: () => request('/training-roster'),
  upsertTrainingRosterEntry: (entry) =>
    request('/training-roster', { method: 'POST', body: JSON.stringify(entry) }),
  deleteTrainingRosterEntry: (id) =>
    request(`/training-roster?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  generateQuizFromVideo: (videoUrl, questionCount = 4) =>
    request('/safety-generate-quiz', {
      method: 'POST',
      body: JSON.stringify({ videoUrl, questionCount })
    }),
  upsertCourse: (course) =>
    request('/safety-courses', { method: 'POST', body: JSON.stringify(course) }),
  deleteCourse: (id) => request(`/safety-courses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  submitQuizResult: (result) =>
    request('/safety-results', { method: 'POST', body: JSON.stringify(result) }),
  listResults: (courseId) =>
    request(`/safety-results${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`)
}
