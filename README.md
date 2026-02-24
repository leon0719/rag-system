# RAG System

基於向量搜尋的 RAG (Retrieval-Augmented Generation) 系統，支援文件上傳、語意檢索、AI 串流回應與對話管理。

## 功能特色

- **文件向量化** - 上傳文件自動切分並透過 OpenAI Embedding 轉為向量儲存
- **語意搜尋** - 使用 pgvector 進行高效向量相似度檢索
- **SSE 串流回應** - 透過 Server-Sent Events 實現 AI 回應的逐字串流顯示
- **對話管理** - 建立、瀏覽、刪除對話，完整保存對話歷史與 token 用量
- **來源引用** - 回應附帶相關文件片段與相似度分數
- **安全認證** - JWT Token 認證，支援 Token 輪換與黑名單機制
- **文件管理** - 上傳、瀏覽、刪除文件，支援 TXT、Markdown、PDF 格式
- **速率限制** - SlowAPI + Redis，支援 per-user 和 per-IP 限流

## 技術棧

### 後端

| 類別 | 技術 |
|------|------|
| 框架 | FastAPI、Uvicorn |
| 語言 | Python 3.13 |
| 資料庫 | PostgreSQL 17 + pgvector |
| 快取 | Redis 7 (Token 黑名單、速率限制) |
| ORM | SQLAlchemy 2 (async) + Alembic |
| AI | OpenAI API (Embedding + Chat Streaming)、Tiktoken |
| 認證 | JWT (PyJWT) + bcrypt |
| 速率限制 | SlowAPI |
| 日誌 | Loguru |

### 前端

| 類別 | 技術 |
|------|------|
| 框架 | SolidJS 1.9、TypeScript、Vite 7 |
| SSR | TanStack Start、TanStack Router |
| 狀態管理 | TanStack Query、SolidJS Stores |
| UI | Tailwind CSS 4、Lucide Icons |
| 表單 | TanStack Form、Zod |

## 專案結構

```
rag-system/
├── backend/                          # FastAPI 後端
│   ├── app/
│   │   ├── api/                     # API 路由
│   │   │   ├── auth.py              # 認證端點
│   │   │   ├── chat.py              # RAG 查詢 (SSE 串流)
│   │   │   ├── conversations.py     # 對話管理 (CRUD)
│   │   │   ├── documents.py         # 文件上傳 / 管理
│   │   │   └── health.py            # 健康檢查
│   │   ├── core/                    # 核心模組
│   │   │   ├── exceptions.py        # 自訂例外 + handlers
│   │   │   ├── limiter.py           # SlowAPI 速率限制
│   │   │   ├── logging.py           # Loguru 設定
│   │   │   └── openai.py            # AsyncOpenAI singleton
│   │   ├── models/                  # SQLAlchemy 模型
│   │   │   ├── user.py              # User
│   │   │   ├── document.py          # Document + DocumentChunk
│   │   │   └── conversation.py      # Conversation + Message
│   │   ├── schemas/                 # Pydantic 驗證
│   │   ├── services/                # 業務邏輯
│   │   │   ├── auth.py              # JWT、密碼雜湊
│   │   │   ├── conversation.py      # 對話 CRUD + 訊息管理
│   │   │   ├── document.py          # 文件處理管線
│   │   │   ├── chunking.py          # 文本切分
│   │   │   ├── embedding.py         # 向量嵌入
│   │   │   └── rag.py               # 向量搜尋 + LLM 串流 + 對話整合
│   │   ├── config.py                # 設定管理
│   │   ├── database.py              # 非同步資料庫連線
│   │   └── dependencies.py          # FastAPI 依賴注入
│   ├── docker/                      # Docker 配置
│   ├── alembic/                     # 資料庫遷移
│   ├── tests/                       # 測試
│   └── Makefile                     # 開發指令
├── frontend/                         # SolidJS 前端
│   └── src/
│       ├── routes/                  # 檔案路由
│       │   ├── _authed/chat/        # 聊天頁面 (含對話路由)
│       │   ├── _authed/documents/   # 文件管理頁面
│       │   ├── login.tsx            # 登入
│       │   └── register.tsx         # 註冊
│       ├── components/              # UI 元件
│       │   ├── chat/                # 聊天相關 (ChatView, ChatMessage, ConversationList, ...)
│       │   ├── documents/           # 文件相關
│       │   ├── layout/              # 佈局 (AppLayout, Sidebar, AuthLayout, ...)
│       │   ├── common/              # 通用元件
│       │   └── ui/                  # 基礎 UI 元件
│       ├── lib/                     # API 客戶端、SSE、工具
│       ├── stores/                  # 狀態管理
│       ├── contexts/                # Auth Context
│       └── types/                   # TypeScript 型別
└── README.md
```

## 快速開始

### 環境需求

