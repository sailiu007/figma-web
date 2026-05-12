# Python First MCP Gateway 设计草案

## 1. 目标

本系统不是一个只做转发的 API Gateway，而是一个面向 MCP 的工具平台。核心目标如下：

- 支持企业内用户管理和组织级配置
- 托管外部系统凭证，并在调用时安全注入
- 同时提供 REST API 服务和独立 MCP 服务
- 以 FastAPI 异步处理为基础，长任务和定时任务交给 Celery，补充审计追踪和权限控制
- 为 AI、RAG、运维自动化、业务集成等扩展场景预留统一接入面

主语言统一选择 Python，原因是：

- 与当前 atlas 后端实现保持一致，避免重复维护两套主服务
- 更适合 MCP、AI、provider 生态的快速集成
- 当前项目已经采用 FastAPI、SQLAlchemy、Pydantic Settings，适合继续做轻量特性分层
- 便于在同一代码库内持续演进 API 服务、MCP 服务和 provider 能力

## 2. 总体架构

```text
Frontend / Admin Console
     │
     ▼
  API Service : HTTP Port A
     │
   ┌─────┼──────────────────────────────┐
   ▼     ▼                              ▼
 Auth   RBAC AuthZ                 Execution Service
     │                              │
     │                              ├──────────────► Sync Services
     │                              │                    │
     │                              │                    ▼
     │                              │              External Systems
     │                              │
     │                              └──────────────► Async Job Submitter
     │                                                   │
     ▼                                                   ▼
  Menu / API AuthZ                                   Worker / Queue


MCP Client
  │
  ▼
MCP Service : MCP Port B
  │
  ▼
MCP Server Adapter
  │
  ▼
MCP Execution Service
  │
  ▼
External Systems / Internal Capabilities


Shared Supporting Services:
- PostgreSQL
- Redis
- Celery Worker / Celery Beat
- Audit / Invocation Logs

部署建议：
- API Service 与 MCP Service 默认不同端口
- 代码可以放同一仓库，但运行时视为两个独立服务
- 未来可以按流量和职责拆成独立部署单元
```

## 3. Python 实现决策

### 3.1 推荐技术栈

- Web 框架：FastAPI
- ORM：SQLAlchemy 2.x
- 数据库：PostgreSQL
- 配置：Pydantic Settings
- 认证：JWT 优先，首版不落 session 表
- 授权：五表 RBAC，不使用 Casbin
- MCP：独立使用 Python MCP Server Library
- 异步任务：Celery + Redis，负责长任务、定时任务和必要的后处理
- 日志：loguru
- 观测：OpenTelemetry + Prometheus
- 数据加密：应用层 AES-GCM，主密钥来自环境变量注入

### 3.2 为什么使用五表授权

这里不再使用 Casbin，而是采用更直接的五表 RBAC 模型。原因是：

- 更贴合后台管理系统的前端菜单和 API 授权需求
- 数据结构简单，调试成本更低
- 权限来源直接来自数据库表，不需要再维护一层 policy 同步逻辑
- 更适合和当前用户、角色、菜单、权限管理界面直接对应

授权主要用于前端菜单展示和 API 访问控制。系统默认服务于单一企业，数据与配置都按统一组织管理。

这里默认整个系统属于同一个企业，因此不再区分额外组织维度。

### 3.3 Provider 的边界

Provider 的目标是完成功能，不是单纯包装某一个 HTTP API。

这里不要求把内部能力与外部系统能力全部统一抽象成 Tool。更实际的边界是：

- 内部能力可以是普通函数、auth 模块或少量 service
- 外部系统集成按 provider 组织
- 只有在 MCP 协议层暴露的能力，才映射成 MCP tool
- 普通 REST API 不必为了统一模型强行包一层 tool registry
- API 和 MCP 在运行时是独立服务，不要求 API 为 MCP 提供额外包装层

一个 tool 可能：

- 只调用一次外部 API
- 调用一个官方 SDK 完成能力
- 调用多个三方库
- 组合多个 API / 多步查询 / 多次重试后完成一个功能

因此 provider 的职责应该是“能力实现”，不是“接口转发”。

例如：

- kubernetes.pod_diagnostics 可能会同时读取 Pod 状态、容器状态和日志
- jenkins.pipeline_diagnostics 可能会先解析 job/build，再拉 console output，再抽取异常
- jira.create_issue_with_attachment 可能会先建单，再上传附件，再追加评论

