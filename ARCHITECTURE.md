# CI-Atlas 系统架构设计

## 1. 目标与核心价值

本系统是一个**面向 MCP 的企业工具平台**，而非单纯的 API 网关。核心目标：

- **多源入口**：同时提供 REST API 和独立 MCP 服务，支持不同客户端接入
- **凭证托管**：集中管理外部系统凭证，在调用时安全注入，避免明文传播
- **权限体系**：企业级五表 RBAC，细粒度的菜单、API、资源权限控制
- **异步处理**：统一的任务调度和执行框架，支持按需任务和定时任务
- **审计追踪**：全链路操作审计和工具执行日志，满足合规需求
- **生态就位**：Python 生态对 MCP、AI、provider 集成友好，便于长期演进

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
    │   认证 & 权限层     │          │   MCP 协议适配层       │
    │  (Auth, RBAC)       │          │  (Protocol Handler)    │
    └─────────┬───────────┘          └──────────┬─────────────┘
              │                                 │
        ┌─────┴─────────────────────────────────┴─────┐
        │                                             │
        ▼                                             ▼
    ┌──────────────────────────────────────────────────────┐
    │         执行服务层 (Execution Service)              │
    │  - 参数校验、凭证注入、鉴权、审计                    │
    └──────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┴────────────┬────────────────┐
        │                       │                │
        ▼                       ▼                ▼
    ┌─────────────┐   ┌──────────────────┐  ┌──────────────────┐
    │ 同步执行     │   │  按需异步任务     │  │  定时任务        │
    │ (Provider)  │   │ (APScheduler)    │  │ (APScheduler)    │
    │             │   │                  │  │                  │
    │ - Jira      │   │ 可回溯任务状态    │  │ 从task_schedulers│
    │ - K8s       │   │ 结果回写业务表    │  │ 表加载调度计划   │
    │ - Jenkins   │   └──────────────────┘  └──────────────────┘
    │ - Prometheus│
    └─────────────┘
        │
        ▼
    ┌──────────────────────────────┐
    │   外部系统能力集               │
    │  (External Systems / APIs)   │
    └──────────────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                      共享支撑层                                  │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ PostgreSQL   │  │ APScheduler  │  │ Audit & Observability│ │
│  │ (主数据库)   │  │ (调度执行)   │  │ (Logging, OTel)     │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块说明

| 模块 | 职责 | 特点 |
|-----|------|------|
| **Auth** | 用户认证、JWT 签发、权限查询 | 集中式权限决策，五表 RBAC |
| **Execution Service** | 参数校验、凭证注入、鉴权、审计 | 统一的前置和后置逻辑 |
| **Provider** | 外部系统能力实现 | 支持多步编排、官方 SDK 优先 |
| **APScheduler** | 异步任务和定时任务调度 | 统一的任务管理，支持持久化 |
| **API Service** | HTTP 入口、路由、请求格式 | REST JSON，统一错误处理 |
| **MCP Service** | MCP 协议入口、能力暴露 | 独立端口，独立认证 |

---

## 3. 核心数据流与交互

### 3.1 同步执行流（API 调用场景）

```
用户/客户端
    │
    ├─ POST /api/v1/credentials/{id}/test
    │
    ▼
┌─────────────────────────────────────┐
│ API Service (FastAPI)               │
│ - 解析请求                           │
│ - request_id / trace_id 注入         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Auth Module                         │
│ - JWT 校验                          │
│ - 从 JWT 提取用户信息               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Authorization (RBAC)                │
│ - 查询五表：user_roles → roles      │
│ - 查询 role_permissions → permissions
│ - 判定 api:/api/v1/credentials:write
└─────────────┬───────────────────────┘
              │ (权限通过)
              ▼
┌─────────────────────────────────────┐
│ Execution Service                   │
│ - 参数校验（Pydantic）              │
│ - 从 credentials 表查凭证            │
│ - AES-GCM 解密凭证                   │
│ - 记录审计日志 (audit_logs)         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Provider (e.g., Jenkins)            │
│ - 创建 SDK 客户端（注入解密凭证）   │
│ - 执行业务逻辑（可能多步编排）      │
│ - 返回结果                          │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 更新审计日志                         │
│ - status: succeeded/failed          │
│ - latency_ms: 实际耗时              │
│ - response_json: 摘要               │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 返回 HTTP 200 / 4xx / 5xx           │
│ response_json + request_id          │
└─────────────────────────────────────┘
```

