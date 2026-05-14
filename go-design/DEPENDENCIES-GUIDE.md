# Go 版本推荐依赖配置示例

## go.mod 示例

```go
module github.com/your-org/ci-atlas-go

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/gorm.io/gorm v1.25.4
    github.com/gorm.io/driver/postgres v1.5.4
    github.com/golang-jwt/jwt/v5 v5.0.0
    github.com/google/uuid v1.3.0
    github.com/caarlos0/env/v11 v11.0.0
    github.com/goforj/wire v1.1.0
    github.com/robfig/cron/v3 v3.0.1
    golang.org/x/crypto v0.14.0
)
```

## 关键依赖说明

### Web & ORM
- **gin v1.9+** — HTTP 框架，路由性能最佳
- **gorm v1.25+** — ORM 框架，生态完整
- **pgx driver** — PostgreSQL 高性能驱动

### 认证与安全
- **golang-jwt v5.x** — JWT 签发与验证
- **bcrypt (golang.org/x/crypto)** — 密码哈希
- **AES-GCM (golang.org/x/crypto)** — 数据加密

### 配置与日志
- **env/v11** — 环境变量配置绑定（零依赖）
- **log/slog** — Go 1.21+ 内置结构化日志

### 任务调度
- **gocron v1.x** — 分布式任务调度引擎

### 依赖注入
- **wire (goforj) v1.x+** — 社区维护编译期 DI 框架，消除 Runtime 开销

### HTTP 客户端优先级
1. **第三方官方 SDK**（Jira、Jenkins 等）
2. **resty** — 便利的 HTTP 客户端
3. **net/http** — 标准库

---

## .env 示例

```bash
# 应用配置
APP_NAME=CI-Atlas
APP_PORT=8000

# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ci_atlas
DB_MAX_OPEN_CONN=25
DB_MAX_IDLE_CONN=5

# JWT 配置
JWT_SECRET_KEY=your-secret-key-change-in-prod
JWT_ALGORITHM=HS256

# 加密配置
ENCRYPTION_KEY_BASE64=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=

# 日志配置
LOG_LEVEL=info
```

---

## 快速命令

```bash
# 初始化项目
go mod init github.com/your-org/ci-atlas-go

# 添加依赖
go get github.com/gin-gonic/gin@v1.9.1
go get github.com/gorm.io/gorm@v1.25.4
go get github.com/gorm.io/driver/postgres@v1.5.4
go get github.com/golang-jwt/jwt/v5@v5.0.0
go get github.com/caarlos0/env/v11@v11.0.0
go get github.com/goforj/wire@latest
go get golang.org/x/crypto

# 下载所有依赖
go mod download

# 验证依赖
go mod tidy

# 生成依赖锁文件
go mod verify
```

---

## 库使用指南

### 1. 环境变量配置（env/v11）

```go
package config

import "github.com/caarlos0/env/v11"

type Config struct {
    App struct {
        Port int    `env:"APP_PORT" envDefault:"8000"`
    }
    Database struct {
        URL string `env:"DATABASE_URL" envDefault:"postgres://..."`
    }
}

func Load() (*Config, error) {
    cfg := &Config{}
    if err := env.Parse(cfg); err != nil {
        return nil, err
    }
    return cfg, nil
}
```

### 2. GORM 基础用法

```go
import "gorm.io/gorm"

type User struct {
    ID       uuid.UUID
    Username string
    Email    string
}

// 查询
var user User
db.First(&user, "username = ?", "john")

// 创建
db.Create(&user)

// 更新
db.Model(&user).Update("email", "newemail@example.com")

// 删除
db.Delete(&user)
```

### 3. slog 日志用法

```go
import "log/slog"

logger := slog.Default()

// 信息日志
logger.Info("User login successful",
    slog.String("username", user.Username),
    slog.String("ip", clientIP),
)

// 错误日志
logger.Error("Failed to create user",
    slog.Any("error", err),
    slog.String("username", username),
)

// 调试日志
logger.Debug("Processing request",
    slog.String("request_id", reqID),
)
```

### 4. HTTP 客户端选择

```go
// 优先：使用官方 SDK
import "github.com/andygrunwald/go-jira"

client, _ := jira.NewClient(httpClient, "https://jira.example.com")
issues, _ := client.Issue.Search("project = ATLAS", nil)

// 次选：使用 resty
import "github.com/go-resty/resty/v2"

client := resty.New()
resp, err := client.R().
    SetBasicAuth(user, pass).
    Get("https://jira.example.com/rest/api/3/myself")

// 兜底：使用标准库
import "net/http"

req, _ := http.NewRequest("GET", url, nil)
req.Header.Set("Authorization", "Bearer "+token)
resp, _ := http.DefaultClient.Do(req)
```

---

## 官方 SDK 列表

| 系统 | 官方库 | 推荐版本 |
|-----|------|--------|
| **Jira** | andygrunwald/go-jira | latest |
| **Jenkins** | bndr/gojenkins | latest |
| **Kubernetes** | kubernetes/client-go | v0.x |
| **Prometheus** | prometheus/client_golang | latest |
| **GitLab** | xanzy/go-gitlab | latest |
| **GitHub** | google/go-github | latest |
| **Slack** | slack-go/slack | latest |
| **飞书** | larksuite-oapi-sdk-go | latest |

---

## 项目生成

推荐使用 `goforj/wire` 生成依赖注入代码：

```bash
# 创建 wire.go 文件定义依赖关系
# 然后运行
wire ./...

# wire 会生成 wire_gen.go
```

详见：[DETAILED_DESIGN.md - App 层](DETAILED_DESIGN.md)