实现原则：

- 优先使用稳定三方库或官方 SDK
- provider 内部允许有多步编排
- Gateway 只关心能力契约，不关心 provider 内部调用了几次外部 API
- 系统内部维护轻量 ToolRegistry，用于 MCP tools/list 和 API tool execution
- Registry 在进程启动时从 provider 模块自动加载，不持久化到数据库
- ToolSpec 定义包含：name、description、input/output schema、execution_mode、provider、handler
- MCP 暴露能力由 ToolRegistry 中已注册且 enabled 的工具决定

## 4. 推荐项目结构

结合现有 atlas Python 项目结构，建议使用下面的目录布局：

```text
backend
  app/
    api/
      auth/
      deps.py
      routes/
    core/
      config.py
      security.py
      logging.py
    persistence/
      db.py
      auth/
        model.py
        sql.py
      credentials/
        model.py
        sql.py
      task_schedulers/
        model.py
        sql.py
      audit_logs/
        model.py
        sql.py
    tools/
      registry.py
      spec.py
      builtin/
    providers/
      jira/
      gitlab/
      kubernetes/
      jenkins/
      prometheus/
      ai/
    workers/
      celery_app.py
      tasks.py
      scheduler.py
      scheduled_tasks.py
    mcp/
      server.py
      tools.py
      executor.py
    tests/
frontend/
```

分层原则：

- api/routes 只处理协议、请求参数、响应格式
- 简单 CRUD 场景可以在 api 层直接调用 persistence 下的 sql 模块，不强制多包一层 service
- 当多个 service 或模块共享相同数据访问逻辑时，可引入 repository 层做可选封装
- auth 作为特殊模块处理登录、鉴权和多表授权逻辑
- persistence 统一放 db、ORM model 和 SQL 访问逻辑
- 每张表要么使用单文件模式，要么使用表名子目录模式，子目录内固定为 model.py 和 sql.py
- 授权相关持久化统一收在 persistence/auth 目录，不按 users、roles、permissions、user_roles、role_permissions 再拆成五个目录
- schemas/ 下仅保留 common.py（基类）和 response.py（统一响应格式），业务请求和响应模型按 API 模块就近放置
- providers 放在 app/providers 下，作为外部系统能力实现
- API 与 MCP 分别维护自己的入口和执行逻辑，不共享同一个监听端口
- API 与 MCP 共享 ToolService 和 ToolRegistry，仅入口协议不同
- 不强制所有 handler 先经过 service，再访问数据库

## 5. 模块职责

### 5.1 Frontend / Admin Console

职责：

- 用户登录与会话管理
- 管理用户、角色、权限
- 管理凭证和 provider 配置
- 查看工具目录、调用记录、调度任务
- 查看审计日志和故障原因

### 5.2 FastAPI Service

这是后台与业务接口入口，负责：

- 提供 REST API
- 统一认证、鉴权、限流、审计、错误处理
- 统一 request_id 和 trace_id 注入
- 默认走同步调用链路

不负责：

- 不承载 MCP 协议服务
- 不为 MCP tools/list 做额外中转层
- 不要求和 MCP 服务使用同一端口或同一进程

### 5.3 Auth

职责：

- 用户认证
- JWT Access Token / Refresh Token 签发与校验
- 首版不维护 session 持久化表
- 解析当前用户上下文
- 处理 users、roles、permissions、user_roles、role_permissions 的多表授权查询与写入

### 5.4 Authorization

职责：

- 基于五表 RBAC 做前端菜单可见性控制
- 基于五表 RBAC 做 API 访问授权
- 对少量后台管理能力做权限控制

注意：

- 授权只负责判定，不负责业务执行
- 角色元数据保存在业务表中
- 权限来源直接来自 roles、permissions、user_roles、role_permissions 等表
- 不引入额外组织维度

### 5.5 MCP Service

职责：

- 使用 Python MCP 库启动独立 MCP Server
- 暴露 tools/list 和 tools/call
- 按 MCP 协议组织能力清单和返回结果
- 调用 MCP 自己的执行服务

说明：

- MCP 服务和 API 服务不是同一个端口
- MCP 服务不依赖 API 服务先包装一层能力
- 未来可以独立扩容、独立部署

### 5.6 Credential Access

职责：

- 保存外部系统凭证
- 加密 secret 并做版本控制
- 在执行前解析 credential 并注入 provider
- 记录凭证测试和使用审计

