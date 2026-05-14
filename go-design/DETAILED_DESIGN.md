# CI-Atlas Go 版本 - 详细设计

## 1. Go 实现决策

### 1.1 技术栈选型

| 用途 | 选型 | 版本 | 优势 |
|-----|------|------|------|
| **Web 框架** | Gin | 1.9+ | 路由性能高、中间件灵活 |
| **ORM** | GORM | 1.25+ | 功能完整、hooks 丰富、易于使用 |
| **数据库驱动** | pgx | 5.x | PostgreSQL 高性能驱动、连接池 |
| **数据库** | PostgreSQL | 14+ | JSONB、advisory lock 支持 |
| **配置** | github.com/caarlos0/env/v11 | 11.x | 简洁环境变量绑定、零依赖 |
| **依赖注入** | wire (goforj) | 1.x+ | 社区维护编译期 DI 框架 |
| **JWT** | golang-jwt/jwt | 5.x | 标准库、签名验证 |
| **密码** | golang.org/x/crypto/bcrypt | - | Go 标准库 |
| **加密** | golang.org/x/crypto/aes | - | AES-GCM 标准库 |
| **日志** | log/slog | Go 1.21+ | 结构化日志、标准库内置 |
| **调度** | gocron | 1.x | 分布式任务调度 |
| **验证** | validator.v10 | 10.x | 结构体字段验证 |
| **HTTP 客户端** | 三方库 / resty | - | 优先官方 SDK，次选 resty |
| **测试** | testify | - | 断言和 Mock 工具 |

### 1.2 单 vs 多二进制

**推荐**：单个二进制包含 API + MCP Service

**启动参数**：
```bash
./ci-atlas-server --api-only          # 仅 API Service
./ci-atlas-server --mcp-only          # 仅 MCP Service
./ci-atlas-server                     # 同时运行两个服务
```

### 1.3 调度器部署策略

**API Service 内嵌 Scheduler**：
- Beat（定时任务调度）：单实例直接运行，无需分布式锁
- Worker（异步任务执行）：所有实例均可参与

```go
// internal/app/app.go

type App struct {
    db         *sql.DB
    router     http.Handler
    scheduler  *gocron.Scheduler
    logger     *zap.Logger
}

func (a *App) Start(ctx context.Context) error {
    // 启动 Beat（定时任务调度）
    go a.startBeat(ctx)
    
    // 启动 Worker（异步任务）
    go a.startWorker(ctx)
    
    // 启动 HTTP 服务
    addr := fmt.Sprintf(":%d", a.config.App.Port)
    a.logger.Info("HTTP server starting", zap.String("addr", addr))
    return a.router.Run(addr)
}
```

---

## 2. 项目结构详细说明

### 2.1 Entity 层（领域模型）

**位置**：`internal/entity/`

**特点**：
- 无任何外部依赖（不导入 gin、gorm、pg 等）
- 纯数据结构 + 业务规则方法
- 可单独用于客户端 SDK

```go
// internal/entity/user.go

type User struct {
    ID          uuid.UUID
    Username    string
    Email       string
    DisplayName string
    UserType    string  // internal/external
    AuthSource  string  // local/ldap
    PasswordHash string  // bcrypt 哈希
    GlobalStatus string  // active/inactive
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

// 业务方法（不依赖外部）
func (u *User) VerifyPassword(plainPassword string) bool {
    return bcrypt.CompareHashAndPassword(
        []byte(u.PasswordHash),
        []byte(plainPassword),
    ) == nil
}

// internal/entity/role.go
type Role struct {
    ID         uuid.UUID
    Code       string      // "admin", "developer" 等
    Name       string      // 显示名称
    IsSystem   bool        // 系统内置角色
    Status     string      // active/inactive
    CreatedAt  time.Time
}

// internal/entity/credential.go
type Credential struct {
    ID               uuid.UUID
    OwnerUserID      uuid.UUID
    Provider         string      // "jira", "jenkins" 等
    AuthType         string      // "basic", "token", "oauth2"
    Name             string      // 凭证名称
    EncryptedSecret  string      // AES-GCM 加密
    SecretVersion    int         // 版本管理
    ConfigJSON       string      // 额外配置 (JSONB)
    Status           string      // active/revoked/expired
    CreatedAt        time.Time
    UpdatedAt        time.Time
}

// Decrypt 方法（需传入加密工具）
func (c *Credential) Decrypt(decrypter CryptoPort) (string, error) {
    return decrypter.Decrypt(c.EncryptedSecret)
}
```

