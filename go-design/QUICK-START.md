# CI-Atlas Go 版本 - 快速开始指南

## 📖 查看文档

1. **系统架构** → 打开 [ARCHITECTURE.md](ARCHITECTURE.md)
   - Clean Architecture 分层
   - Port 接口设计
   - 核心模块说明
   - 数据流交互

2. **详细设计** → 打开 [DETAILED_DESIGN.md](DETAILED_DESIGN.md)
   - 完整代码示例
   - Entity → Service → Adapter → Infra 分层实现
   - 数据库设计
   - 依赖注入
   - 部署指南

3. **文档索引** → 打开 [DESIGN-DOCS-INDEX.md](DESIGN-DOCS-INDEX.md)
   - 所有文档清单
   - 推荐阅读顺序
   - 迁移指南
   - 技术对比

---

## 🎯 核心特点

### Clean Architecture
```
Entity (领域模型)
  ↓ (依赖)
Service (业务逻辑 + Port 接口)
  ↓
Adapter (HTTP Handler, Repository, Gateway)
  ↓
Infra (Config, Database, Security)
```

### 关键优势
- ✅ **类型安全**：编译时类型检查
- ✅ **高性能**：单 goroutine 并发，启动快 (~100ms)
- ✅ **单二进制**：无需 Runtime 依赖
- ✅ **可维护**：Port 接口清晰，易于测试和扩展
- ✅ **易于扩展**：Adapter 层独立于 Service 层

---

## 🚀 技术栈

| 组件 | 选择 | 原因 |
|-----|------|------|
| **Web** | Gin | 路由性能高，中间件灵活 |
| **ORM** | GORM | 功能完整，hooks 丰富，快速开发 |
| **数据库** | PostgreSQL | 一致的持久化 |
| **认证** | golang-jwt + LDAP | 前端 JWT，会话认证；外部用户 LDAP 登录 |
| **密码** | bcrypt | Go 标准库（golang.org/x/crypto） |
| **加密** | AES-GCM | Go 标准库 |
| **任务** | gocron | 分布式任务调度 |
| **日志** | slog (Go 1.21+) | 结构化日志，标准库内置 |
| **配置** | env/v11 | 简洁环境变量绑定，零依赖 |
| **DI** | wire (goforj) | 社区维护的编译期依赖注入框架 |
| **HTTP 客户端** | 三方库优先 / resty | 优先使用官方 SDK，次选 resty |

---

## 📂 项目结构

```
ci-atlas-go/
├── internal/
│   ├── entity/         # 领域模型（无外部依赖）
│   ├── service/        # 业务逻辑 + Port 接口
│   ├── adapter/        # HTTP、Repository、Gateway
│   ├── infra/          # Config、Database、Security
│   └── app/            # 依赖注入、启动
├── cmd/
│   ├── api/main.go     # API Service 入口
│   └── mcp/main.go     # MCP Service 入口
├── migrations/         # 数据库迁移
├── tests/              # 单元 + 集成测试
└── pkg/                # 公开 SDK
```

---

## 💡 核心设计模式

### 1. Port-Adapter 模式
```go
// Service 定义 Port（接口）
type RepositoryPort interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

// Adapter 实现 Port
type PostgresRepository struct { db *sql.DB }

// Service 依赖 Port（不依赖具体实现）
type AuthService struct {
    repo RepositoryPort
}
```

### 2. 认证模型（无注册接口）
```text
用户类型：
- internal: 仅 admin（本地密码）
- external: LDAP 用户（LDAP Bind 认证）

鉴权方式：
- 前端：Bearer JWT
- curl/脚本：X-Access-Token
```

### 3. Dependency Injection
```go
// App 层集中管理依赖
app := &App{
    authService:  NewAuthService(repo, perms, tokens),
    execService:  NewExecutionService(...),
    scheduler:    NewScheduler(...),
}
```

---

## 🏃 快速开始（假设项目已建立）

```bash
# 1. 克隆项目
git clone <repo> ci-atlas-go
cd ci-atlas-go

# 2. 安装依赖
go mod download

# 3. 启动开发环境（需要 PostgreSQL）
docker-compose up -d postgres
# 或使用现有的 PostgreSQL 实例
export DATABASE_URL=postgres://...

# 4. 运行迁移
go run cmd/migrate/main.go

# 5. 启动 API Service
go run cmd/api/main.go

# 6. 运行测试
go test -v ./...

# 7. 构建二进制
make build
```

---

## 📚 按需求查看文档

**我想理解 Clean Architecture**
→ [ARCHITECTURE.md](ARCHITECTURE.md) §3

**我想看代码示例**
→ [DETAILED_DESIGN.md](DETAILED_DESIGN.md) §2

**我想了解数据库设计**
→ [DETAILED_DESIGN.md](DETAILED_DESIGN.md) §3

**我想看部署指南**
→ [DETAILED_DESIGN.md](DETAILED_DESIGN.md) §4

**我想对比 Python vs Go**
→ [DETAILED_DESIGN.md](DETAILED_DESIGN.md) §6

**我想了解迁移路径**
→ [DETAILED_DESIGN.md](DETAILED_DESIGN.md) §7

---

## ✅ 设计核对清单

- [x] Clean Architecture 分层
- [x] Port-Adapter 依赖倒置
- [x] JWT + Access Token + RBAC
- [x] 凭证加密存储（AES-GCM）
- [x] 工具执行流程（Execution Service）
- [x] 异步任务 + 定时任务
- [x] 审计日志
- [x] 无注册接口（仅登录）
- [x] 错误处理
- [x] 依赖注入
- [x] 数据库迁移
- [x] Docker 容器化
- [x] Kubernetes 部署

---

## 🔗 关键链接

- Python 版本参考：[backend/](../backend/)
- 参考项目结构：[gerrit/web-desgin/go-backend](../gerrit/web-desgin/go-backend/)
- 完整文档索引：[DESIGN-DOCS-INDEX.md](DESIGN-DOCS-INDEX.md)

---

**开始编码前，建议：**
1. 快速浏览 [ARCHITECTURE.md](ARCHITECTURE.md)
2. 深入阅读 [DETAILED_DESIGN.md](DETAILED_DESIGN.md)
3. 参考 [backend/](../backend/) 实现细节
4. 参考 [gerrit/web-desgin/go-backend](../gerrit/web-desgin/go-backend/) 项目结构