**时间**：通常 < 5 秒，同步返回。

---

### 3.2 按需异步执行流（后处理场景）

```
用户/系统
    │
    ├─ POST /api/v1/alerts (上报告警)
    │
    ▼
┌─────────────────────────────────────┐
│ API Service                         │
│ - 认证、RBAC、参数校验              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 业务逻辑                            │
│ - INSERT INTO alerts (status=pending)
│ - 返回 alert_id、初始状态           │
└─────────────┬───────────────────────┘
              │
              ▼ (立即返回给客户端)
           200 OK
      {
        "alert_id": "a_123",
        "status": "pending",
        "message": "Task submitted"
      }


┌─ 并行处理 ─────────────────────────────┐
│                                        │
├─ 业务模块将处理任务投递到 APScheduler  │
│  scheduler.add_job(                    │
│    process_alert,                      │
│    args=(alert_id,),                   │
│    id=f"process_alert_{alert_id}",     │
│    replace_existing=True               │
│  )                                     │
│                                        │
├─ APScheduler Worker 开始执行           │
│  1. 从 alerts 表查询 alert_id          │
│  2. 执行业务逻辑（诊断、补偿、通知）  │
│  3. 记录关键操作到 audit_logs          │
│                                        │
├─ 处理完毕，回写 alerts 表              │
│  UPDATE alerts SET                     │
│    status = 'succeeded',               │
│    result = '{"..."}',                 │
│    completed_at = now()                │
│  WHERE id = alert_id                   │
│                                        │
└────────────────────────────────────────┘
```

**时间**：提交立即返回，后台处理可能需要数秒到数分钟。
**优点**：不阻塞用户请求，任务状态可回溯。

---

### 3.3 定时任务执行流

```
┌─ API 端点：创建定时任务 ──┐
│ POST /api/v1/task-schedulers
│ {
│   "name": "k8s_sync_hourly",
│   "task_name": "tasks.kubernetes.sync_pods",
│   "cron_expr": "0 * * * *",    # 每小时 0 分
│   "enabled": true,
│   "payload_json": {"cluster": "prod"}
│ }
│
├─ INSERT INTO task_schedulers
│
├─ 记录 audit_logs (event_type=task_created)
│
└─ 返回 200


┌─ 后台：APScheduler 加载调度计划 ──┐
│                                   │
├─ 应用启动时扫描 task_schedulers   │
│   SELECT * FROM task_schedulers   │
│   WHERE enabled = true            │
│                                   │
├─ 为每个任务注册到 APScheduler      │
│   scheduler.add_job(              │
│     execute_scheduled_task,       │
│     trigger='cron',               │
│     hour=0,  # 从 cron_expr 解析  │
│     id=task_scheduler_id,         │
│     args=(task_scheduler_id,)     │
│   )                               │
│                                   │
└─ APScheduler 守护进程持续运行      │


┌─ 执行时刻：每小时 0 分 ──┐
│                         │
├─ APScheduler 触发任务    │
│  execute_scheduled_task( │
│    task_scheduler_id     │
│  )                       │
│                          │
├─ 1. 从 task_schedulers   │
│      查询任务定义        │
│                          │
├─ 2. 从 payload_json      │
│      提取参数            │
│                          │
├─ 3. 调用实际任务函数     │
│      tasks.kubernetes    │
│      .sync_pods(...)     │
│                          │
├─ 4. 捕获返回值/异常      │
│                          │
├─ 5. 更新 task_schedulers │
│      UPDATE last_run_at, │
│      next_run_at,        │
│      last_status,        │
│      last_error          │
│                          │
├─ 6. 关键操作写入         │
│      audit_logs          │
│                          │
└─ 完成                    │
```

