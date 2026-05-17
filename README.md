# 카스토리

봉담지역아동센터 차량운행 및 유류수불대장을 모바일에서 입력하고 월별 엑셀로 내려받는 Next.js MVP입니다.

## 기능

- 한 화면 운행 기록 입력
- 주유 기록 입력
- 월별 운행/주유 내역 조회
- 운행일지 `.xlsx` 다운로드
- 유류수불대장 `.xlsx` 다운로드
- PWA 설치 지원
- Supabase 미설정 시 브라우저 로컬 저장소 사용

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## PWA

프로덕션 배포 환경에서는 브라우저의 설치 기능을 통해 앱처럼 홈 화면에 추가할 수 있습니다. 개발 모드에서는 오래된 화면이 캐시되는 문제를 줄이기 위해 서비스 워커를 등록하지 않습니다.

아이콘을 교체할 때는 아래 파일을 같은 이름으로 바꾸면 됩니다.

- `public/app-icon-source.png`: 아이콘 원본
- `public/app-icon-clean.png`: 검은 모서리를 보정한 1024px 작업본
- `public/icon-192.png`, `public/icon-512.png`: PWA 일반 앱 아이콘
- `public/maskable-icon-512.png`: Android 마스커블 PNG 아이콘
- `public/apple-touch-icon.png`: iOS 홈 화면 아이콘
- `src/app/favicon.ico`: 브라우저 favicon

## Supabase 설정

Supabase를 쓰지 않아도 먼저 로컬 저장소로 테스트할 수 있습니다. 이 경우 데이터는 현재 브라우저의 `localStorage`에만 저장되므로 같은 브라우저에서는 새로고침 후에도 남지만, 다른 기기/브라우저에서는 보이지 않고 브라우저 데이터를 삭제하면 함께 사라집니다. 여러 기기에서 같은 데이터를 보거나 배포해서 쓰려면 Supabase를 연결합니다.

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. Project Settings → API에서 Project URL과 anon public key를 확인합니다.
4. `.env.example`을 참고해 `.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY`에는 `anon public`이라는 라벨을 넣는 것이 아니라, 그 항목 옆의 실제 키 값을 복사해야 합니다. 새 Supabase 프로젝트라면 `sb_publishable_...` 형태의 publishable key를 사용해도 됩니다. 구형 Legacy API Keys 탭을 쓰는 경우에는 `eyJ...`로 시작하는 긴 `anon` JWT 값을 사용합니다.

5. 개발 서버를 다시 시작합니다.

```bash
npm run dev
```

Supabase 환경변수가 설정되면 앱은 자동으로 Supabase를 사용합니다. 기존 브라우저 로컬 저장소에 운행/주유 기록이 있으면 최초 1회 Supabase로 이전합니다.

### 연결 확인

Supabase Table Editor에서 아래 테이블에 데이터가 쌓이는지 확인합니다.

- `drive_logs`
- `fuel_logs`

## 무료 플랜 기준

개인용 MVP, 차량 1대, 운전자 1명, 월 수백 건 수준의 운행 기록이라면 Supabase 무료 플랜으로 충분합니다. 다만 무료 프로젝트는 장기간 미사용 시 일시 중지될 수 있고, 익명 쓰기 정책을 열어두면 URL을 아는 사람이 데이터를 쓸 수 있습니다. 실제 운영 전에 로그인 또는 간단한 보호 장치를 추가하는 것이 좋습니다.
