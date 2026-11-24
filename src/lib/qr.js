// QR 코드 생성기 (외부 라이브러리 없이) — 바이트 모드, 오류 정정 M(약 15% 손상 복구)
// 표준(ISO/IEC 18004) 방식: 데이터 → 블록 나누기 → 리드-솔로몬 오류 정정 → 배치 → 8가지 마스크 중 최적 선택

const ECC_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
}
const NUM_BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
}
const ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 }

function numRawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}
const numDataCodewords = (ver, ecl) => Math.floor(numRawDataModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver]

// 리드-솔로몬 (GF(256), 다항식 0x11D)
function gfMul(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
function rsDivisor(degree) {
  const result = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 0x02)
  }
  return result
}
function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ result.shift()
    result.push(0)
    divisor.forEach((coef, i) => (result[i] ^= gfMul(coef, factor)))
  }
  return result
}

function alignmentPositions(ver) {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result = [6]
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

export function makeQr(text, ecl = 'M') {
  const bytes = Array.from(new TextEncoder().encode(text))
  // 버전 고르기
  let ver = 1
  for (; ver <= 40; ver++) {
    const ccBits = ver <= 9 ? 8 : 16
    if (4 + ccBits + bytes.length * 8 <= numDataCodewords(ver, ecl) * 8) break
  }
  if (ver > 40) throw new Error('QR에 담기엔 내용이 너무 깁니다')
  const ccBits = ver <= 9 ? 8 : 16

  // 데이터 비트열
  const bits = []
  const put = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  put(0b0100, 4)
  put(bytes.length, ccBits)
  bytes.forEach((b) => put(b, 8))
  const capBits = numDataCodewords(ver, ecl) * 8
  put(0, Math.min(4, capBits - bits.length))
  put(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8)
  const data = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0))

  // 블록 나누고 오류 정정 붙여서 섞기
  const numBlocks = NUM_BLOCKS[ecl][ver]
  const eccLen = ECC_PER_BLOCK[ecl][ver]
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8)
  const numShort = numBlocks - (rawCodewords % numBlocks)
  const shortLen = Math.floor(rawCodewords / numBlocks)
  const div = rsDivisor(eccLen)
  const blocks = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, div)
    if (i < numShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const codewords = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((blk, j) => {
      if (i !== shortLen - eccLen || j >= numShort) codewords.push(blk[i])
    })
  }

  // 모듈 배치
  const size = ver * 4 + 17
  const mod = Array.from({ length: size }, () => new Array(size).fill(false))
  const fn = Array.from({ length: size }, () => new Array(size).fill(false))
  const setFn = (x, y, dark) => {
    mod[y][x] = dark
    fn[y][x] = true
  }
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }
  const finder = (x, y) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4)
      }
  }
  finder(3, 3)
  finder(size - 4, 3)
  finder(3, size - 4)
  const al = alignmentPositions(ver)
  al.forEach((ax, i) =>
    al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    })
  )
  const drawFormat = (mask) => {
    const dataBits = (ECL_BITS[ecl] << 3) | mask
    let rem = dataBits
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const b = ((dataBits << 10) | rem) ^ 0x5412
    const bit = (i) => ((b >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(i))
    setFn(8, 7, bit(6))
    setFn(8, 8, bit(7))
    setFn(7, 8, bit(8))
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i))
    setFn(8, size - 8, true)
  }
  drawFormat(0)
  if (ver >= 7) {
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const b = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((b >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const c = Math.floor(i / 3)
      setFn(a, c, dark)
      setFn(c, a, dark)
    }
  }
  // 데이터 지그재그 배치
  let idx = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!fn[y][x] && idx < codewords.length * 8) {
          mod[y][x] = ((codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1) === 1
          idx++
        }
      }
    }
  }

  const maskFn = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  ]
  const applyMask = (m) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x]
  }
  const penalty = () => {
    let p = 0
    const runs = (get) => {
      for (let a = 0; a < size; a++) {
        let run = 1
        for (let b = 1; b <= size; b++) {
          if (b < size && get(a, b) === get(a, b - 1)) run++
          else {
            if (run >= 5) p += run - 2
            run = 1
          }
        }
      }
    }
    runs((a, b) => mod[a][b])
    runs((a, b) => mod[b][a])
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = mod[y][x]
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3
      }
    const pat = [true, false, true, true, true, false, true]
    const finderLike = (get) => {
      for (let a = 0; a < size; a++)
        for (let b = 0; b + 6 < size; b++) {
          if (!pat.every((v, k) => get(a, b + k) === v)) continue
          const before = b >= 4 && [1, 2, 3, 4].every((k) => !get(a, b - k))
          const after = b + 10 < size && [7, 8, 9, 10].every((k) => !get(a, b + k))
          if (before || after) p += 40
        }
    }
    finderLike((a, b) => mod[a][b])
    finderLike((a, b) => mod[b][a])
    let dark = 0
    mod.forEach((row) => row.forEach((v) => v && dark++))
    const total = size * size
    p += Math.ceil(Math.abs(dark * 20 - total * 10) / total - 1) * 10
    return p
  }
  let best = 0
  let bestP = Infinity
  for (let m = 0; m < 8; m++) {
    applyMask(m)
    drawFormat(m)
    const p = penalty()
    if (p < bestP) {
      bestP = p
      best = m
    }
    applyMask(m)
  }
  applyMask(best)
  drawFormat(best)
  return { size, modules: mod }
}

// SVG 문자열 (흰 여백 4칸 포함)
export function qrSvg(text, { margin = 4, dark = '#000', light = '#fff' } = {}) {
  const { size, modules } = makeQr(text)
  const n = size + margin * 2
  let path = ''
  modules.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) path += `M${x + margin},${y + margin}h1v1h-1z`
    })
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="100%" height="100%" style="display:block" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`
}

// PNG 데이터 URL (내려받기·인쇄용)
export function qrPngDataUrl(text, px = 1024) {
  const { size, modules } = makeQr(text)
  const margin = 4
  const n = size + margin * 2
  const scale = Math.max(1, Math.floor(px / n))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n * scale
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  modules.forEach((row, y) => row.forEach((v, x) => v && ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale)))
  return canvas.toDataURL('image/png')
}
