# 대신치워주는남자 · 통합 관리 사이트

기존 `daechinam-app`(출퇴근 관리)과 같은 스택(Vite + React + Tailwind + Netlify Blobs)으로 만든
새 관리자용 사이트입니다. 테마 컬러(`#1D232A` + 민트 accent `#38BFAE`)를 기존 앱과 맞췄습니다.

## 구성

- **출퇴근 대시보드** (`/`) — 기존 앱의 출퇴근 데이터를 요약해서 보여줍니다.
- **재고 현황** (`/inventory`) — 세정용품·장비 재고 CRUD.
- **안전교육** (`/safety`) — 영상 시청 → 퀴즈(민방위 온라인훈련 방식) → 자동 채점/이수 기록.

각 기능은 `netlify/functions/*.js`에서 `@netlify/blobs`로 데이터를 읽고 씁니다.

## ⚠️ 연동 전 반드시 확인할 것 — `netlify/functions/attendance.js`

이 파일은 **자리표시자(placeholder)** 입니다. 기존 `daechinam-app` 저장소의 출퇴근 관련
Netlify Function(예: `attendance.js`, `checkin.js` 등)을 열어서:

1. `getStore('...')` 에 실제로 어떤 스토어 이름을 쓰는지
2. 저장된 레코드가 어떤 JSON 필드를 갖는지 (예: `name`, `checkIn`, `checkOut`, `date`, `siteId`, `isLate` 등)

를 확인한 뒤 `attendance.js`의 `STORE_NAME`과 매핑 로직을 실제 스키마에 맞게 고쳐야
대시보드에 진짜 데이터가 뜹니다. 해당 함수 코드를 붙여주시면 정확히 맞춰드릴 수 있어요.

같은 Netlify 계정/사이트 안에서 함수를 돌리면 blobs 스토어를 그대로 공유해서 읽을 수 있고,
사이트가 분리되어 있다면 [Netlify Blobs의 `siteID`를 지정해서 접근](https://docs.netlify.com/blobs/overview/)하거나
기존 앱에 조회용 API 엔드포인트를 하나 추가하는 방식으로 연동합니다.

## 로컬 실행

```bash
npm install
npm install -g netlify-cli   # 최초 1회
netlify dev                  # vite + functions 동시 실행 (localhost:8888)
```

## 배포

기존 앱과 동일하게 GitHub 저장소를 만들고 Netlify에 연결하면 끝입니다.

```bash
git init
git add .
git commit -m "init: 통합 관리 사이트"
git remote add origin <새 저장소 URL>
git push -u origin main
```

Netlify에서 "Add new site → Import from Git" 으로 이 저장소를 선택하면
`netlify.toml` 설정을 그대로 읽어서 빌드/함수 배포가 됩니다.

## 안전교육 영상 업로드 관련

지금은 영상 URL을 직접 입력하는 방식입니다(외부 링크, 또는 Netlify Blobs에 올린 파일의 URL).
영상 파일을 사이트 안에서 직접 업로드하고 싶다면, 관리자 화면에 `<input type="file">` +
`store.set(key, arrayBuffer)` 형태의 업로드 함수를 추가하면 됩니다 — 필요하시면 이어서 만들어드릴게요.
