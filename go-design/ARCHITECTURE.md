# CI-Atlas Go 版本 - 系统架构设计

## 1. 目标与核心价值

本系统是一个**面向 MCP 的企业工具平台**，采用 **Go + Clean Architecture** 实现高性能、可维护的后端服务。核心目标保持一致：

- **多源入口**：同时提供 REST API 和独立 MCP 服务，支持不同客户端接入
- **凭证托管**：集中管理外部系统凭证，在调用时安全注入，避免明文传播
- **权限体系**：企业级五表 RBAC，细粒度的菜单、API、资源权限控制
- **异步处理**：统一的任务调度和执行框架，支持按需任务和定时任务
- **审计追踪**：全链路操作审计和工具执行日志，满足合规需求
- **生态优势**：Go 的并发性能优势，一个二进制可直接部署，无需运行时依赖

## 2. 总体架构

### 2.1 分层架构全景

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend / Admin Console                     │
│                  (用户认证、权限管理、凭证管理)                    │
└────────────────────────────────────────────────────────────────┬┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌──────────────────┐        ┌──────────────────┐
        │   HTTP API Port  │        │   MCP Port (独立)  │
        │                  │        │                  │
        │  API Service     │        │  MCP Service     │
        │  :8000           │        │  :9000           │
        └────────┬─────────┘        └────────┬─────────┘
                 │                           │
        ┌────────┴───────────────────────────┴────────┐
        │                                             │
        ▼                                             ▼
    ┌─────────────────────┐          ┌────────────────────────┐
    │ Middleware Layer    │          │ MCP Protocol Layer     │
    │  (Auth, RBAC,       │          │  (Protocol Handler)    │
    │   Request Context)  │          │                        │
    └─────────┬───────────┘          └──────────┬─────────────┘
              │                                 │
        ┌─────┴─────────────────────────────────┴─────┐
        │                                             │
        ▼                                             ▼
    ┌──────────────────────────────────────────────────────┐
    │      Handler Layer (HTTP Handlers)                   │
    │  - 参数解析、业务路由、响应格式化                      │
    └──────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┴────────────┬────────────────┐
        │                       │                │
        ▼                       ▼                ▼
    ┌────────────────────┐ ┌───────────────────────┐
    │  Service Layer     │ │  Port Interface Layer │
    │  (Business Logic)  │ │  (Dependency Inversion)
    │                    │ │                       │
    │ - AuthService      │ │  • CredentialPort   │
    │ - ExecutionService │ │  • RepositoryPort   │
    │ - SchedulerService │ │  • ProviderPort     │
    │ - TaskService      │ │  • GatewayPort      │
    └────────┬───────────┘ └────────┬─────────────┘
             │                      │
        ┌────┴──────────────────────┴──────┐
        │                                  │
        ▼                                  ▼
    ┌─────────────────────────┐  ┌──────────────────────┐
    │  Adapter Layer          │  │  External Gateways   │
    │                         │  │  (MCP, API Clients)  │
    │ - Repository Impl       │  │                      │
    │ - Provider Integration  │  │ - Jira Gateway       │
    │ - Scheduler Adapter     │  │ - Jenkins Gateway    │
    │                         │  │ - K8s Gateway        │
    └─────────────┬───────────┘  │ - Prometheus Gateway │
                  │              │ - Feishu Gateway     │
                  │              └──────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    ┌──────────────┐   ┌──────────────────────┐
    │ PostgreSQL   │   │ APScheduler JobStore │
    │ (Main DB)    │   │ (Task Scheduling)    │
    └──────────────┘   └──────────────────────┘