### 2.2 Service 层（业务逻辑）

**位置**：`internal/service/{auth,execution,scheduler,task}/`

**特点**：
- 定义 Port 接口（Dependency Inversion）
- 实现业务规则和编排逻辑
- 与框架无关，可用于 CLI、gRPC 等

#### 2.2.1 Auth Service

认证约束：
- 仅两类用户：`internal`、`external`
- `internal` 当前仅保留 `admin`
- `external` 通过 LDAP 登录
- 不提供注册接口，仅保留登录与令牌管理

```go
// internal/service/auth/port.go

// RepositoryPort 定义用户数据访问接口
type RepositoryPort interface {
    GetUserByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
    GetUserByUsername(ctx context.Context, username string) (*entity.User, error)
    UpdateUser(ctx context.Context, user *entity.User) error
    CreateAccessToken(ctx context.Context, token *entity.AccessToken) error
    GetAccessToken(ctx context.Context, token string) (*entity.AccessToken, error)
}

// LDAPPort 定义 LDAP 认证接口
type LDAPPort interface {
    Authenticate(ctx context.Context, username, password string) (*LDAPProfile, error)
}

// PermissionPort 定义权限查询接口
type PermissionPort interface {
    ListPermissions(ctx context.Context, userID uuid.UUID) ([]string, error)
    HasPermission(ctx context.Context, userID uuid.UUID, permCode string) (bool, error)
}

// TokenPort 定义 JWT 相关接口
type TokenPort interface {
    GenerateToken(sub string, expiresIn time.Duration, tokenType string) (string, error)
    VerifyToken(token string) (map[string]interface{}, error)
}

// internal/service/auth/service.go

type AuthService struct {
    repo   RepositoryPort
    perms  PermissionPort
    ldap   LDAPPort
    tokens TokenPort
    logger *zap.Logger
}

func NewAuthService(
    repo RepositoryPort,
    perms PermissionPort,
    ldap LDAPPort,
    tokens TokenPort,
    logger *zap.Logger,
) *AuthService {
    return &AuthService{repo, perms, ldap, tokens, logger}
}

// Login 用户登入
func (s *AuthService) Login(
    ctx context.Context,
    username, password string,
) (user *entity.User, accessToken string, err error) {
    // 1. 查询用户
    user, err = s.repo.GetUserByUsername(ctx, username)
    if err != nil {
        if err == ErrNotFound {
            return nil, "", ErrInvalidCredentials
        }
        return nil, "", err
    }
    
    // 2. 按用户类型认证
    // internal: 仅 admin 本地密码; external: LDAP 认证
    switch user.UserType {
    case "internal":
        if user.Username != "admin" || !user.VerifyPassword(password) {
            return nil, "", ErrInvalidCredentials
        }
    case "external":
        if _, err := s.ldap.Authenticate(ctx, username, password); err != nil {
            return nil, "", ErrInvalidCredentials
        }
    default:
        return nil, "", ErrInvalidCredentials
    }
    
    // 3. 生成前端会话 JWT（短时）
    accessToken, err = s.tokens.GenerateToken(
        user.ID.String(),
        15*time.Minute,
        "access",
    )
    if err != nil {
        return nil, "", err
    }
    
    s.logger.Info("User login", zap.String("username", username))
    return user, accessToken, nil
}

// CreateAccessToken 创建给 curl/脚本使用的长期 Access Token
func (s *AuthService) CreateAccessToken(ctx context.Context, userID uuid.UUID, name string, expiresAt *time.Time) (string, error) {
    raw := GenerateSecureToken(48)
    hash := SHA256Hex(raw)

    token := &entity.AccessToken{
        ID:        uuid.New(),
        UserID:    userID,
        Name:      name,
        TokenHash: hash,
        ExpiresAt: expiresAt,
        CreatedAt: time.Now(),
    }

    if err := s.repo.CreateAccessToken(ctx, token); err != nil {
        return "", err
    }
    return raw, nil
}

// VerifyToken 验证并解析 Token
func (s *AuthService) VerifyToken(ctx context.Context, token string) (*entity.User, error) {
    claims, err := s.tokens.VerifyToken(token)
    if err != nil {
        return nil, ErrInvalidToken
    }
    
    userIDStr, ok := claims["sub"].(string)
    if !ok {
        return nil, ErrInvalidToken
    }
    
    userID, err := uuid.Parse(userIDStr)
    if err != nil {
        return nil, ErrInvalidToken
    }
    
    user, err := s.repo.GetUserByID(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    return user, nil
}

// GetPermissions 获取用户权限列表
func (s *AuthService) GetPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
    return s.perms.ListPermissions(ctx, userID)
}
```