- Python 3.13+
- Node.js 20+ 或 Bun
- Docker & Docker Compose
- PostgreSQL 17 (含 pgvector 擴充)
- Redis 7

### 後端設定

```bash
cd backend

# 複製環境變數範本
cp .env.local.example .env.local

# 啟動開發環境 (PostgreSQL + Redis + API)
make up

# 執行資料庫遷移
make migrate
```

### 前端設定

```bash
cd frontend

# 安裝依賴
bun install  # 或 npm install

# 啟動開發伺服器
bun dev  # 或 npm run dev
```

應用程式將在以下位置運行：
- 前端：http://localhost:3000
- 後端 API：http://localhost:8002/api
- API 文件 (Swagger UI)：http://localhost:8002/docs

## 環境變數

### 後端 `.env.local`

```bash
# 必填
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5433/dbname
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET_KEY=your-jwt-secret-key

# 選填
ENV=local
DEBUG=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
CHAT_MODEL=gpt-4o
CHAT_TEMPERATURE=0.7
CHAT_MAX_TOKENS=2048
CHUNK_SIZE=512
CHUNK_OVERLAP=50
MAX_UPLOAD_FILE_SIZE=10485760
VECTOR_SEARCH_TOP_K=5
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT=60/minute
```

### 前端 `.env`

```bash
VITE_API_BASE_URL=http://localhost:8002/api
```

## API 文檔

### 認證端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 使用者註冊 |
| POST | `/api/auth/login` | 登入取得 Token |
| POST | `/api/auth/refresh` | 刷新 Access Token |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 取得使用者資訊 |

### 文件端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/documents/upload` | 上傳文件 (支援多檔) |
| GET | `/api/documents/` | 列出文件 (分頁) |
| GET | `/api/documents/{id}` | 取得文件詳情 |
| DELETE | `/api/documents/{id}` | 刪除文件 |

### 對話端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/conversations/` | 建立新對話 |
| GET | `/api/conversations/` | 列出對話 (分頁) |
| GET | `/api/conversations/{id}` | 取得對話詳情 (含所有訊息) |
| PATCH | `/api/conversations/{id}` | 更新對話標題 |
| DELETE | `/api/conversations/{id}` | 刪除對話 |

### RAG 查詢

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/chat/query` | RAG 查詢 (SSE 串流) |

### 健康檢查

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/health` | 檢查服務狀態 |

## SSE 串流協議

### RAG 查詢與回應

```javascript
// 發送 RAG 查詢
const response = await fetch('/api/chat/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <access_token>'
  },
  body: JSON.stringify({
    question: '什麼是 RAG？',
    top_k: 5,
    conversation_id: 'uuid (可選，未提供則自動建立新對話)'
  })
});

// 接收 SSE 串流事件
// event: conversation_id → "uuid"  (對話 UUID，首先發送)
// event: sources  → [{ document_id, filename, chunk_index, content, score }]
// event: delta    → "token text"  (逐字串流，多次觸發)
// event: usage    → { prompt_tokens, completion_tokens, total_tokens }
// event: done     → { full_text: "完整回答" }
// event: error    → { detail: "error message" }
```

## 開發指令

### 後端

```bash
make up                 # 啟動開發環境
make down               # 停止容器
make rebuild            # 重建容器
make logs               # 查看日誌
make migrate            # 執行遷移
make makemigrations     # 建立遷移 (MSG='description')
make shell              # Python Shell
make test               # 執行測試
make coverage           # 測試覆蓋率
make lint               # 程式碼檢查
make format             # 程式碼格式化
make type-check         # 型別檢查
make unused             # 檢查未使用函式
make all                # 執行所有檢查
```

### 前端

```bash
bun dev                 # 開發伺服器
bun build               # 生產建置
bun preview             # 預覽建置
bun lint                # 程式碼檢查
bun format              # 程式碼格式化
```

## 安全特性

- **JWT 認證** - Access Token (30 分鐘) + Refresh Token (7 天，HttpOnly Cookie)
- **Token 輪換** - 刷新時舊 Token 失效，發放新 Token 對
- **Token 黑名單** - 登出時將 Token 加入 Redis 黑名單
- **密碼安全** - bcrypt 雜湊，至少 12 字元，須含大小寫、數字、特殊字元
- **資料隔離** - 使用者僅能存取自己的文件、對話與向量搜尋結果
- **檔案驗證** - 限制檔案類型 (.txt, .md, .pdf) 與大小 (10 MB)
- **速率限制** - SlowAPI + Redis，支援 per-user (JWT) 和 per-IP 限流
- **CORS** - 限制允許的來源

## Docker 部署

### 開發環境

```bash
docker compose -f backend/docker/docker-compose.dev.yml up
```

### 生產環境

```bash
docker compose -f backend/docker/docker-compose.prod.yml up
```

## 授權條款

MIT License