**周期**：按 cron_expr 精确调度。
**持久化**：任务定义和执行记录全部落库。

---

### 3.4 MCP 协议流

```
MCP Client (e.g., Claude)
    │
    ├─ MCP 协议请求 (SSE / stdio / HTTP)
    │  {
    │    "method": "tools/list",
    │    "jsonrpc": "2.0"
    │  }
    │
    ▼
┌─────────────────────────────────────┐
│ MCP Service (独立进程，端口 9000)   │
│ - 接收 MCP 请求                     │
│ - MCP 协议解析                      │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 身份验证                            │
│ - 客户端证书 / Token 校验           │
│ - 从证书提取 client_id              │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 判定请求类型                        │
│ - tools/list → 返回能力清单         │
│ - tools/call → 执行指定工具         │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼ (tools/list)      ▼ (tools/call)
    │                   │
    ├─ 扫描 providers   ├─ 检查权限
    │                   │  (基于 client_id)
    ├─ 整理 tool 清单   │
    │                   ├─ 参数校验
    ├─ 格式化为 MCP     │
    │  ToolDescription  ├─ 凭证注入
    │                   │
    └─ 返回             ├─ 调用 provider
                        │
                        ├─ 记录审计
                        │  (source=mcp)
                        │
                        └─ 返回结果

┌─────────────────────────────────────┐
│ MCP 协议响应                        │
│ {                                   │
│   "result": {                       │
│     "tools": [...]                  │
│   },                                │
│   "jsonrpc": "2.0"                  │
│ }                                   │
└─────────────────────────────────────┘
```

**特点**：
- 独立端口 (9000)
- 独立认证方式（证书或 Token，不使用 JWT）
- 不依赖 HTTP API Service

---

## 4. 部署架构

### 4.1 进程拓扑

**架构原则**：
- **API Service**：内嵌 APScheduler（Worker + Beat），可多副本
- **MCP Service**：独立服务，不含 APScheduler
- **Beat 唯一性**：生产环境多副本时，通过分布式锁确保只有一个 Beat 活跃

#### 开发环境（单机模式）

```
┌─────────────────────────────────────────────────────────────┐
│                      单机开发环境                            │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐             │
│  │  API Service     │    │  MCP Service     │             │
│  │  (Port 8000)     │    │  (Port 9000)     │             │
│  │                  │    │                  │             │
│  │ 包含：           │    │ 无 APScheduler   │             │
│  │ - FastAPI        │    │ - MCP 协议       │             │
│  │ - APScheduler    │    │                  │             │
│  │   (Beat+Worker)  │    │                  │             │
│  └────────┬─────────┘    └────────┬─────────┘             │
│           │                       │                        │
│           └───────────────────────┤                        │
│                                   │                        │
│                                   ▼                        │
│                    ┌──────────────────────────┐           │
│                    │  PostgreSQL (容器化)     │           │
│                    │  - apscheduler_jobs     │           │
│                    │  - task_schedulers      │           │
│                    │  - audit_logs           │           │
│                    └──────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**开发环境说明**：
- 单命令启动：`python app/main.py`
- 自动初始化 APScheduler Beat + Worker
- 便于调试和快速迭代

#### 生产环境（K8s 部署）

```
┌─────────────────────────────────────────────────────────────┐
│                      生产环境 (K8s)                          │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  API Service Pod × N (可自动扩容)               │      │
│  │  - Port 8000                                     │      │
│  │  - Replicas: 2-10 (支持 HPA)                    │      │
│  │  - 内嵌 APScheduler                              │      │
│  │  - Beat 直接调度定时任务（单实例）              │      │
│  │  - Worker 处理异步任务                          │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  MCP Service Pod × M (可选)                     │      │
│  │  - Port 9000                                     │      │
│  │  - Replicas: 1-3                                │      │
│  │  - 纯 MCP 协议服务，无 APScheduler               │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  PostgreSQL (管理数据库)                         │      │
│  │  - 云厂商托管或自建 HA 主从                     │      │
│  │  - 存储：apscheduler_jobs、task_schedulers       │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  PostgreSQL Advisory Lock                        │      │
│  │  - 保证 Beat 在多副本时唯一活跃                 │      │
│  │  - 无需额外引入 Redis                            │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**生产环境说明**：
- ✅ **API Service 可多副本**：通过分布式锁避免 Beat 重复触发
  - 原理：多个 API Pod 中的 Beat 竞争锁，只有一个持有者会实际触发定时任务
  - 不持有锁的 Beat 处于待命状态，降级为只执行 Worker 任务