#### 2.2.2 Execution Service

```go
// internal/service/execution/port.go

type ProviderPort interface {
    Call(
        ctx context.Context,
        toolName string,
        params map[string]interface{},
        credentials *entity.Credential,
    ) (interface{}, error)
}

type CredentialPort interface {
    GetCredential(
        ctx context.Context,
        userID uuid.UUID,
        provider string,
    ) (*entity.Credential, error)
}

type AuditLogPort interface {
    Create(ctx context.Context, log *AuditLogEntry) error
    Update(ctx context.Context, logID uuid.UUID, updates *AuditLogUpdate) error
}

// internal/service/execution/service.go

type ExecutionService struct {
    provider  ProviderPort
    cred      CredentialPort
    audit     AuditLogPort
    logger    *zap.Logger
}

func (s *ExecutionService) Execute(
    ctx context.Context,
    toolName string,
    params map[string]interface{},
    userID uuid.UUID,
) (result interface{}, err error) {
    startTime := time.Now()
    logEntry := &AuditLogEntry{
        ID:         uuid.New(),
        ActorID:    userID,
        ToolName:   toolName,
        StartedAt:  startTime,
        Status:     "running",
    }
    
    // 创建审计日志
    if err := s.audit.Create(ctx, logEntry); err != nil {
        s.logger.Error("Failed to create audit log", zap.Error(err))
        // 继续执行，不中断
    }
    
    defer func() {
        // 更新审计日志
        latency := time.Since(startTime)
        status := "succeeded"
        errMsg := ""
        if err != nil {
            status = "failed"
            errMsg = err.Error()
        }
        
        s.audit.Update(ctx, logEntry.ID, &AuditLogUpdate{
            Status:    status,
            Error:     errMsg,
            LatencyMs: latency.Milliseconds(),
        })
    }()
    
    // 查询凭证
    provider := extractProvider(toolName) // e.g., "jira" from "jira.create_issue"
    cred, err := s.cred.GetCredential(ctx, userID, provider)
    if err != nil {
        return nil, fmt.Errorf("credential not found: %w", err)
    }
    
    // 调用 Provider
    result, err = s.provider.Call(ctx, toolName, params, cred)
    return result, err
}
```

#### 2.2.3 Scheduler Service