```

### 2.2 Clean Architecture 分层说明

| 层级 | 目录 | 职责 | 特点 |
|-----|------|------|------|
| **Entity** | `internal/entity/` | 领域模型 | 最内层，独立、无外部依赖 |
| **Service** | `internal/service/` | 业务逻辑 | 定义 Port 接口，实现业务规则 |
| **Adapter** | `internal/adapter/` | 适配器 | 实现 Port，连接外部资源 |
| **Infra** | `internal/infra/` | 基础设施 | Config、HTTP Server、DB 连接 |
| **App** | `internal/app/` | 应用启动 | 依赖注入、中间件装配 |

### 2.3 核心模块说明

| 模块 | 职责 | 实现位置 |
|-----|------|--------|
| **Auth** | 用户认证（内部 admin + 外部 LDAP）、JWT/Access Token、权限查询 | service/auth + adapter/repository |
| **Execution** | 参数校验、凭证注入、鉴权、审计 | service/execution + adapter/provider |
| **Provider** | 外部系统能力实现（Jira、K8s 等） | adapter/gateway |
| **Scheduler** | 异步任务和定时任务调度 | service/scheduler + adapter (APScheduler) |
| **HTTP API** | REST 入口、路由、请求格式 | adapter/http (handler、middleware、router) |
| **MCP** | MCP 协议适配层（独立） | 可选单独应用或合并到 API 服务 |

---

## 3. Clean Architecture 设计原则

### 3.1 依赖方向

```
Entity
  ▲
  │ 依赖方向总是向内
  │
Service （定义 Port 接口）
  ▲
  │
Adapter （实现 Port）
  ▲
  │
Infra & HTTP
```

**核心原则**：
1. **内层不依赖外层**：Entity 不知道 HTTP、Database、Framework 的存在
2. **依赖倒置**：Service 定义 Port（接口），Adapter 实现 Port
3. **高内聚低耦合**：Service 专注业务逻辑，不涉及 HTTP、DB 细节

### 3.2 Port 接口定义示例

```go
// internal/service/auth/port.go

// CredentialPort 定义凭证查询接口（由 Repository 实现）
type CredentialPort interface {
    GetCredential(ctx context.Context, id string) (*Credential, error)
    ListCredentials(ctx context.Context, userID string) ([]*Credential, error)
}

// RepositoryPort 定义用户查询接口
type RepositoryPort interface {
    GetUserByID(ctx context.Context, id string) (*User, error)
    GetUserByUsername(ctx context.Context, username string) (*User, error)
    ListPermissions(ctx context.Context, userID string) ([]string, error)
}

// AuthService 依赖上述 Port，不直接依赖 Database
type AuthService struct {
    credentialPort CredentialPort
    repositoryPort RepositoryPort
}
```

---

## 4. 核心数据流与交互

### 4.1 用户登入流程（同步）

```
User/Client
    │
    ├─ POST /api/v1/auth/login
    │  { "username": "...", "password": "..." }
    │  说明：无注册接口，内部仅 admin，本地密码；外部用户走 LDAP
    │
    ▼
┌─────────────────────────────────────────┐
│ HTTP Handler (adapter/http/handler)     │
│ - 解析请求 JSON                         │
│ - 验证字段（非空、格式）                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ AuthService.Login() (service/auth)      │
│ - 通过 RepositoryPort 查用户            │
│ - internal(admin) 走本地密码认证         │
│ - external 走 LDAP Bind 认证             │
│ - 生成前端 JWT (access)                 │
│ - 记录审计日志                          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Repository 实现 (adapter/repository)    │
│ - 执行 SQL 查询                         │
│ - 返回 User 对象                        │
└─────────────┬───────────────────────────┘
              │
              ▼
        PostgreSQL
              │
              ▼
┌─────────────────────────────────────────┐
│ HTTP Handler 返回响应                   │
│ {                                       │
│   "access_token": "...",                │
│   "token_type": "bearer"                │
│ }                                       │
└─────────────────────────────────────────┘
```

### 4.2 工具调用流程（同步）

```
User/Client
    │
    ├─ POST /api/v1/tools/jira/create-issue
    │  Authorization: Bearer <jwt>
    │  或 X-Access-Token: <token>
    │
    ▼
┌──────────────────────────────────────────────┐
│ Middleware: Authentication                   │
│ - 前端：Bearer JWT -> VerifyToken()          │
│ - 脚本：X-Access-Token -> VerifyAccessToken()│
│ - 将 user_id 存入 request context            │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Middleware: Authorization (RBAC)             │
│ - 从 context 获取 user_id                    │
│ - 查询权限：user_roles → role_permissions    │
│ - 检查 api:/api/v1/tools/jira:write          │
└────────┬─────────────────────────────────────┘
         │ (授权通过)
         ▼
