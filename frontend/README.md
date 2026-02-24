# RAG System Frontend

SolidJS + TanStack Start 全端 RAG 前端應用，透過 SSE streaming 與 FastAPI 後端通訊，提供文件上傳、向量檢索、AI 問答功能。

## 技術棧

- **框架:** SolidJS 1.9 + TypeScript + Vite 7
- **全端框架:** TanStack Start (SSR + file-based routing)
- **路由:** TanStack Router (file-based, type-safe)
- **伺服器狀態:** TanStack Query (createQuery / createMutation)
- **客戶端狀態:** SolidJS stores + contexts
- **表單處理:** TanStack Form + Zod
- **樣式:** Tailwind CSS v4
- **即時通訊:** SSE Streaming (Fetch API + ReadableStream)

## 快速開始

### 前置需求

- Node.js 18+ 或 Bun
- 後端服務運行中 (FastAPI, 預設 port 8002)

### 安裝

```bash
# 安裝依賴
bun install

# 啟動開發伺服器
bun dev
```

開發伺服器預設運行於 http://localhost:3000

## 可用指令

| 指令 | 說明 |
|------|------|
| `bun dev` | 啟動開發伺服器 (Vite, port 3000) |
| `bun build` | 建置生產版本 |
| `bun start` | 運行生產版本 |
| `bun preview` | 預覽生產建置 |
| `bun format` | 使用 Biome 格式化程式碼 |
| `bun lint` | 使用 Biome 檢查程式碼 |
| `bun check` | Biome 完整檢查 (format + lint + assist) |
| `bun test` | 運行測試 (Vitest) |

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 後端 API URL | `http://localhost:8002/api` |

## 專案結構

```
src/
├── routes/                  # File-based 路由 (TanStack Router)
│   ├── __root.tsx           # Root layout (HTML shell, providers)
│   ├── index.tsx            # Landing page
│   ├── login.tsx            # 登入頁
│   ├── register.tsx         # 註冊頁
│   └── _authed.tsx          # Auth guard layout route
│       ├── chat.tsx         #   Chat layout
│       │   └── index.tsx    #     聊天頁面
│       └── documents.tsx    #   Documents layout
│           ├── index.tsx    #     文件列表
│           └── upload.tsx   #     上傳頁面
├── components/
│   ├── ui/                  # 基礎 UI 元件 (Button, Card, TextField...)
│   ├── layout/              # 佈局元件 (Sidebar, AppLayout)
│   ├── chat/                # 聊天元件 (ChatMessage, ChatInput, StreamingMessage)
│   ├── documents/           # 文件元件 (DocumentCard)
│   └── common/              # 共用元件 (LoadingSpinner, EmptyState, ErrorDisplay)
├── lib/
│   ├── api.ts               # API client (fetch wrapper + 401 自動刷新)
│   ├── sse.ts               # SSE streaming 工具
│   ├── constants.ts         # API_BASE_URL, query keys
│   ├── schemas.ts           # Zod 驗證 schemas
│   └── utils.ts             # cn() 等工具函數
├── stores/
│   └── chat.ts              # Chat store (messages + streaming state)
├── contexts/
│   └── auth.tsx             # AuthProvider + useAuth
├── types/                   # TypeScript 型別定義
│   ├── api.ts               # API response types
│   ├── auth.ts              # User, tokens
│   ├── chat.ts              # Message, Source, StreamEvent
│   └── document.ts          # Document types
├── integrations/
│   └── tanstack-query/
│       └── provider.tsx     # QueryClient 設定
├── styles.css               # Tailwind 全域樣式
├── router.tsx               # Router 設定
└── routeTree.gen.ts         # 自動生成（勿手動編輯）
```

## 架構說明

### 請求處理流程

```
使用者操作
  │
  ├── 一般 API 請求 (CRUD)
  │     │
  │     ▼
  │   apiFetch()  ──→  FastAPI 後端
  │     │                  │
  │     │  ◄── 401 ───────┘
  │     │
  │     ▼
  │   自動 refresh token ──→ 重試原始請求
  │
  └── RAG 問答 (SSE Streaming)
        │
        ▼
      fetchSSE()  ── POST /chat/query ──→  FastAPI 後端
        │                                      │
        │  ◄── text/event-stream ─────────────┘
        │
        ▼
      逐步解析 SSE 事件:
        sources → delta (多次) → usage → done
```

### SSR 渲染流程

TanStack Start 提供 Server-Side Rendering：

```
瀏覽器請求
  │
  ▼
TanStack Start (Vite SSR)
  │
  ├── 1. Server 端執行路由匹配
  ├── 2. 渲染 shellComponent (__root.tsx)
  │       └── <html> → <HydrationScript/> → <body> → providers → 路由內容
  ├── 3. 產生完整 HTML 回傳瀏覽器
  │
  ▼
瀏覽器收到 HTML
  │
  ├── 4. 顯示 SSR 內容（立即可見）
  └── 5. SolidJS hydration 接管互動性
```

### 認證流程

```
登入                                  自動刷新
  │                                     │
  ▼                                     ▼
POST /auth/login                    POST /auth/refresh
  │                                     │
  ▼                                     ▼
access token → SolidJS store (記憶體)  新 access token → 更新 store
refresh token → HttpOnly cookie       refresh token → 輪換 cookie
  │
  ▼
GET /auth/me → 取得用戶資料

路由守衛: _authed.tsx layout route
  └── 檢查 auth.state.isAuthenticated
      ├── true  → 渲染子路由
      └── false → Navigate to /login
```

### 狀態管理策略

| 狀態類型 | 方案 | 範例 |
|----------|------|------|
| Server State | TanStack Query | 文件列表、用戶資料 |
| Auth State | Context + createStore | Access token、當前用戶 |
| Chat State | createStore | 訊息列表、串流內容 |
| UI State | createSignal | Sidebar 開關 |
| Form State | TanStack Form | 登入、註冊、上傳表單 |

### SSE 串流機制

RAG 問答使用 POST 請求觸發 SSE（無法用原生 EventSource），前端透過 Fetch API + ReadableStream 手動解析：

```
POST /chat/query { question, top_k }
  │
  ▼ text/event-stream
  │
  ├── event: sources    → 顯示參考來源
  ├── event: delta      → 逐 token 累積顯示 AI 回應（多次）
  ├── event: usage      → token 使用量統計
  └── event: done       → 完成，寫入訊息歷史
```

### API Client 機制

`lib/api.ts` 提供統一的 `apiFetch()` 封裝：

- 自動附加 `Authorization: Bearer <token>` header
- 偵測 401 → 自動呼叫 `/auth/refresh` 刷新 token → 重試原始請求
- 刷新失敗 → 清除 auth state，導向登入頁
- 支援 `FormData`（檔案上傳時自動跳過 `Content-Type` 設定）

## 功能特色

- **SSR 首屏渲染:** TanStack Start 提供 Server-Side Rendering，首屏載入即可見內容
- **即時串流回應:** SSE streaming 逐字顯示 AI 回應，可中途取消
- **自動 Token 刷新:** fetch interceptor 自動處理 token 過期，使用者無感
- **文件管理:** 支援 txt / md / pdf 多檔上傳，拖放上傳介面
- **Type-safe 路由:** TanStack Router 提供完全型別安全的路由導航
- **IME 輸入相容:** 中文/日文等輸入法組字時不會誤觸送出

## License

MIT