要求：

- secret 不明文落库
- 支持凭证轮换
- 支持 provider 级配置和实例级配置

### 5.7 Execution Service

职责：

- ToolService 负责 tool 执行写路径：创建审计记录、判断 sync/async、投递任务
- ExecutionService 负责读路径：查询 invocations、查询审计记录
- 在执行前做鉴权、credential 注入、参数校验
- 按 ToolSpec.execution_mode 决定直接 await 返回还是投递 Celery
- 记录统一审计与执行日志

说明：

- ToolService 为 API 和 MCP 共享的执行层
- 按需异步任务不需要独立任务表，Celery 投递后状态回写到业务实体和 audit_logs
- 只有跨 provider、多步事务、复杂补偿等场景才建议落 service
- 简单单表或少量查询接口，api 可以直接调用 persistence sql 模块

### 5.8 MCP Service 执行链路

MCP Service 通过 McpExecutor 适配层调用共享 ToolService：

- tools/list → ToolService.list_tools() → ToolRegistry
- tools/call → ToolService.execute()

与 API 的区别仅在于：

- 认证方式不同（MCP 可能使用 token 或 client cert）
- 响应格式不同（MCP protocol vs REST JSON）
- 入口端口不同

说明：

- tools/list 通过实时查询 ToolRegistry 中已注册能力动态生成
- 首版不单独维护 MCP 能力目录持久化表
- 如果未来拆分部署，可以通过共享数据库或内部 API 实时获取能力清单

### 5.9 Scheduler & Workers

系统的异步能力分为两类，职责和实现方式完全不同：

#### 定时任务（TaskScheduler）

由 scheduler.py 管理，基于 task_schedulers 表和 Celery Beat：

- 周期性巡检、定时同步、定时清理等需要持续运行的周期任务
- task_schedulers 表记录任务定义（cron 表达式、启用状态、上次/下次执行时间等）
- 支持通过 API 创建、停用、删除定时任务
- Celery Beat 从 task_schedulers 表加载调度计划

#### 按需异步任务

由业务模块直接投递 Celery，不依赖独立任务表：

- API 收到请求后，业务数据先落库（例如报警信息插入 alerts 表）
- 业务 service 投递 Celery task（如 process_alert.delay(alert_id)）
- Worker 执行完毕后，将处理结果回写到业务实体本身（如更新 alerts 表的 status、result 字段）
- 关键操作同时写入 audit_logs 保持审计一致性

这种方式的好处是：不需要维护一张通用 jobs 表来追踪所有异步任务的状态，每个业务实体自己管理自己的处理状态，查询更直接，关系更清晰。

组件：

- celery_app.py：Celery 配置，broker/backend 连接，队列声明
- tasks.py：按需异步任务实现（由业务模块按需定义）
- scheduler.py：TaskScheduler，从 task_schedulers 表加载定时任务并注册到 Celery Beat

部署模型：

```
celery -A app.workers.celery_app worker -c 4
celery -A app.workers.celery_app beat
```

### 5.10 Providers

按外部系统拆分，不按零散功能拆。建议目录：

- providers/jira
- providers/gitlab
- providers/feishu
- providers/mysql
- providers/kubernetes
- providers/jenkins
- providers/prometheus
- providers/aws
- providers/ai
- providers/grafana

每个 provider 下暴露多个 tool，例如：

- jira.create_issue
- jira.search_issue
- gitlab.pipeline_status
- feishu.send_message
- kubernetes.pod_diagnostics
- jenkins.pipeline_diagnostics

这里的命名主要服务于 MCP 暴露和 provider 能力识别，不意味着系统内部所有能力都必须走 tool registry。

## 6. 五表授权模型

### 6.1 模型建议

建议使用经典五表 RBAC：users、roles、permissions、user_roles、role_permissions。

其中：

- users：系统用户主体
- roles：角色定义
- permissions：权限定义，覆盖 menu 和 api 两类资源
- user_roles：用户与角色绑定关系
- role_permissions：角色与权限绑定关系

解释：

- sub：用户主体，例如 user:u_001
- permission code：例如 menu:system.settings:read、api:/api/v1/credentials:write

推荐约定：

- menu 类权限控制前端菜单显示和页面入口
- api 类权限控制后端接口访问
- 一个 permission 对应一个明确资源和动作，不额外引入 policy engine