┌──────────────────────────────────────────────┐
│ Handler (adapter/http/handler/tool.go)       │
│ - 解析请求 body                              │
│ - 提取 request_id, trace_id                  │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ ExecutionService.Execute() (service/execution)
│ - 参数校验 (struct tag validation)           │
│ - 查询凭证：CredentialPort.GetCredential()   │
│ - 解密凭证 (AES-GCM)                         │
│ - 创建审计日志记录                           │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Provider (adapter/gateway/jira.go)           │
│ - 初始化 Jira SDK 客户端                     │
│ - 调用 jira.CreateIssue()                    │
│ - 返回结果                                  │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Audit Log 更新                               │
│ - status: succeeded/failed                   │
│ - latency_ms: 实际耗时                       │
│ - response_json: 摘要                        │
└────────┬─────────────────────────────────────┘
         │
         ▼
    HTTP 200 OK
    {
      "result": {...},
      "request_id": "..."
    }
```

### 4.3 按需异步任务流程

```
User/Client
    │
    ├─ POST /api/v1/alerts (上报告警)
    │
    ▼
    Handler → Service → Repository
    INSERT INTO alerts (status='pending')
    │
    ▼
    立即返回 200
    { "alert_id": "a_123", "status": "pending" }
    │
    ├─ 并行处理 ──────────────────┐
    │                            │
    ├─ 投递异步任务到 APScheduler │
    │  scheduler.ScheduleJob(    │
    │    ID: "process_alert_a_123"│
    │    Func: processAlert,     │
    │    Args: alert_id          │
    │  )                         │
    │                            │
    ├─ APScheduler Worker 执行   │
    │  1. 从 alerts 表查询        │
    │  2. 执行业务逻辑（诊断、通知）
    │  3. 记录关键操作到 audit_logs
    │  4. 更新 alerts.status = 'succeeded'
    │                            │
    └──────────────────────────────┘
```

### 4.4 定时任务流程

```
┌─ 应用启动 ──────────────────┐
│                           │
├─ SchedulerService 初始化   │
│  scheduler := apscheduler  │
│  .NewScheduler()           │
│                           │
├─ 从 task_schedulers 表     │
│  加载所有启用的任务        │
│                           │
├─ 为每个任务注册           │
│  scheduler.ScheduleCronJob(│
│    ID: task_id,           │
│    Expr: cron_expr,       │
│    Func: executeTask      │
│  )                        │
│                           │
└─ 启动调度器              │
   scheduler.Start()        │


