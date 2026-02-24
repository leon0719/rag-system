# FastAPI RAG System Backend

基於 FastAPI 的 RAG (Retrieval-Augmented Generation) 系統後端，支援文件上傳、向量搜尋、AI 問答（SSE 串流）與對話管理。

## 技術棧

- **Web 框架**: FastAPI, Uvicorn
- **資料庫**: PostgreSQL 17 + pgvector (向量搜尋)
- **快取**: Redis 7 (Token 黑名單, 速率限制)
- **ORM**: SQLAlchemy 2.x (async) + Alembic
- **AI**: OpenAI API (embedding + chat completion, SSE streaming)
- **認證**: JWT (PyJWT) + bcrypt
- **速率限制**: SlowAPI (Redis-backed)
- **Python**: 3.13

## 快速開始

### 1. 環境設定

```bash
# 複製本地開發環境變數範例
cp .env.local.example .env.local

# 編輯 .env.local，填入必要的設定
# - OPENAI_API_KEY: OpenAI API 金鑰 (必填)
# - JWT_SECRET_KEY: 建議更換為安全的隨機金鑰
```

**生成金鑰方式：**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. 啟動開發環境

本專案使用 Docker 進行本地開發：

```bash
# 啟動所有服務 (PostgreSQL, Redis, API)
make up

# 等待服務啟動後，執行資料庫遷移
make migrate

# 查看日誌
make logs

# 停止服務
make down
```

啟動後：
- API: http://localhost:8002
- API 文件 (Swagger UI): http://localhost:8002/docs

## 環境變數

### 本地開發 (`.env.local`)

```bash
# 使用 Docker 內部網路連線
DATABASE_URL=postgresql+asyncpg://raguser:ragpass@db:5432/ragdb
REDIS_URL=redis://redis:6379/0
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
```

### 生產環境 (`.env.prod`)

```bash
cp .env.local.example .env.prod
# 編輯 .env.prod 填入正式環境設定
```

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 連線字串 (asyncpg) | - |
| `REDIS_URL` | Redis 連線字串 | - |
| `OPENAI_API_KEY` | OpenAI API 金鑰 | - |
| `JWT_SECRET_KEY` | JWT 簽名金鑰 | - |
| `ENV` | 環境名稱 | `local` |
| `DEBUG` | 除錯模式 | `false` |
| `CORS_ALLOWED_ORIGINS` | CORS 允許的來源（逗號分隔） | `http://localhost:3000,http://127.0.0.1:3000` |
| `JWT_ALGORITHM` | JWT 演算法 | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access Token 有效期（分鐘） | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh Token 有效期（天） | `7` |
| `EMBEDDING_MODEL` | Embedding 模型 | `text-embedding-3-small` |
| `EMBEDDING_DIMENSION` | Embedding 維度 | `1536` |
| `CHAT_MODEL` | Chat 模型 | `gpt-4o` |
| `CHAT_TEMPERATURE` | Chat 溫度 | `0.7` |
| `CHAT_MAX_TOKENS` | Chat 回應最大 token 數 | `2048` |
| `CHUNK_SIZE` | 文件切割 token 上限 | `512` |
| `CHUNK_OVERLAP` | 切割重疊 token 數 | `50` |
| `MAX_UPLOAD_FILE_SIZE` | 上傳檔案大小上限 | `10485760` (10 MB) |
| `VECTOR_SEARCH_TOP_K` | 向量搜尋回傳數量 | `5` |
| `RATE_LIMIT_ENABLED` | 是否啟用速率限制 | `true` |
| `RATE_LIMIT_DEFAULT` | 預設速率限制 | `60/minute` |

## API 端點

### Health Check

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/health` | 健康檢查（DB 連線） | No |

### 認證 `/api/auth/`

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/auth/register` | 註冊新使用者 | No |
| POST | `/api/auth/login` | 登入（回傳 access token + refresh cookie） | No |
| POST | `/api/auth/refresh` | 刷新 access token（token rotation） | No |
| POST | `/api/auth/logout` | 登出（token 加入黑名單） | Yes |
| GET | `/api/auth/me` | 取得當前使用者資訊 | Yes |

**Token 策略：**
- Access token: 放在 response body，30 分鐘過期
- Refresh token: HttpOnly cookie（Secure, SameSite=Lax），7 天過期
- Refresh 時 token rotation：舊 refresh token 進黑名單，發新的
- 登出時 blacklist access + refresh tokens（Redis TTL 自動清理）

### 文件管理 `/api/documents/`

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/documents/upload` | 上傳文件（支援多檔：.txt, .md, .pdf） | Yes |
| GET | `/api/documents/` | 列出當前使用者的所有文件 | Yes |
| GET | `/api/documents/{id}` | 取得文件詳情 | Yes |
| DELETE | `/api/documents/{id}` | 刪除文件及其所有 chunks | Yes |

**文件上傳流程：** 讀取檔案 → 文字切割 (recursive splitter) → OpenAI embedding → 寫入 PostgreSQL + pgvector

### 對話管理 `/api/conversations/`

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/conversations/` | 建立新對話 | Yes |
| GET | `/api/conversations/` | 列出使用者的對話（分頁） | Yes |
| GET | `/api/conversations/{id}` | 取得對話詳情（含所有訊息） | Yes |
| PATCH | `/api/conversations/{id}` | 更新對話標題 | Yes |
| DELETE | `/api/conversations/{id}` | 刪除對話及所有訊息 | Yes |

### RAG 問答 `/api/chat/`

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/chat/query` | RAG 查詢（SSE 串流回應） | Yes |

**請求格式：**
```json
{"question": "你的問題", "top_k": 5, "conversation_id": "uuid (可選)"}
```

若未提供 `conversation_id`，系統會自動建立新對話。

**SSE 事件格式：**

```
event: conversation_id
data: "uuid-of-conversation"

