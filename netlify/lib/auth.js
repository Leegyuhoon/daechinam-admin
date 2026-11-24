import { getStore } from '@netlify/blobs'

// 관리자(업체 보고 비밀번호) 또는 업체 접속 코드로 확인
const ADMIN_PASSWORD = process.env.CLIENT_REPORT_ADMIN_PASSWORD

export const isAdmin = (req) => !ADMIN_PASSWORD || req.headers.get('x-client-admin-password') === ADMIN_PASSWORD

// 접속 코드 → { site, sub }  (sub: 층·구역별 문의 전용 링크일 때 그 항목, 업체 관리자용 링크면 null)
export function resolveCode(sites, code) {
  if (!code) return null
  for (const s of sites || []) {
    if (s.active === false) continue
    if (s.accessCode === code) return { site: s, sub: null }
    const sub = (s.subLinks || []).find((x) => x.code === code && x.active !== false)
    if (sub) return { site: s, sub }
  }
  return null
}

export async function clientSite(req) {
  const code = req.headers.get('x-client-code')
  if (!code) return null
  const sites = (await getStore('regular-ops').get('sites', { type: 'json' }).catch(() => null)) || []
  return resolveCode(sites, code)?.site || null
}

export async function canUpload(req) {
  return isAdmin(req) || !!(await clientSite(req))
}
