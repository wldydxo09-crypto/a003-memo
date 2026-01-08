# ✨ 스마트 코딩 비서 (Smart Dev Assistant)

**개발자의 초심을 기록하는 AI 기반 업무 보조 도구**입니다.
코드 스니펫 저장, 버그 해결 과정 기록, 그리고 AI를 통한 자동 요약 및 일정 관리를 지원합니다.

## 🚀 주요 기능

### 1. 💻 개발 5대 노트
- **📝 업무 일지**: 일반적인 업무 기록
- **💻 개발 노트**: 유용한 코드 조각, 학습 내용 정리
- **📅 회의/일정**: 미팅 내용 기록 (AI가 자동 일정 분류 예정)
- **🚨 이슈/버그**: 에러 로그와 해결 방법 기록
- **💡 아이디어**: 나중에 구현할 기능 메모

### 2. 🤖 Gemini AI 통합
- **자동 요약**: 긴 에러 로그나 회의록을 한 줄로 요약해줍니다.
- **스마트 모델**: Gemini 2.5 Flash / 1.5 Pro 모델을 사용하여 정확도 높은 한국어 요약을 제공합니다.
- **(예정) 일정 자동화**: 텍스트를 분석하여 Google Calendar에 일정을 자동 등록합니다.

### 3. ☁️ Firebase Backend
- **Firestore**: 실시간 데이터 동기화
- **Storage**: 스크린샷 및 이미지 업로드
- **Auth**: Google 원클릭 로그인

---

## 🛠 설치 및 실행 방법

1. **패키지 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정 (`.env.local`)**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   GEMINI_API_KEY=...
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   [http://localhost:3000](http://localhost:3000) 접속

---

## 📁 주요 파일 구조 (나중에 찾을 때 참고하세요!)
- `src/components/TaskInput.tsx`: 글쓰기 화면 & AI 요약 로직
- `src/components/Sidebar.tsx`: 왼쪽 메뉴(개발노트, 이슈 등) 수정하는 곳
- `src/lib/firebaseService.ts`: 데이터 저장/불러오기 함수들
- `src/app/api/summarize/route.ts`: Gemini AI와 통신하는 서버 코드