```go
// internal/service/scheduler/port.go

type TaskRepositoryPort interface {
    ListEnabledTasks(ctx context.Context) ([]*entity.TaskScheduler, error)
    UpdateTaskStatus(ctx context.Context, id uuid.UUID, status, error string) error
}

type JobExecutorPort interface {
    Execute(ctx context.Context, taskName string, payload string) (interface{}, error)
}

// internal/service/scheduler/service.go

type SchedulerService struct {
    repo   TaskRepositoryPort
    exec   JobExecutorPort
    logger *zap.Logger
}

func (s *SchedulerService) LoadAndScheduleJobs(ctx context.Context, scheduler *gocron.Scheduler) error {
    tasks, err := s.repo.ListEnabledTasks(ctx)
    if err != nil {
        return err
    }
    
    for _, task := range tasks {
        // 为每个任务注册到调度器
        taskCopy := task  // 避免闭包捕获问题
        _, err := scheduler.Cron(taskCopy.CronExpr).Do(
            s.executeTask,
            taskCopy,
        )
        if err != nil {
            s.logger.Error("Failed to schedule task",
                zap.String("task_id", taskCopy.ID.String()),
                zap.Error(err),
            )
        }
    }
    
    return nil
}

func (s *SchedulerService) executeTask(task *entity.TaskScheduler) {
    ctx := context.Background()
    
    s.logger.Info("Executing scheduled task",
        zap.String("task_id", task.ID.String()),
        zap.String("task_name", task.TaskName),
    )
    
    start := time.Now()
    defer func() {
        if err := recover(); err != nil {
            s.logger.Error("Task panic",
                zap.String("task_id", task.ID.String()),
                zap.Any("panic", err),
            )
        }
    }()
    
    // 解析 payload
    var payload map[string]interface{}
    if err := json.Unmarshal([]byte(task.PayloadJSON), &payload); err != nil {
        s.logger.Error("Failed to parse payload",
            zap.Error(err),
        )
        return
    }
    
    // 执行任务
    result, err := s.exec.Execute(ctx, task.TaskName, task.PayloadJSON)
    
    // 更新任务状态
    status := "succeeded"
    errMsg := ""
    if err != nil {
        status = "failed"
        errMsg = err.Error()
    }
    
    if err := s.repo.UpdateTaskStatus(ctx, task.ID, status, errMsg); err != nil {
        s.logger.Error("Failed to update task status", zap.Error(err))
    }
    
    s.logger.Info("Task executed",
        zap.String("task_id", task.ID.String()),
        zap.String("status", status),
        zap.Duration("latency", time.Since(start)),
    )
}
```

### 2.3 Adapter 层（适配器实现）

**位置**：`internal/adapter/{http,repository,gateway,scheduler}/`

#### 2.3.1 HTTP Handler

```go
// internal/adapter/http/handler/auth.go

type AuthHandler struct {
    authService  *service.AuthService
    logger       *zap.Logger
}

func NewAuthHandler(authService *service.AuthService, logger *zap.Logger) *AuthHandler {
    return &AuthHandler{authService, logger}
}

type LoginRequest struct {
    Username string `json:"username" binding:"required,min=3"`
    Password string `json:"password" binding:"required,min=6"`
}

type LoginResponse struct {
    AccessToken string   `json:"access_token"`
    TokenType   string   `json:"token_type"`
    AuthSource  string   `json:"auth_source"`
    User        UserInfo `json:"user"`
}

// Login Handler
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    user, accessToken, err := h.authService.Login(
        c.Request.Context(),
        req.Username,
        req.Password,
    )
    if err != nil {
        h.logger.Warn("Login failed", zap.String("username", req.Username))
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
        return
    }
    
    resp := LoginResponse{
        AccessToken: accessToken,
        TokenType:   "bearer",
        AuthSource:  user.AuthSource,
        User: UserInfo{
            ID:       user.ID.String(),
            Username: user.Username,
            Email:    user.Email,
        },
    }
    
    c.JSON(http.StatusOK, resp)
}
```

#### 2.3.2 HTTP Middleware

```go
// internal/adapter/http/middleware/auth.go

// AuthMiddleware 支持 Bearer JWT（前端）和 X-Access-Token（curl/脚本）
func AuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        accessToken := c.GetHeader("X-Access-Token")

        var user *entity.User
        var err error
        if accessToken != "" {
            user, err = authService.VerifyAccessToken(c.Request.Context(), accessToken)
        } else {
            if authHeader == "" {
                c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
                c.Abort()
                return
            }

            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
                c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token format"})
                c.Abort()
                return
            }
            user, err = authService.VerifyToken(c.Request.Context(), parts[1])
        }

        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        // 将用户信息存入 context
        c.Set("user_id", user.ID.String())
        c.Set("user", user)
        c.Next()
    }
}

// RequestContextMiddleware 注入 request_id 和 trace_id
func RequestContextMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        traceID := c.GetHeader("X-Trace-ID")
        if traceID == "" {
            traceID = uuid.New().String()
        }
        
        c.Set("request_id", requestID)
        c.Set("trace_id", traceID)
        
        // 响应头中返回 request_id
        c.Header("X-Request-ID", requestID)
        c.Next()
    }
}
```

#### 2.3.3 Repository 实现