┌─ 执行时刻 ──────────────────┐
│                           │
├─ APScheduler 触发任务     │
│                           │
├─ 执行 executeTask()       │
│  1. 从 task_schedulers    │
│     查询任务定义          │
│  2. 提取 payload_json     │
│  3. 调用实际任务函数      │
│  4. 捕获返回值/异常       │
│  5. 更新 task_schedulers  │
│     UPDATE last_run_at    │
│  6. 写入 audit_logs       │
│                           │
└─ 完成                    │
```

---

## 5. 项目结构

### 5.1 完整目录树

```
ci-atlas-go/
├── cmd/
│   ├── api/                    # API 服务入口
│   │   └── main.go
│   └── mcp/                    # MCP 服务入口（可选）
│       └── main.go
│
├── internal/
│   ├── entity/                 # 领域模型（Clean Arch 核心层）
│   │   ├── user.go
│   │   ├── role.go
│   │   ├── permission.go
│   │   ├── credential.go
│   │   ├── task.go
│   │   ├── task_scheduler.go
│   │   ├── audit_log.go
│   │   └── provider.go
│   │
│   ├── service/                # 业务逻辑层（定义 Port）
│   │   ├── auth/
│   │   │   ├── port.go         # Port 接口定义
│   │   │   └── service.go      # AuthService 实现
│   │   ├── execution/
│   │   │   ├── port.go
│   │   │   └── service.go
│   │   ├── scheduler/
│   │   │   ├── port.go
│   │   │   └── service.go
│   │   ├── task/
│   │   │   ├── port.go
│   │   │   └── service.go
│   │   └── permission/
│   │       ├── port.go
│   │       └── service.go
│   │
│   ├── adapter/                # 适配器层（实现 Port）
│   │   ├── http/
│   │   │   ├── handler/
│   │   │   │   ├── auth.go
│   │   │   │   ├── tool.go
│   │   │   │   ├── task.go
│   │   │   │   ├── credential.go
│   │   │   │   └── rbac.go
│   │   │   ├── middleware/
│   │   │   │   ├── auth.go      # JWT 验证中间件
│   │   │   │   ├── authorization.go  # RBAC 中间件
│   │   │   │   ├── request_context.go # request_id 注入
│   │   │   │   ├── error_handler.go
│   │   │   │   └── recovery.go
│   │   │   ├── response/
│   │   │   │   └── response.go  # 统一响应格式
│   │   │   └── router.go
│   │   │
│   │   ├── repository/
│   │   │   ├── user_repository.go      # 实现 RepositoryPort
│   │   │   ├── credential_repository.go
│   │   │   ├── task_repository.go
│   │   │   ├── audit_log_repository.go
│   │   │   ├── base.go                 # 基础 CRUD
│   │   │   └── postgres.go             # PostgreSQL 连接
│   │   │
│   │   ├── gateway/
│   │   │   ├── jira.go
│   │   │   ├── jenkins.go
│   │   │   ├── kubernetes.go
│   │   │   ├── prometheus.go
│   │   │   ├── feishu.go
│   │   │   └── base.go                 # 基础网关类
│   │   │
│   │   └── scheduler/
│   │       ├── apscheduler.go          # APScheduler 包装
│   │       ├── task_executor.go
│   │       └── job_store.go
│   │
│   ├── infra/                  # 基础设施层
│   │   ├── config/
│   │   │   └── config.go       # 配置管理
│   │   ├── db/
│   │   │   ├── database.go     # DB 连接、迁移
│   │   │   ├── postgres.go
│   │   │   └── transaction.go
│   │   ├── http/
│   │   │   ├── server.go       # HTTP 服务器
│   │   │   └── client.go       # HTTP 客户端
│   │   ├── logger/
│   │   │   └── logger.go       # 日志配置
│   │   └── security/
│   │       ├── jwt.go          # JWT 工具
│   │       ├── crypto.go       # AES-GCM 加密
│   │       ├── password.go     # bcrypt 密码
│   │       └── random.go
│   │
│   ├── app/
│   │   └── app.go              # 应用启动、依赖注入
│   │
│   └── utils/
│       ├── errors.go           # 自定义错误
│       ├── validators.go       # 数据验证
│       └── helpers.go
│
├── migrations/                 # 数据库迁移脚本
│   ├── 001_init_schema.up.sql
│   ├── 001_init_schema.down.sql
│   └── ...
│
├── tests/
│   ├── unit/
│   │   ├── service/
│   │   │   ├── auth_test.go
│   │   │   └── execution_test.go
│   │   └── adapter/
│   │       ├── repository_test.go
│   │       └── handler_test.go
│   └── integration/
│       ├── api_test.go
│       └── fixtures/
│           └── testdata.sql
│
├── pkg/                        # 可重用包（公开 API）
│   ├── client/
│   │   ├── jira/
│   │   ├── jenkins/
│   │   ├── kubernetes/
│   │   └── prometheus/
│   └── sdk/
│       └── go-atlas/           # Go 客户端 SDK
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.mcp
│   └── docker-compose.yml
│
├── k8s/
│   ├── api-deployment.yaml
│   ├── mcp-deployment.yaml
│   └── postgres-statefulset.yaml
│
├── .env.example
├── .gitignore
├── Makefile
├── go.mod
├── go.sum
└── README.md
```

---

## 6. 技术栈

### 6.1 Go 生态选型

| 用途 | 选型 | 原因 |
|-----|------|------|
| **Web 框架** | Gin | 高性能路由、完善中间件系统 |
| **ORM** | GORM | 功能完整、生态丰富、易于使用 |
| **数据库驱动** | pgx | PostgreSQL 高性能驱动 |
| **数据库** | PostgreSQL 14+ | 一致的持久化、事务支持 |
| **配置管理** | github.com/caarlos0/env/v11 | 简洁环境变量绑定、零依赖 |
| **认证** | golang-jwt/jwt | JWT 签发和验证 |
| **密码哈希** | golang.org/x/crypto/bcrypt | bcrypt 密码安全 |
| **加密** | golang.org/x/crypto/aes/gcm | AES-GCM 凭证加密 |
| **日志** | log/slog (Go 1.21+) | 结构化日志、标准库内置 |
| **调度** | gocron | 分布式任务调度 |
| **MCP** | go-mcp (当 Go SDK 成熟后) | MCP 协议支持 |
| **HTTP 客户端** | 三方库优先 / resty 次选 | 便利的 HTTP 调用 |
| **UUID** | google/uuid | UUID 生成 |
| **时间** | time 标准库 | 时区处理 |
| **验证** | go-playground/validator | 结构体字段验证 |

### 6.2 启动流程

```go
// cmd/api/main.go

