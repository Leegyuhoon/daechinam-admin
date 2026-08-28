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

  // 안전교육
  listCourses: () => request('/safety-courses'),
  upsertCourse: (course) =>
    request('/safety-courses', { method: 'POST', body: JSON.stringify(course) }),
  deleteCourse: (id) => request(`/safety-courses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  submitQuizResult: (result) =>
    request('/safety-results', { method: 'POST', body: JSON.stringify(result) }),
  listResults: (courseId) =>
    request(`/safety-results${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`)
}