```go
// internal/adapter/repository/user_repository.go

type PostgresUserRepository struct {
    db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db}
}

func (r *PostgresUserRepository) GetUserByID(
    ctx context.Context,
    id uuid.UUID,
) (*entity.User, error) {
    var user entity.User
    err := r.db.QueryRowContext(
        ctx,
        `SELECT id, username, email, display_name, password_hash, global_status, created_at, updated_at
         FROM users WHERE id = $1`,
        id,
    ).Scan(
        &user.ID, &user.Username, &user.Email, &user.DisplayName,
        &user.PasswordHash, &user.GlobalStatus, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, ErrNotFound
        }
        return nil, err
    }
    return &user, nil
}

func (r *PostgresUserRepository) CreateUser(
    ctx context.Context,
    user *entity.User,
) error {
    _, err := r.db.ExecContext(
        ctx,
        `INSERT INTO users
         (id, username, email, display_name, password_hash, global_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        user.ID, user.Username, user.Email, user.DisplayName,
        user.PasswordHash, user.GlobalStatus, user.CreatedAt, user.UpdatedAt,
    )
    return err
}
```

#### 2.3.4 External Gateway

```go
// internal/adapter/gateway/jira.go

type JiraGateway struct {
    client *resty.Client
    logger *zap.Logger
}

func NewJiraGateway(logger *zap.Logger) *JiraGateway {
    client := resty.New()
    return &JiraGateway{client, logger}
}

func (g *JiraGateway) CreateIssue(
    ctx context.Context,
    cred *entity.Credential,
    params map[string]interface{},
) (interface{}, error) {
    // 解析凭证
    var jiraCred struct {
        URL      string `json:"url"`
        Username string `json:"username"`
        Token    string `json:"token"`
    }
    if err := json.Unmarshal([]byte(cred.EncryptedSecret), &jiraCred); err != nil {
        return nil, err
    }
    
    // 发送请求
    resp, err := g.client.R().
        SetBasicAuth(jiraCred.Username, jiraCred.Token).
        SetHeader("Content-Type", "application/json").
        SetBody(params).
        SetContext(ctx).
        Post(fmt.Sprintf("%s/rest/api/3/issues", jiraCred.URL))
    
    if err != nil {
        g.logger.Error("Jira API error", zap.Error(err))
        return nil, err
    }
    
    if resp.StatusCode() >= 400 {
        return nil, fmt.Errorf("Jira error: %s", resp.String())
    }
    
    var result map[string]interface{}
    if err := json.Unmarshal(resp.Body(), &result); err != nil {
        return nil, err
    }
    
    return result, nil
}
```

### 2.4 Infra 层（基础设施）

```go
// internal/infra/config/config.go

package config

import (
    "github.com/caarlos0/env/v11"
)

type Config struct {
    App struct {
        Name string `env:"APP_NAME" envDefault:"CI-Atlas"`
        Port int    `env:"APP_PORT" envDefault:"8000"`
    }
    Database struct {
        URL         string `env:"DATABASE_URL" envDefault:"postgresql://postgres:postgres@localhost:5432/ci_atlas"`
        MaxOpenConn int    `env:"DB_MAX_OPEN_CONN" envDefault:"25"`
        MaxIdleConn int    `env:"DB_MAX_IDLE_CONN" envDefault:"5"`
    }
    JWT struct {
        SecretKey string `env:"JWT_SECRET_KEY" envDefault:"change-me-in-prod"`
        Algorithm string `env:"JWT_ALGORITHM" envDefault:"HS256"`
    }
    Encryption struct {
        KeyBase64 string `env:"ENCRYPTION_KEY_BASE64" envDefault:"MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="`
    }
    Log struct {
        Level string `env:"LOG_LEVEL" envDefault:"info"`
    }
}

func LoadConfig() (*Config, error) {
    cfg := &Config{}
    
    // 从环境变量解析配置
    if err := env.Parse(cfg); err != nil {
        return nil, err
    }
    
    return cfg, nil
}

// internal/infra/db/database.go

func NewDatabase(cfg *Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.Database.URL)
    if err != nil {
        return nil, err
    }
    
    db.SetMaxOpenConns(cfg.Database.MaxOpenConn)
    db.SetMaxIdleConns(cfg.Database.MaxIdleConn)
    
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    return db, nil
}

// internal/infra/security/jwt.go

type JWTManager struct {
    secretKey string
    algorithm string
}