- ✅ **APScheduler Worker 天然支持多副本**
  - 每个 API Pod 都有 Worker，通过 PostgreSQL job store 确保任务不重复
- ✅ **MCP Service 独立运行**，无需 APScheduler

### 4.2 关键配置项

- **API Service 连接池**：SQLAlchemy pool_size ≈ CPU * 2
- **MCP Service 认证**：支持 mTLS 或 API Token
- **APScheduler 存储**：使用 PostgreSQL 作为 job store，确保任务不丢失
- **审计日志**：每个关键操作写入 audit_logs，支持异步刷盘

---

## 5. 关键设计决策

### 5.1 为什么选择 APScheduler 而非其他方案

| 方案 | 优点 | 缺点 | 适用场景 |
|-----|------|------|--------|
| **Celery** | 功能完整、社区大 | 引入 Broker（RabbitMQ/Redis）、学习成本高 | 高并发、分布式任务队列 |
| **APScheduler** | 轻量、可嵌入、开箱即用 | 功能不如 Celery 丰富 | **本项目选择**：定时任务 + 按需异步 |
| **Huey** | 简洁易用 | 社区较小 | 轻量任务队列 |
| **RQ** | 基于 Redis | 需要额外依赖 | Redis 为中心的任务 |

**本项目的选择**：
- APScheduler 既支持定时任务（trigger='cron'），又支持按需一次性任务（trigger=None）
- 不需要额外的消息 Broker，PostgreSQL 作为存储
- Beat 选举使用 PostgreSQL advisory lock，无需 Redis
- 轻量级，适合中等规模企业用途

### 5.2 同步 vs 异步决策

| 场景 | 执行方式 | 原因 |
|-----|--------|------|
| 凭证验证、API 查询 | 同步 | 秒级完成，用户等待可接受 |
| 工具执行结果不会立即影响用户 UI | 异步 | 允许数分钟延迟，提升响应性 |
| 定时巡检、周期同步 | 异步定时 | 后台运行，无需用户触发 |
| 管理操作（创建角色、凭证） | 同步 | 需要立即反馈 |

### 5.3 凭证安全策略

1. **存储**：encrypted_secret 使用 AES-GCM，主密钥来自环境变量
2. **访问**：执行前在内存中解密，避免明文日志
3. **轮换**：支持凭证版本控制，允许旧密钥并存
4. **审计**：每次凭证使用都记录到 audit_logs，但不记录明文

### 5.4 五表 RBAC vs 其他授权模型

| 模型 | 复杂度 | 灵活性 | 可维护性 |
|-----|--------|--------|--------|
| 传统 RBAC（五表） | 中等 | 中等 | **高** |
| Casbin 策略引擎 | 高 | 很高 | 低（DSL 学习成本） |
| 属性型 ABAC | 高 | 很高 | 低（规则爆炸） |

**本项目选择**：五表 RBAC，理由是：
- 模型清晰，易于 UI 展示和管理
- SQL 直接查询，性能可控
- 企业内部组织通常不需要过于复杂的授权规则

### 5.5 API Service vs MCP Service 为何独立