### 6.2 Policy 示例

```text
users:
- user:u_001
- user:u_002

roles:
- admin
- operator

permissions:
- menu:system.settings:read
- api:/api/v1/credentials:read
- api:/api/v1/credentials:write
- menu:alerts.center:read
- api:/api/v1/alerts:read

user_roles:
- user:u_001 -> admin
- user:u_002 -> operator

role_permissions:
- admin -> menu:system.settings:read
- admin -> api:/api/v1/credentials:read
- admin -> api:/api/v1/credentials:write
- operator -> menu:alerts.center:read
- operator -> api:/api/v1/alerts:read
```

### 6.3 设计原则

- 角色是业务对象，保存在 roles 表
- 用户和角色的绑定保存在 user_roles 表
- 权限明细保存在 permissions 表
- 角色授权关系保存在 role_permissions 表

这样做的好处是：

- 管理端有清晰的角色元数据
- 鉴权时不需要自己拼 SQL 判定
- 数据库模型和管理界面天然对应

## 7. 同步与异步执行模型

### 7.1 同步执行

默认原则：FastAPI 路由和服务实现采用 async/await 方式组织。能在一次请求周期内完成的任务直接异步返回；明显长耗时或需要定时调度的任务交给 Celery。

适用场景：

- MCP tools/call
- 查询类能力
- 轻量写操作
- 通常在几秒内完成的能力

执行链路：

1. 请求进入 API Service 或 MCP Service
2. 各自完成认证与上下文解析
3. API Service 使用五表 RBAC 做菜单或 API 授权；MCP Service 按实时能力配置决定可用能力
4. Credential Access 注入凭证
5. 对应的执行逻辑直接调用 persistence、auth 或 provider；复杂场景再进入 service
6. 写入统一 audit_logs
7. 返回结果

### 7.2 异步执行

适用场景：

- 长耗时 provider 操作
- 定时巡检、定时同步、定时补偿任务
- API 返回成功后的后处理任务
- 报警消息接入后的异步分析、补偿、通知

#### 按需异步执行链路

以报警处理为例：

1. 请求进入 API Service
2. Auth 和五表 RBAC 校验
3. 报警数据写入业务表（如 alerts），状态设为 pending
4. 投递 Celery task（如 process_alert.delay(alert_id)）
5. API 立即返回 alert_id 和 pending 状态
6. Worker 执行处理逻辑（诊断、补偿、通知等）
7. 处理结果回写到 alerts 表（status → succeeded/failed，result 等字段）
8. 关键操作写入 audit_logs

原则：业务数据和处理状态保存在业务表自身，不经过通用 jobs 表中转。

#### 定时任务执行链路

1. 通过 API 在 task_schedulers 表创建定时任务（包含 cron 表达式、task_name、payload）
2. Celery Beat 从 task_schedulers 表加载调度计划
3. 按 cron_expr 到达时触发对应 Celery task
4. Worker 执行任务实现
5. 回写 task_schedulers（last_run_at、next_run_at、last_status）

## 8. API 设计

统一约定：

- 前缀使用 /api/v1
- 所有写接口记录 audit log
- 所有列表接口支持分页
- 所有响应带 request_id

说明：

- 这里的 API 设计仅针对 HTTP API Service
- MCP Service 使用独立端口和独立协议入口，不复用这些 REST 路由

### 8.1 认证与会话 API

- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh
- GET /api/v1/auth/me

### 8.2 凭证管理 API

- GET /api/v1/credentials
- POST /api/v1/credentials
- GET /api/v1/credentials/{credential_id}
- DELETE /api/v1/credentials/{credential_id}
- POST /api/v1/credentials/{credential_id}/test

### 8.3 审计与执行记录 API

- GET /api/v1/audit-logs
- GET /api/v1/audit-logs/{audit_log_id}

说明：

- 管理操作审计和 tool 执行记录统一落在 audit_logs
- 如果需要展示 MCP 调用历史，直接按 event_type 或 tool_name 过滤 audit_logs

### 8.4 定时任务 API

- GET /api/v1/task-schedulers — 定时任务列表
- POST /api/v1/task-schedulers — 创建定时任务
- GET /api/v1/task-schedulers/{task_id} — 任务详情
- DELETE /api/v1/task-schedulers/{task_id} — 删除定时任务
- POST /api/v1/task-schedulers/{task_id}:enable — 启用
- POST /api/v1/task-schedulers/{task_id}:disable — 停用
- POST /api/v1/task-schedulers/{task_id}:run — 立即执行一次