func (m *JWTManager) GenerateToken(
    sub string,
    expiresIn time.Duration,
    tokenType string,
) (string, error) {
    claims := jwt.MapClaims{
        "sub": sub,
        "typ": tokenType,
        "iat": time.Now().Unix(),
        "exp": time.Now().Add(expiresIn).Unix(),
        "jti": uuid.New().String(),
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(m.secretKey))
}

func (m *JWTManager) VerifyToken(tokenString string) (map[string]interface{}, error) {
    token, err := jwt.ParseWithClaims(
        tokenString,
        jwt.MapClaims{},
        func(token *jwt.Token) (interface{}, error) {
            return []byte(m.secretKey), nil
        },
    )
    if err != nil {
        return nil, err
    }
    
    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok || !token.Valid {
        return nil, errors.New("invalid token")
    }
    
    return claims, nil
}
```

### 2.5 App 层（依赖注入）

```go
// internal/app/app.go

type App struct {
    db               *sql.DB
    config           *infra.Config
    logger           *zap.Logger
    router           *gin.Engine
    authService      *service.AuthService
    executionService *service.ExecutionService
    scheduler        *gocron.Scheduler
}

func NewApp(db *sql.DB, cfg *infra.Config, logger *zap.Logger) (*App, error) {
    // 初始化基础设施
    jwtMgr := infra.NewJWTManager(cfg.JWT.SecretKey, cfg.JWT.Algorithm)
    
    // 初始化 Repository（实现 Port）
    userRepo := repository.NewPostgresUserRepository(db)
    
    // 初始化 Service
    authService := service.NewAuthService(userRepo, nil, jwtMgr, logger)
    executionService := service.NewExecutionService(nil, nil, nil, logger)
    
    // 初始化 HTTP 路由
    router := gin.Default()
    router.Use(middleware.RequestContextMiddleware())
    router.Use(middleware.LoggingMiddleware(logger))
    
    authHandler := handler.NewAuthHandler(authService, logger)
    router.POST("/api/v1/auth/login", authHandler.Login)
    
    // 初始化调度器
    scheduler, _ := gocron.NewScheduler()
    
    return &App{
        db:               db,
        config:           cfg,
        logger:           logger,
        router:           router,
        authService:      authService,
        executionService: executionService,
        scheduler:        scheduler,
    }, nil
}

func (a *App) Start(ctx context.Context) error {
    // 启动 Beat（定时任务调度）
    go a.startBeat(ctx)
    
    // 启动 Worker（异步任务）
    go a.startWorker(ctx)
    
    // 启动 HTTP 服务
    addr := fmt.Sprintf(":%d", a.config.App.Port)
    a.logger.Info("HTTP server starting", zap.String("addr", addr))
    return a.router.Run(addr)
}

func (a *App) startBeat(ctx context.Context) error {
    // PostgreSQL advisory lock 用于 leader 选举
    const lockKey = 424242
    
    // 尝试获取锁
    var locked bool
    err := a.db.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", lockKey).Scan(&locked)
    if err != nil || !locked {
        a.logger.Info("Beat lock not acquired, running as follower")
        return nil
    }
    
    a.logger.Info("Beat lock acquired, starting scheduler")
    return a.scheduler.StartAsync()
}

func (a *App) startWorker(ctx context.Context) {
    // Worker 并发执行任务
    a.logger.Info("Worker started")
}
```

---

## 3. 数据库设计

### 3.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('internal', 'external')),
    auth_source VARCHAR(50) NOT NULL CHECK (auth_source IN ('local', 'ldap')),
    password_hash VARCHAR(255),
    global_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Access Token 表（用于 curl/脚本调用）
CREATE TABLE user_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 角色表
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 权限表
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    resource_type VARCHAR(50),
    resource_key VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 用户-角色关联表
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 角色-权限关联表
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 凭证表
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    auth_type VARCHAR(50),
    name VARCHAR(255),
    encrypted_secret TEXT NOT NULL,
    secret_version INT DEFAULT 1,
    config_json JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 定时任务表
CREATE TABLE task_schedulers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    cron_expr VARCHAR(100),
    enabled BOOLEAN DEFAULT TRUE,
    payload_json JSONB,
    last_status VARCHAR(50),
    last_error TEXT,
    run_count INT DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    event_type VARCHAR(50),
    source VARCHAR(50),
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    tool_name VARCHAR(255),
    status VARCHAR(50),
    request_id VARCHAR(255),
    trace_id VARCHAR(255),
    request_json JSONB,
    response_json JSONB,
    error_message TEXT,
    latency_ms BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_credentials_owner ON credentials(owner_user_id);
CREATE INDEX idx_access_tokens_user ON user_access_tokens(user_id);
CREATE INDEX idx_access_tokens_token_hash ON user_access_tokens(token_hash);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## 4. 构建与部署

### 4.1 Makefile

```makefile
.PHONY: help build run test docker-build clean