event: sources
data: [{"document_id": "uuid", "filename": "test.txt", "chunk_index": 0, "content": "...", "score": 0.95}]

event: delta
data: "這是"

event: delta
data: "回答內容"

event: usage
data: {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}

event: done
data: {"full_text": "完整回答內容"}
```

| 事件類型 | 說明 |
|----------|------|
| `conversation_id` | 對話 UUID（首先發送） |
| `sources` | 檢索到的相關文件片段（JSON 陣列） |
| `delta` | LLM 逐步生成的文字 token |
| `usage` | Token 使用量統計 |
| `done` | 串流結束（含完整回答文字） |
| `error` | 錯誤訊息 |

## 安全功能

- **密碼複雜度**：至少 12 字元，須包含大小寫字母、數字、特殊字元
- **Token 黑名單**：登出時 token 加入 Redis 黑名單，TTL 自動清理
- **Refresh Token 安全**：HttpOnly cookie 防 XSS，token rotation 防重放攻擊
- **資料隔離**：每個使用者只能存取自己的文件、對話和 RAG 查詢結果
- **所有權驗證**：文件和對話 CRUD 操作會檢查所有權
- **速率限制**：SlowAPI + Redis，支援 per-user（JWT）和 per-IP fallback

## 常用指令

```bash
make help              # 顯示所有可用指令

# 開發環境 (Docker)
make up                # 啟動開發容器
make down              # 停止開發容器
make build             # 僅建構開發映像
make rebuild           # 重新建構並啟動（修改 Dockerfile 或 pyproject.toml 後使用）
make logs              # 查看所有日誌
make logs-api          # 查看 API 日誌
make logs-db           # 查看資料庫日誌

# 生產環境 (Docker)
make prod-build        # 建構生產映像
make prod-up           # 啟動生產容器
make prod-down         # 停止生產容器
make prod-logs         # 查看生產日誌

# 資料庫 (Alembic)
make migrate           # 執行 alembic upgrade head
make makemigrations    # 建立新遷移檔 (MSG='description')
make shell             # 開啟 Python shell

# 程式碼品質
make all               # 執行所有檢查 (format + lint + type-check)
make format            # 格式化程式碼 (ruff)
make lint              # Lint 檢查 (ruff)
make type-check        # 型別檢查 (mypy)
make test              # 執行測試 (pytest)
make coverage          # 測試覆蓋率報告
make unused            # 檢查未使用的函式

# 其他
make install           # 安裝本地依賴（僅供 IDE）
make clean             # 清理快取檔案
make docker-clean      # 清理 Docker 資料卷
```

## 專案結構

```
backend/
├── app/
│   ├── main.py                    # FastAPI app factory + lifespan
│   ├── config.py                  # Pydantic Settings (lru_cache singleton)
│   ├── database.py                # SQLAlchemy async engine/session
│   ├── dependencies.py            # FastAPI dependencies (DBSession, CurrentUser)
│   ├── api/
│   │   ├── health.py              # GET /api/health
│   │   ├── auth.py                # 認證 endpoints
│   │   ├── documents.py           # 文件管理 endpoints
│   │   ├── conversations.py       # 對話管理 endpoints (CRUD)
│   │   └── chat.py                # RAG 問答 endpoint (SSE)
│   ├── models/
│   │   ├── base.py                # DeclarativeBase + TimestampMixin
│   │   ├── user.py                # User model
│   │   ├── document.py            # Document + DocumentChunk (pgvector)
│   │   └── conversation.py        # Conversation + Message
│   ├── schemas/
│   │   ├── auth.py                # 認證相關 schemas
│   │   ├── document.py            # 文件相關 schemas
│   │   ├── conversation.py        # 對話相關 schemas
│   │   └── chat.py                # 問答相關 schemas
│   ├── services/
│   │   ├── auth.py                # JWT + 密碼 hash + Redis blacklist
│   │   ├── embedding.py           # OpenAI embedding (batch, retry)
│   │   ├── chunking.py            # Recursive text splitter (tiktoken)
│   │   ├── document.py            # 文件 ingestion pipeline
│   │   ├── conversation.py        # 對話 CRUD + message 管理
│   │   └── rag.py                 # 向量搜尋 + LLM 生成 (SSE streaming)
│   └── core/
│       ├── logging.py             # Loguru 設定
│       ├── exceptions.py          # 自訂例外 + handlers
│       ├── limiter.py             # SlowAPI 速率限制 (Redis-backed)
│       └── openai.py              # AsyncOpenAI singleton client
├── alembic/                       # 資料庫遷移
├── scripts/
│   └── check_unused_functions.py  # 未使用函式檢查
├── tests/                         # 測試檔案
├── docker/
│   ├── Dockerfile                 # 生產映像
│   ├── Dockerfile.dev             # 開發映像
│   ├── docker-compose.dev.yml     # 開發環境 (API + PostgreSQL + Redis)
│   └── docker-compose.prod.yml    # 生產環境
├── .env.local.example             # 環境變數範本
├── pyproject.toml                 # 依賴與工具設定
├── alembic.ini                    # Alembic 設定
└── Makefile                       # 開發指令
```

## 測試

```bash
# 執行所有測試（在 Docker 中）
make test

# 執行特定測試檔案
make test TEST=tests/test_auth.py

# 執行單一測試
make test TEST="tests/test_auth.py::test_login_success -v"

# 測試覆蓋率
make coverage
```

## API 文件

啟動伺服器後，可在以下位置查看自動產生的 API 文件：

- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc
- OpenAPI JSON: http://localhost:8002/openapi.json