| 维度 | API Service | MCP Service |
|-----|-----------|-----------|
| 协议 | HTTP REST JSON | MCP (SSE/stdio/WebSocket) |
| 认证 | JWT + Cookie | 客户端证书 + Token |
| 权限 | 五表 RBAC (针对用户) | 按 MCP Client 配置 |
| 部署 | 可多副本水平扩展 | 通常单副本或小规模 |
| 调试 | 易于 curl/Postman | 需要 MCP 客户端 |

独立设计的好处：
- 清晰的职责边界
- MCP 未来可独立演进（支持 tools、resources、sampling 等特性）
- 可分别部署和扩容

---

## 6. 五表 RBAC 授权模型

### 6.1 表间关系

```
┌──────────┐
│  users   │
└────┬─────┘
     │ 1:N
     │
     ▼
┌────────────┐      N:M        ┌────────────┐
│ user_roles ├───────────────┤│   roles    │
└────────────┘                └──────┬─────┘
                                     │ 1:N
                                     │
                                     ▼
                              ┌─────────────────┐      N:M
                              │ role_permissions├──────────┐
                              └─────────────────┘           │
                                                            ▼
                                                   ┌─────────────┐
                                                   │permissions  │
                                                   └─────────────┘
```

### 6.2 权限编码规范

- **菜单权限**：`menu:<module>.<submodule>:<action>`
  - 例：`menu:system.settings:read`、`menu:credentials.list:view`
- **API 权限**：`api:<method>:<path>`
  - 例：`api:GET:/api/v1/credentials`、`api:POST:/api/v1/roles`
- **资源权限**：`resource:<resource_type>:<action>`
  - 例：`resource:credential:delete`、`resource:audit_log:export`

### 6.3 授权查询流程

```python
# 伪代码示例
def has_permission(user_id: str, permission_code: str) -> bool:
    """
    1. 查 user_roles 表找到用户所有角色
    2. 查 role_permissions 表找到角色的所有权限
    3. 查 permissions 表验证权限是否存在且启用
    4. 判定 permission_code 是否在集合中
    """
    user_roles = db.query(UserRole).filter_by(user_id=user_id).all()
    role_ids = [r.role_id for r in user_roles]
    
    role_permissions = db.query(RolePermission).filter(
        RolePermission.role_id.in_(role_ids)
    ).all()
    
    permission_ids = [rp.permission_id for rp in role_permissions]
    
    permission = db.query(Permission).filter_by(
        code=permission_code,
        id__in=permission_ids
    ).first()
    
    return permission is not None
```

---

## 7. 观测与监控

### 7.1 关键指标

- **API 延迟**：P50, P95, P99（秒级）
- **任务成功率**：APScheduler 任务成功 / 总数（%）
- **审计日志写入速率**：records/sec

### 7.2 日志与追踪

- **结构化日志**：使用 loguru，所有日志添加 request_id、trace_id
- **审计日志**：所有敏感操作落 audit_logs 表，永久保存

---

## 8. 演进路线

### Phase 1（首版，本文档覆盖范围）

- 核心用户和权限管理
- 凭证安全托管
- Kubernetes、Jenkins、Prometheus provider
- 定时任务和按需异步任务
- 审计日志

### Phase 2

- 更多 provider（Jira、Feishu、GitLab 等）
- Web 前端管理控制台
- 高级搜索和导出功能

### Phase 3

- AI 能力集成（LLM provider）
- 工作流编排（DAG 任务）
- 分布式部署和高可用

---

## 总结

本架构设计遵循以下原则：

1. **清晰的职责分离**：API Service、MCP Service、执行层、存储层各司其职
2. **轻量但完整**：使用 APScheduler 而非 Celery，减少外部依赖
3. **企业级可控性**：五表 RBAC、全链路审计、凭证安全
4. **长期可演进**：Python 生态友好，MCP 协议支持灵活扩展
5. **生产就绪**：考虑了高可用、监控、日志、部署等因素