help:
	@echo "Available targets:"
	@echo "  make build       - Build Go binary"
	@echo "  make run         - Run locally"
	@echo "  make test        - Run tests"
	@echo "  make docker-build- Build Docker image"
	@echo "  make clean       - Clean build artifacts"

build:
	CGO_ENABLED=1 go build -o ci-atlas-server cmd/api/main.go

run: build
	./ci-atlas-server

test:
	go test -v ./...

docker-build:
	docker build -f docker/Dockerfile.api -t ci-atlas:latest .

clean:
	rm -f ci-atlas-server
	go clean
```

### 4.2 Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o ci-atlas-server cmd/api/main.go

# Runtime stage
FROM alpine:3.18
RUN apk add --no-cache ca-certificates postgresql-client
WORKDIR /app
COPY --from=builder /app/ci-atlas-server .
EXPOSE 8000
CMD ["./ci-atlas-server"]
```

### 4.3 go.mod 示例

```
module github.com/your-org/ci-atlas-go

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.0.0
    github.com/google/uuid v1.3.0
    github.com/lib/pq v1.10.9
    github.com/robfig/cron/v3 v3.0.1
    github.com/spf13/viper v1.16.0
    go.uber.org/zap v1.26.0
    golang.org/x/crypto v0.14.0
)
```

---

## 5. 核心开发指南

### 5.1 添加新的 Service

1. 定义 Port 接口（`internal/service/xxx/port.go`）
2. 实现 Service 业务逻辑（`internal/service/xxx/service.go`）
3. 在 App 层创建 Service 实例（`internal/app/app.go`）
4. 添加 Handler 和路由（`internal/adapter/http/handler/`）

### 5.2 添加新的 Handler

1. 定义请求/响应结构体
2. 实现 Handler 方法
3. 在 `router.go` 中注册路由

### 5.3 添加新的 Repository

1. 定义 Repository 接口（通常在 Service 的 Port 中）
2. 实现 PostgreSQL Repository
3. 在 App 层注入

### 5.4 错误处理

统一使用自定义错误类型：

```go
type APIError struct {
    Code       string                 `json:"code"`
    StatusCode int                    `json:"-"`
    Message    string                 `json:"message"`
    Details    map[string]interface{} `json:"details,omitempty"`
}

// Middleware 中统一处理
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

---

## 6. 与 Python 版本对比

| 特性 | Python (FastAPI) | Go (Gin) |
|-----|-----------------|---------|
| **启动时间** | ~2-3s | ~100ms |
| **内存占用** | ~80MB | ~20MB |
| **并发性能** | asyncio（逻辑并发） | goroutine（真并发） |
| **部署** | 需要 Python Runtime | 单个二进制 |
| **热更新** | 需要重启 | 需要重启 |
| **开发速度** | 快（动态语言） | 中等（编译型语言） |
| **类型安全** | 运行时检查 | 编译时检查 |
| **生态** | AI/ML 友好 | 分布式系统友好 |

---

## 7. 迁移指南（从 Python 到 Go）

### 逐步迁移策略

1. **第一阶段**：Go 实现 API Service（HTTP handlers、auth、basic CRUD）
2. **第二阶段**：Go 实现 Execution Service（工具调用、审计）
3. **第三阶段**：Go 实现 Scheduler Service（定时任务、APScheduler 替代品）
4. **第四阶段**：Go 实现 MCP Service（协议层）

### 兼容性

- 数据库模式一致（PostgreSQL）
- JWT 格式统一
- API 接口 1:1 迁移
- 审计日志格式不变