### 8.5 RBAC 管理 API

- GET /api/v1/roles
- POST /api/v1/roles
- DELETE /api/v1/roles/{role_id}
- GET /api/v1/users/{user_id}/roles
- POST /api/v1/users/{user_id}/roles
- GET /api/v1/policies
- POST /api/v1/roles/{role_id}/policies

### 8.6 MCP 协议入口说明

- MCP Service 监听独立端口
- 使用 MCP 库提供的协议入口
- 是否支持 streamable HTTP、SSE 或 stdio，取决于所选 MCP 库能力
- MCP 的 tools/list 和 tools/call 由 MCP Service 自己处理，不复用 API Service 路由

## 9. 数据库设计

这里使用 PostgreSQL，字段类型以 PostgreSQL 为准。默认约定：

- 主键使用 uuid
- JSON 扩展字段使用 jsonb
- 状态字段使用 varchar + check，或者落成 enum
- created_at / updated_at 使用 timestamptz
- 高并发查询字段全部建立组合索引

### 9.1 表关系概览

```text
users ───────────────┐
                     ├── user_roles ─────────────┐
                     │                           └── roles ─── role_permissions ─── permissions
                     ├── credentials
                     ├── task_schedulers
                     └── audit_logs
```

### 9.2 users

用途：企业内统一用户主体。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 用户主键 |
| email | varchar(255) unique | 登录邮箱 |
| username | varchar(64) unique | 登录名 |
| password_hash | varchar(255) null | 密码哈希 |
| display_name | varchar(128) | 显示名 |
| phone | varchar(32) null | 手机号 |
| avatar_url | text null | 头像 |
| preferred_language | varchar(8) null | 语言偏好 |
| title | varchar(128) null | 职位 |
| team | varchar(128) null | 团队 |
| global_status | varchar(32) | active, disabled, locked |
| last_login_at | timestamptz null | 最后登录 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| deleted_at | timestamptz null | 软删除 |

索引与约束：

- unique(email)
- unique(username)
- index(global_status)

### 9.3 roles

用途：角色元数据，用于 UI 展示和角色管理。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| code | varchar(64) | 角色编码 |
| name | varchar(128) | 角色名称 |
| description | text null | 描述 |
| is_system | boolean | 是否系统内置 |
| status | varchar(32) | active, disabled |
| created_by | uuid null | 创建人 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引与约束：

- unique(code)
- index(status)

### 9.4 user_roles

用途：用户与角色的绑定关系。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| user_id | uuid fk | 用户 |
| role_id | uuid fk | 角色 |
| assigned_by | uuid null | 赋权人 |
| created_at | timestamptz | 创建时间 |

索引与约束：

- unique(user_id, role_id)
- index(role_id)

### 9.5 permissions

用途：权限定义表，用于后台展示、初始化和运行时授权判定。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| code | varchar(128) unique | 例如 menu:system.settings:read |
| resource_type | varchar(32) | menu, api, credential, admin |
| resource_key | varchar(255) | 资源标识，例如 /api/v1/credentials |
| action | varchar(64) | read, write, delete |
| category | varchar(64) | UI 分组 |
| description | text null | 描述 |
| is_system | boolean | 是否系统模板 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引与约束：

- unique(code)
- index(resource_type, category)

### 9.6 role_permissions

用途：角色与权限绑定关系，是运行时授权的核心关系表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| role_id | uuid fk | 角色 |
| permission_id | uuid fk | 权限 |
| created_at | timestamptz | 创建时间 |

索引与约束：

- unique(role_id, permission_id)
- index(permission_id)

### 9.7 credentials

用途：外部系统凭证托管。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| owner_user_id | uuid fk | 拥有者 |
| provider | varchar(64) | gitlab, jira, aws 等 |
| auth_type | varchar(64) | token, basic, oauth2, keypair |
| name | varchar(128) | 凭证名称 |
| encrypted_secret | bytea 或 text | 加密后的 secret |
| secret_version | int | 密钥版本 |
| config_json | jsonb | 非敏感配置 |
| scopes_json | jsonb null | 可选 scope |
| status | varchar(32) | active, disabled, expired |
| last_verified_at | timestamptz null | 最后验证 |
| expires_at | timestamptz null | 凭证失效时间 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| deleted_at | timestamptz null | 软删除 |