func main() {
    // 1. 加载配置
    cfg := infra.LoadConfig()
    
    // 2. 初始化日志
    logger := infra.InitLogger(cfg)
    defer logger.Sync()
    
    // 3. 初始化数据库
    db, err := infra.ConnectDB(cfg)
    if err != nil {
        logger.Fatal("Failed to connect to database", zap.Error(err))
    }
    defer db.Close()
    
    // 4. 运行数据库迁移
    if err := infra.MigrateDB(db); err != nil {
        logger.Fatal("Failed to migrate database", zap.Error(err))
    }
    
    // 5. 依赖注入、初始化服务
    app := app.NewApp(db, cfg, logger)
    
    // 6. 启动 HTTP 服务器
    server := infra.NewHTTPServer(cfg, app.Router())
    if err := server.Start(); err != nil && err != http.ErrServerClosed {
        logger.Fatal("HTTP server error", zap.Error(err))
    }
}
```

---

## 7. 核心设计要点

### 7.1 Port 接口分层

```go
// Service 定义 Port（依赖倒置）

// 服务层定义接口
type RepositoryPort interface {
    GetUser(ctx context.Context, id string) (*User, error)
    CreateUser(ctx context.Context, user *User) error
}

// Adapter 层实现接口
type PostgresUserRepository struct {
    db *sql.DB
}

func (r *PostgresUserRepository) GetUser(ctx context.Context, id string) (*User, error) {
    // 实现 SQL 查询
}

// Service 接收依赖
type AuthService struct {
    repo RepositoryPort
}

// 依赖注入
authService := NewAuthService(postgresRepo)
```

### 7.2 错误处理

```go
// 自定义错误，包含 HTTP 状态码和业务错误码
type APIError struct {
    Code       string // "UNAUTHORIZED", "PERMISSION_DENIED" 等
    StatusCode int    // 401, 403 等
    Message    string
    Details    map[string]interface{}
}

// Middleware 统一处理异常
func ErrorHandlerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // 转换为 APIError，返回 JSON
            }
        }()
        c.Next()
    }
}
```

### 7.3 事务处理

```go
// Service 层使用 Transaction Port
type TransactionPort interface {
    Begin(ctx context.Context) (Transaction, error)
}

// Repository 在事务中执行
type Transaction interface {
    Commit() error
    Rollback() error
    Query(sql string, args ...interface{}) (*sql.Rows, error)
}
```

---

## 8. 部署与扩展

### 8.1 本地开发

```bash
# docker-compose 一键启动依赖
docker-compose -f docker/docker-compose.yml up -d

# Go 应用直接运行
make run

# 或
go run cmd/api/main.go
```

### 8.2 容器部署

```bash
# 构建镜像
docker build -f docker/Dockerfile.api -t ci-atlas:latest .

# 运行
docker run -e DATABASE_URL=... -p 8000:8000 ci-atlas:latest
```

### 8.3 Kubernetes 部署

```yaml
# API Service（可多副本）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ci-atlas-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: ci-atlas:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: postgresql://...
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
```

