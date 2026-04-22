# Majsoul JP Auto Translator (Chrome Extension)

이 프로젝트는 작혼(일섭) 페이지 텍스트를 자동 번역하는 Chrome Extension 예제입니다.

## 번역 메커니즘 (중요)

작혼은 문자열 상당수를 DOM 텍스트가 아니라 **Canvas 렌더링**으로 그립니다.
그래서 F12 Elements에서 텍스트가 거의 안 보일 수 있습니다.

이 확장은 두 경로로 번역합니다.

1. **DOM 텍스트 번역**: 일반 HTML 텍스트 노드 감지 후 번역.
2. **Canvas 텍스트 번역**: 페이지 컨텍스트에 hook 스크립트를 주입해 `CanvasRenderingContext2D.fillText/strokeText` 호출 시점을 가로채 번역 후 그리기.

즉, 화면에 보이는 문자열을 "미리 DOM에서 읽는" 방식이 아니라,
게임이 실제로 글자를 그리려고 하는 시점의 문자열을 받아 번역해 다시 출력합니다.

## 핵심 기능

- 번역 공급자 선택
  - Google Free (API 키 없음)
  - Google Cloud Translation API
  - DeepL API
  - OpenAI API
  - LibreTranslate
- API 키 입력/저장 UI (Options 페이지)
- 로컬 캐시 저장 (`chrome.storage.local`)
  - 이미 번역한 문장은 재사용
  - 새 문장만 API 호출
- 확장 on/off 토글 (Popup)

## 설치 방법

1. 이 폴더를 다운로드합니다.
2. Chrome → `chrome://extensions` 접속
3. 우측 상단 "개발자 모드" ON
4. "압축해제된 확장 프로그램을 로드" 클릭
5. `/workspace/Codex` 폴더 선택

## 사용 방법

1. 확장 아이콘 클릭 후 `Open advanced settings` 진입
2. 번역 공급자 선택 + 필요한 API 키 입력
3. Source/Target 언어 설정 (기본 `ja -> ko`)
4. 작혼 탭을 새로고침

## 주의사항

- Google Free 엔드포인트는 비공식 방식이므로 안정성이 떨어질 수 있습니다.
- OpenAI/Google/DeepL은 과금 API일 수 있으니 사용량을 확인하세요.
- Canvas hook 방식은 렌더링 시점 번역이므로 텍스트 깜빡임/지연이 일부 발생할 수 있습니다.