索引与约束：

- unique(provider, name)
- index(provider, status)

### 9.8 task_schedulers

用途：定时任务定义与调度管理。只负责周期性定时任务，按需异步任务的状态由各业务表自行管理。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| name | varchar(128) unique | 任务名称，人类可读 |
| description | text null | 任务描述 |
| task_name | varchar(255) | Celery task 全限定名 |
| cron_expr | varchar(128) | cron 表达式 |
| queue_name | varchar(64) | 队列名，default: atlas.default |
| enabled | boolean | 是否启用 |
| payload_json | jsonb | 任务输入参数 |
| max_retries | int | 单次执行最大重试次数 |
| timeout_seconds | int null | 单次执行超时时间 |
| last_run_at | timestamptz null | 最近一次执行时间 |
| next_run_at | timestamptz null | 下次计划执行时间 |
| last_status | varchar(32) null | 上次执行状态：succeeded, failed |
| last_error | text null | 上次执行错误信息 |
| run_count | int | 累计执行次数 |
| created_by | uuid fk null | 创建人 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

索引与约束：

- unique(name)
- index(enabled, next_run_at)
- index(task_name)

说明：

- scheduler.py 中的 TaskScheduler 从此表加载调度计划并注册到 Celery Beat
- 按需异步任务（如报警处理、tool 异步执行）不经过此表，状态直接回写到业务实体
- 如需审计定时任务的每次执行细节，由任务实现自行写入 audit_logs

### 9.9 audit_logs

用途：统一记录管理操作、敏感资源变更、授权变更、凭证测试和 tool 执行结果。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid pk | 主键 |
| actor_user_id | uuid fk null | 操作人 |
| actor_type | varchar(32) | user, system, job |
| event_type | varchar(32) | admin_action, tool_execution, auth, credential_test |
| source | varchar(32) | api, mcp, celery, system |
| action | varchar(128) | 例如 credential.create |
| resource_type | varchar(64) | credential, role, policy, tool |
| resource_id | varchar(128) | 资源标识 |
| tool_name | varchar(255) null | 工具名 |
| status | varchar(32) null | succeeded, failed, running 等 |
| request_id | varchar(64) null | 请求 ID |
| trace_id | varchar(64) null | trace ID |
| request_json | jsonb null | 请求摘要 |
| response_json | jsonb null | 响应摘要 |
| before_json | jsonb null | 变更前 |
| after_json | jsonb null | 变更后 |
| error_message | text null | 错误信息 |
| latency_ms | bigint null | 耗时 |
| metadata_json | jsonb null | 补充信息 |
| created_at | timestamptz | 创建时间 |

索引与约束：

- index(event_type, created_at)
- index(tool_name, created_at)
- index(actor_user_id, created_at)
- index(resource_type, resource_id)

## 10. 关键一致性规则

### 10.1 授权数据一致性

- roles 和 user_roles 是角色管理元数据
- permissions 是权限定义目录
- role_permissions 是最终授权关系数据
- 管理后台变更角色权限时，由 auth 模块统一处理 roles、user_roles、permissions、role_permissions 和 audit_logs

### 10.2 凭证安全

- encrypted_secret 必须应用层加密
- token_hash、refresh_token_hash 只存哈希
- 审计日志不记录明文 secret

### 10.3 Tool 与 Provider 的关系

- 只有对 MCP 暴露的能力才需要稳定的 tool_name，例如 jenkins.pipeline_diagnostics
- provider 内部可以调用多个 SDK 或多个 API
- 首版不单独维护步骤明细表，执行细节按需写入 audit_logs.metadata_json

## 11. 首版建议范围

首版建议先落以下能力：

- 用户、角色、五表 RBAC 授权
- 凭证管理与加密存储
- FastAPI 同步执行链路 + Celery 按需异步任务
- TaskScheduler 定时任务模块（task_schedulers 表 + Celery Beat）
- MCP tools/list 和 tools/call（通过共享 ToolService + ToolRegistry）
- 基于 Redis 的 Celery Worker / Beat
- Kubernetes、Jenkins、Prometheus 三类 provider
- audit_logs 全链路审计记录

这样可以先把平台骨架、授权边界、数据库骨架和 provider 形态全部定住，后续再横向扩展 Jira、GitLab、Feishu、AI 等 provider。
