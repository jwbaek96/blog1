# Floating Actions Component 사용 가이드

## 📌 간단한 사용법

어떤 페이지에든 방명록과 플로팅 액션 버튼을 추가하려면 단 2줄만 추가하면 됩니다:

```html
<!-- CSS 파일 -->
<link rel="stylesheet" href="css/floating-actions.css">

<!-- JavaScript 파일 -->
<script src="js/floating-actions.js"></script>
```

**그게 전부입니다!** 페이지가 로드되면 자동으로 플로팅 액션 버튼과 방명록이 생성됩니다.

## 🎛️ 커스터마이징 옵션

기본적으로는 자동으로 초기화되지만, 원하는 대로 설정을 변경할 수 있습니다:

### 자동 초기화 비활성화 후 수동 설정

```html
<script>
// 자동 초기화 비활성화
FloatingActions.config.autoInit = false;
</script>
<script src="js/floating-actions.js"></script>
<script>
// 수동으로 원하는 옵션과 함께 초기화
FloatingActions.init({
    showEditor: true,      // 에디터 버튼 표시 (기본: true)
    showGuestbook: true    // 방명록 버튼 표시 (기본: true)
});
</script>
```

### 방명록만 사용하기

```html
<script>
FloatingActions.init({
    showEditor: false,     // 에디터 버튼 숨기기
    showGuestbook: true
});
</script>
```

### 에디터 버튼만 사용하기

```html
<script>
FloatingActions.init({
    showEditor: true,
    showGuestbook: false   // 방명록 버튼 숨기기
});
</script>
```

## 📁 파일 구조

컴포넌트를 사용하기 위해 필요한 파일들:

```
css/
  └── floating-actions.css    # 플로팅 액션 스타일
js/
  └── floating-actions.js     # 플로팅 액션 기능
```

## 🔧 주요 기능

- **자동 HTML 생성**: JavaScript로 모든 HTML 구조를 동적 생성
- **반응형 디자인**: 모바일/데스크톱 모든 환경 지원  
- **키보드 단축키**: 
  - `Enter`: 방명록 제출
  - `ESC`: 방명록 닫기
- **설정 가능**: 버튼 표시/숨김 제어 가능

## 📝 기존 코드와의 호환성

기존에 `onclick="toggleGuestbook()"` 같은 함수를 사용하던 코드가 있어도 문제없이 작동합니다. 컴포넌트가 호환성을 위한 전역 함수들을 자동으로 제공합니다.

## 🚀 예제

### 기본 사용 (가장 간단)

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="css/floating-actions.css">
</head>
<body>
    <!-- 페이지 내용 -->
    
    <script src="js/floating-actions.js"></script>
</body>
</html>
```

### 로그인 시에만 에디터 버튼 표시

```html
<script>
FloatingActions.config.autoInit = false;
</script>
<script src="js/floating-actions.js"></script>
<script>
// 로그인 상태 확인 후 초기화
const isLoggedIn = checkLoginStatus(); // 사용자 정의 함수
FloatingActions.init({
    showEditor: isLoggedIn,
    showGuestbook: true
});
</script>
```

이제 새로운 페이지를 만들 때 긴 HTML을 복사할 필요 없이 간단하게 플로팅 액션을 추가할 수 있습니다!