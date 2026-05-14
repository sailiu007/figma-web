# CI-Atlas 系统详细设计

## 1. Python 实现决策

### 1.1 技术栈

| 层级 | 组件 | 版本 | 用途 |
|-----|------|------|------|
| **Web 框架** | FastAPI | 0.104+ | 异步 HTTP 服务 |
| **ORM** | SQLAlchemy | 2.x | 类型安全的 ORM |
| **数据库驱动** | psycopg | 3.x | PostgreSQL 异步驱动 |
| **数据库** | PostgreSQL | 14+ | 主数据库 |
| **配置管理** | Pydantic Settings | v2 | 环境变量和配置 |
| **认证** | PyJWT | 2.x | JWT 签发和校验 |
| **密码哈希** | bcrypt | 4.x | 密码安全存储 |
| **数据加密** | cryptography | 42+ | AES-GCM 加密 |
| **异步任务** | APScheduler | 3.10+ | 定时和按需任务 |
| **MCP** | mcp (Python SDK) | 0.5+ | MCP 协议支持 |
| **日志** | loguru | 0.7+ | 结构化日志 |
| **观测** | opentelemetry | 1.x | 分布式追踪 |
| **数据验证** | Pydantic | v2 | 请求/响应验证 |

### 1.2 依赖管理

推荐使用 `uv` 或 `pdm` 管理依赖（比 pip + requirements.txt 更快）：

```bash
# requirements.txt 示例
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg[binary]==3.18.0
pydantic==2.5.0
pydantic-settings==2.1.0
PyJWT==2.8.1
cryptography==42.0.0
bcrypt==4.1.1
APScheduler==3.10.4
mcp==0.5.0
loguru==0.7.2
opentelemetry-api==1.21.0
opentelemetry-sdk==1.21.0
**架构决策**：
- APScheduler **内嵌在 API Service** 中（Beat + Worker 共存）
- MCP Service **独立运行**，不含 APScheduler
- 生产环境多副本时，用分布式锁保证 Beat 唯一性
## 2. 项目结构与分层
#### 启动方式
### 2.1 完整目录树

# 开发环境：一键启动所有服务
python app/main.py
├── alembic/                        # 数据库迁移（SQLAlchemy 版本管理）
# 生产环境：使用 gunicorn + uvicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

**API Service 在启动时自动初始化 APScheduler**：
- Worker：异步执行投递的任务
- Beat：从 task_schedulers 表加载定时任务，定时触发

#### K8s 部署配置示例

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ci-atlas-api
spec:
  replicas: 3  # 可自动扩容
  template:
    spec:
      containers:
      - name: api
        image: ci-atlas:latest
        command: 
          - "python"
          - "-m"
          - "gunicorn"
          - "app.main:app"
          - "--workers=4"
          - "--worker-class=uvicorn.workers.UvicornWorker"
          - "--bind=0.0.0.0:8000"
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          value: postgresql://user:pass@postgres:5432/atlas
        - name: SCHEDULER_LOCK_KEY
          value: "424242"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10

---
# mcp-deployment.yaml（独立，不含 APScheduler）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ci-atlas-mcp
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: mcp
        image: ci-atlas:latest
        command: 
          - "python"
          - "-m"
          - "app.mcp.server"
        ports:
        - containerPort: 9000
        env:
        - name: DATABASE_URL
          value: postgresql://user:pass@postgres:5432/atlas
```

#### 内嵌 APScheduler 详细实现

```python
# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.scheduler.scheduler import SchedulerManager
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI 生命周期管理：启动和关闭"""
    
    # ===== 启动阶段 =====
    logger.info("Initializing APScheduler...")
    
    # 初始化 APScheduler
    scheduler_manager = SchedulerManager()
    await scheduler_manager.initialize()
    
    # 启动 Beat（定时任务调度）
    # 使用分布式锁防止多副本重复触发
    scheduler_manager.start_beat()
    
    # 启动 Worker（异步任务执行）
    scheduler_manager.start_worker()
    
    logger.info("APScheduler started successfully")
    
    yield  # 应用运行中...
    
    # ===== 关闭阶段 =====
    logger.info("Shutting down APScheduler...")
    scheduler_manager.shutdown()
    logger.info("APScheduler shut down completed")


app = FastAPI(
    title="CI-Atlas",
    lifespan=lifespan
)

# 健康检查端点
@app.get("/health")
async def health():
    return {"status": "ok"}

# ... 其他路由 ...

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

```python
# app/scheduler/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.executors.pool import ThreadPoolExecutor

class SchedulerManager:
    """APScheduler 管理器"""
    
    _instance = None
    
    @classmethod
    def get_scheduler(cls) -> AsyncIOScheduler:
        if cls._instance is None:
            cls._instance = cls._init_scheduler()
        return cls._instance
    
    @staticmethod
    def _init_scheduler() -> AsyncIOScheduler:
        """初始化 APScheduler
        
        共享配置（Beat + Worker 都使用）：
        - PostgreSQL JobStore：持久化任务
        - 任务去重：coalesce=True（跳过错过的执行）
        - 单实例运行：max_instances=1（防止并发执行）
        """
        
        from app.config import settings
        
        # PostgreSQL JobStore
        jobstore = SQLAlchemyJobStore(
            url=settings.DATABASE_URL,
            tablename="apscheduler_jobs"
        )
        
        # 执行器配置
        executors = {
            "default": AsyncIOExecutor(),
            "threadpool": ThreadPoolExecutor(max_workers=10)
        }
        
        # 调度器配置
        scheduler = AsyncIOScheduler(
            jobstores={"default": jobstore},
            executors=executors,
            job_defaults={
                "coalesce": True,  # 合并错过的执行（不重复）
                "max_instances": 1  # 同一任务不并发
            },
            timezone="UTC"
        )
        
        return scheduler


# 启动 Beat 进程
def run_beat():
    """启动 APScheduler Beat
    
    职责：
    1. 从 task_schedulers 表加载所有启用的定时任务
    2. 按 cron_expr 定时触发任务
    3. 任务投递到 APScheduler job store
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    from app.persistence.task_scheduler import sql as task_sql
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        
        # 从 task_schedulers 表加载所有定时任务
        async with get_db() as db:
            enabled_tasks = await task_sql.list_enabled(db)
            
            for task_def in enabled_tasks:
                # 注册到 APScheduler
                scheduler.add_job(
                    execute_scheduled_task,
                    trigger='cron',
                    args=(task_def.id,),
                    id=task_def.id,  # 使用 task_id 作为 job id
                    replace_existing=True,
                    **parse_cron_to_kwargs(task_def.cron_expr)
                )
        
        # 启动 Beat
        scheduler.start()
        print("APScheduler Beat started")
    
    asyncio.run(main())


# 启动 Worker 进程
def run_worker():
    """启动 APScheduler Worker
    
    职责：
    1. 从 job store 获取待执行任务
    2. 执行任务代码
    3. 更新任务状态（成功/失败）
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        scheduler.start()
        print("APScheduler Worker started")
        
        # Worker 持续运行，直到收到 SIGTERM
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            scheduler.shutdown()
    
    asyncio.run(main())


# 应用入口
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        run_worker()
    else:
        run_beat()
```

**Beat vs Worker 关键差异**：

| 维度 | Beat | Worker |
|-----|------|--------|
| **职责** | 扫描 task_schedulers，触发定时任务 | 执行实际任务代码 |
| **Replicas** | 仅单实例部署 | 仅单实例 |

**高可用配置**：
- 单实例部署，无需分布式锁

# app/scheduler/beat_lock.py
# （单实例无需分布式锁，直接调度）

### 2.2 分层原则

| 层级 | 职责 | 依赖方向 |
|-----|------|--------|
| **API 路由** | HTTP 协议、参数解析、响应格式化 | → service / persistence |
| **Service 层** | 业务逻辑、事务协调、参数验证 | → persistence / provider |
| **Persistence** | 数据库访问、ORM、SQL 查询 | → DB |
| **Provider** | 外部系统集成、SDK 调用、多步编排 | → 外部 API / SDK |
| **Utils** | 通用工具（加密、日志、验证） | 无依赖（可被任何层使用） |

**原则**：
- 简单 CRUD 可在 API 层直接调用 persistence，不强制经过 service
- 复杂业务逻辑和多表事务必须在 service 层处理
- Provider 只负责能力实现，不处理认证和权限
- Utils 不依赖上层模块

---

## 3. 核心模块详细设计

### 3.1 Auth 模块

**职责**：
- JWT 签发和校验
- 用户认证（用户名/邮箱 + 密码）
- 从当前请求中提取用户信息
- 基于五表 RBAC 的权限查询

**核心接口**：

```python
# app/service/auth.py

class AuthService:
    async def authenticate(self, username: str, password: str) -> User:
        """验证用户身份，返回 User 对象"""
        pass
    
    async def create_tokens(self, user_id: str) -> Dict[str, str]:
        """生成 access_token 和 refresh_token"""
        return {
            "access_token": "...",
            "refresh_token": "...",
            "token_type": "bearer"
        }
    
    async def verify_token(self, token: str) -> dict:
        """验证 JWT token，返回 payload"""
        pass
    
    async def get_user_permissions(self, user_id: str) -> Set[str]:
        """查询用户的所有权限（通过 user_roles → role_permissions → permissions）"""
        pass
    
    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        """检查用户是否拥有某权限"""
        pass
```

**权限查询实现**：

```python
async def get_user_permissions(self, user_id: str) -> Set[str]:
    """
    执行 SQL 联合查询：
    1. SELECT role_id FROM user_roles WHERE user_id = ?
    2. SELECT permission_id FROM role_permissions WHERE role_id IN (...)
    3. SELECT code FROM permissions WHERE id IN (...) AND is_system = false
    """
    stmt = select(Permission.code).join(
        RolePermission, Permission.id == RolePermission.permission_id
    ).join(
        Role, RolePermission.role_id == Role.id
    ).join(
        UserRole, Role.id == UserRole.role_id
    ).where(UserRole.user_id == user_id)
    
    result = await db.execute(stmt)
    return set(result.scalars().all())
```

### 3.2 Execution Service

**职责**：
- 参数校验（Pydantic）
- 从 credentials 表查询和解密凭证
- 凭证注入到 Provider
- 执行前/后的审计日志写入

**执行链路伪代码**：

```python
# app/service/execution.py

class ExecutionService:
    async def execute_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        user_id: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """
        执行工具的核心方法
        """
        start_time = time.time()
        audit_log = None
        
        try:
            # 1. 参数校验
            validated_params = self.validate_params(tool_name, params)
            
            # 2. 查询凭证
            provider_name = tool_name.split('.')[0]  # e.g., 'jira' from 'jira.create_issue'
            credential = await persistence.credential.get_active_credential(
                provider=provider_name,
                owner_user_id=user_id
            )
            if not credential:
                raise CredentialNotFoundError(f"No credential for {provider_name}")
            
            # 3. 解密凭证
            decrypted_secret = decrypt_secret(credential.encrypted_secret)
            
            # 4. 创建审计日志（记录开始）
            audit_log = await persistence.audit_log.create(
                actor_user_id=user_id,
                event_type="tool_execution",
                source="api",
                action="tool.execute",
                resource_type="tool",
                resource_id=tool_name,
                tool_name=tool_name,
                status="running",
                request_id=request_id,
                request_json=params
            )
            
            # 5. 调用 Provider
            provider = ProviderRegistry.get(provider_name)
            result = await provider.call(
                tool_name=tool_name,
                params=validated_params,
                credentials=decrypted_secret
            )
            
            # 6. 更新审计日志（成功）
            latency_ms = int((time.time() - start_time) * 1000)
            await persistence.audit_log.update(
                audit_log.id,
                status="succeeded",
                response_json=result,
                latency_ms=latency_ms
            )
            
            return result
            
        except Exception as e:
            # 6. 更新审计日志（失败）
            latency_ms = int((time.time() - start_time) * 1000)
            await persistence.audit_log.update(
                audit_log.id,
                status="failed",
                error_message=str(e),
                latency_ms=latency_ms
            )
            raise
```

### 3.3 Provider 架构

**基类**：

```python
# app/provider/base.py

class BaseProvider(ABC):
    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials
        self.client = None  # 由子类实现初始化
    
    @abstractmethod
    async def initialize(self):
        """初始化客户端（SDK 创建、连接等）"""
        pass
    
    @abstractmethod
    async def get_tools(self) -> List[ToolInfo]:
        """返回该 Provider 支持的所有 Tool"""
        pass
    
    @abstractmethod
    async def call(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行指定工具"""
        pass
```

**Kubernetes 示例**：

```python
# app/provider/kubernetes/client.py

class KubernetesProvider(BaseProvider):
    async def initialize(self):
        """使用凭证初始化 K8s 客户端"""
        # 凭证格式: {"kubeconfig_path": "...", "context": "..."}
        # 或: {"api_server": "...", "token": "..."}
        from kubernetes_asyncio import config, client
        
        if "kubeconfig_path" in self.credentials:
            await config.load_kube_config(
                self.credentials["kubeconfig_path"]
            )
        else:
            # 使用 token 和 API 服务器
            await config.load_incluster_config()
        
        self.client = client.CoreV1Api()
    
    async def get_tools(self) -> List[ToolInfo]:
        return [
            ToolInfo(
                name="kubernetes.pod_diagnostics",
                description="获取 Pod 诊断信息（状态、事件、日志）",
                parameters=ToolParameter(
                    type="object",
                    properties={
                        "namespace": {"type": "string"},
                        "pod_name": {"type": "string"},
                        "include_logs": {"type": "boolean"}
                    },
                    required=["namespace", "pod_name"]
                )
            ),
            ToolInfo(name="kubernetes.cluster_info", ...)
        ]
    
    async def call(self, tool_name: str, params: Dict) -> Dict:
        if tool_name == "kubernetes.pod_diagnostics":
            return await self._pod_diagnostics(params)
        else:
            raise UnknownToolError(tool_name)
    
    async def _pod_diagnostics(self, params: Dict) -> Dict:
        """多步编排示例：获取 Pod 状态、事件、日志"""
        namespace = params["namespace"]
        pod_name = params["pod_name"]
        
        # 1. 获取 Pod 状态
        pod = await self.client.read_namespaced_pod(pod_name, namespace)
        pod_status = {
            "phase": pod.status.phase,
            "conditions": [c.dict() for c in pod.status.conditions or []]
        }
        
        # 2. 获取 Pod 事件
        events = await self.client.list_namespaced_event(namespace)
        pod_events = [
            e.dict() for e in events.items 
            if e.involved_object.name == pod_name
        ]
        
        # 3. 获取 Pod 日志（如果请求）
        logs = None
        if params.get("include_logs", False):
            logs = await self.client.read_namespaced_pod_log(pod_name, namespace)
        
        return {
            "pod_status": pod_status,
            "events": pod_events,
            "logs": logs
        }
```

### 3.4 APScheduler 集成

**关键原则**：
- **Beat 必须单独起**（生产环境）
- **Worker 可水平扩展**（多副本）
- **共享 PostgreSQL job store**，确保不重复执行

#### APScheduler 启动方式

#### 按需异步任务

```python
# app/scheduler/tasks.py

@scheduler.scheduled_job(trigger=None)  # 按需任务
async def process_alert(alert_id: str):
    """处理单个告警的异步任务"""
    alert = await persistence.alert.get(alert_id)
    
    try:
        # 执行诊断、补偿、通知逻辑
        result = await execute_alert_diagnostics(alert)
        
        # 回写状态
        await persistence.alert.update(
            alert_id,
            status="succeeded",
            result=result
        )
        
        # 审计日志
        await persistence.audit_log.create(
            event_type="alert_processing",
            resource_id=alert_id,
            status="succeeded"
        )
        
    except Exception as e:
        await persistence.alert.update(
            alert_id,
            status="failed",
            error=str(e)
        )
        raise

# API 调用时投递任务
async def create_alert(request: AlertRequest, user_id: str):
    # 1. 插入告警
    alert = await persistence.alert.create(
        source=request.source,
        severity=request.severity,
        status="pending"
    )
    
    # 2. 投递异步任务
    from app.scheduler import scheduler
    scheduler.add_job(
        process_alert,
        args=(str(alert.id),),
        id=f"process_alert_{alert.id}",
        replace_existing=True
    )
    
    # 3. 立即返回
    return {"alert_id": str(alert.id), "status": "pending"}
```

**定时任务**：

```python
# app/scheduler/scheduled_tasks.py

@scheduler.scheduled_job(trigger='cron', hour=0, minute=0)
async def k8s_pod_sync_hourly():
    """每小时同步一次 K8s Pod 信息"""
    # 从 task_schedulers 表查询任务定义（如需）
    task_def = await persistence.task_scheduler.get_by_name("k8s_pod_sync_hourly")
    
    try:
        # 执行同步逻辑
        result = await sync_kubernetes_pods()
        
        # 更新 task_schedulers
        await persistence.task_scheduler.update(
            task_def.id,
            last_run_at=datetime.now(),
            last_status="succeeded",
            run_count=task_def.run_count + 1
        )
    except Exception as e:
        await persistence.task_scheduler.update(
            task_def.id,
            last_status="failed",
            last_error=str(e)
        )
        raise
```

**调度器初始化与配置**：

```python
# app/scheduler/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.executors.pool import ThreadPoolExecutor

class SchedulerManager:
    """APScheduler 管理器"""
    
    _instance = None
    
    @classmethod
    def get_scheduler(cls) -> AsyncIOScheduler:
        if cls._instance is None:
            cls._instance = cls._init_scheduler()
        return cls._instance
    
    @staticmethod
    def _init_scheduler() -> AsyncIOScheduler:
        """初始化 APScheduler
        
        共享配置（Beat + Worker 都使用）：
        - PostgreSQL JobStore：持久化任务
        - 任务去重：coalesce=True（跳过错过的执行）
        - 单实例运行：max_instances=1（防止并发执行）
        """
        
        from app.config import settings
        
        # PostgreSQL JobStore
        jobstore = SQLAlchemyJobStore(
            url=settings.DATABASE_URL,
            tablename="apscheduler_jobs"
        )
        
        # 执行器配置
        executors = {
            "default": AsyncIOExecutor(),
            "threadpool": ThreadPoolExecutor(max_workers=10)
        }
        
        # 调度器配置
        scheduler = AsyncIOScheduler(
            jobstores={"default": jobstore},
            executors=executors,
            job_defaults={
                "coalesce": True,  # 合并错过的执行（不重复）
                "max_instances": 1  # 同一任务不并发
            },
            timezone="UTC"
        )
        
        return scheduler


# 启动 Beat 进程
def run_beat():
    """启动 APScheduler Beat
    
    职责：
    1. 从 task_schedulers 表加载所有启用的定时任务
    2. 按 cron_expr 定时触发任务
    3. 任务投递到 APScheduler job store
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    from app.persistence.task_scheduler import sql as task_sql
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        
        # 从 task_schedulers 表加载所有定时任务
        async with get_db() as db:
            enabled_tasks = await task_sql.list_enabled(db)
            
            for task_def in enabled_tasks:
                # 注册到 APScheduler
                scheduler.add_job(
                    execute_scheduled_task,
                    trigger='cron',
                    args=(task_def.id,),
                    id=task_def.id,  # 使用 task_id 作为 job id
                    replace_existing=True,
                    **parse_cron_to_kwargs(task_def.cron_expr)
                )
        
        # 启动 Beat
        scheduler.start()
        print("APScheduler Beat started")
    
    asyncio.run(main())


# 启动 Worker 进程
def run_worker():
    """启动 APScheduler Worker
    
    职责：
    1. 从 job store 获取待执行任务
    2. 执行任务代码
    3. 更新任务状态（成功/失败）
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        scheduler.start()
        print("APScheduler Worker started")
        
        # Worker 持续运行，直到收到 SIGTERM
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            scheduler.shutdown()
    
    asyncio.run(main())


# 应用入口
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        run_worker()
    else:
        run_beat()
```

**Beat vs Worker 关键差异**：

| 维度 | Beat | Worker |
|-----|------|--------|
| **职责** | 扫描 task_schedulers，触发定时任务 | 执行实际任务代码 |
| **Replicas** | 仅单实例部署 | 仅单实例 |

**高可用配置**：
- 单实例部署，无需分布式锁

# app/scheduler/beat_lock.py
# （单实例无需分布式锁，直接调度）

### 2.2 分层原则

| 层级 | 职责 | 依赖方向 |
|-----|------|--------|
| **API 路由** | HTTP 协议、参数解析、响应格式化 | → service / persistence |
| **Service 层** | 业务逻辑、事务协调、参数验证 | → persistence / provider |
| **Persistence** | 数据库访问、ORM、SQL 查询 | → DB |
| **Provider** | 外部系统集成、SDK 调用、多步编排 | → 外部 API / SDK |
| **Utils** | 通用工具（加密、日志、验证） | 无依赖（可被任何层使用） |

**原则**：
- 简单 CRUD 可在 API 层直接调用 persistence，不强制经过 service
- 复杂业务逻辑和多表事务必须在 service 层处理
- Provider 只负责能力实现，不处理认证和权限
- Utils 不依赖上层模块

---

## 3. 核心模块详细设计

### 3.1 Auth 模块

**职责**：
- JWT 签发和校验
- 用户认证（用户名/邮箱 + 密码）
- 从当前请求中提取用户信息
- 基于五表 RBAC 的权限查询

**核心接口**：

```python
# app/service/auth.py

class AuthService:
    async def authenticate(self, username: str, password: str) -> User:
        """验证用户身份，返回 User 对象"""
        pass
    
    async def create_tokens(self, user_id: str) -> Dict[str, str]:
        """生成 access_token 和 refresh_token"""
        return {
            "access_token": "...",
            "refresh_token": "...",
            "token_type": "bearer"
        }
    
    async def verify_token(self, token: str) -> dict:
        """验证 JWT token，返回 payload"""
        pass
    
    async def get_user_permissions(self, user_id: str) -> Set[str]:
        """查询用户的所有权限（通过 user_roles → role_permissions → permissions）"""
        pass
    
    async def has_permission(self, user_id: str, permission_code: str) -> bool:
        """检查用户是否拥有某权限"""
        pass
```

**权限查询实现**：

```python
async def get_user_permissions(self, user_id: str) -> Set[str]:
    """
    执行 SQL 联合查询：
    1. SELECT role_id FROM user_roles WHERE user_id = ?
    2. SELECT permission_id FROM role_permissions WHERE role_id IN (...)
    3. SELECT code FROM permissions WHERE id IN (...) AND is_system = false
    """
    stmt = select(Permission.code).join(
        RolePermission, Permission.id == RolePermission.permission_id
    ).join(
        Role, RolePermission.role_id == Role.id
    ).join(
        UserRole, Role.id == UserRole.role_id
    ).where(UserRole.user_id == user_id)
    
    result = await db.execute(stmt)
    return set(result.scalars().all())
```

### 3.2 Execution Service

**职责**：
- 参数校验（Pydantic）
- 从 credentials 表查询和解密凭证
- 凭证注入到 Provider
- 执行前/后的审计日志写入

**执行链路伪代码**：

```python
# app/service/execution.py

class ExecutionService:
    async def execute_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        user_id: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """
        执行工具的核心方法
        """
        start_time = time.time()
        audit_log = None
        
        try:
            # 1. 参数校验
            validated_params = self.validate_params(tool_name, params)
            
            # 2. 查询凭证
            provider_name = tool_name.split('.')[0]  # e.g., 'jira' from 'jira.create_issue'
            credential = await persistence.credential.get_active_credential(
                provider=provider_name,
                owner_user_id=user_id
            )
            if not credential:
                raise CredentialNotFoundError(f"No credential for {provider_name}")
            
            # 3. 解密凭证
            decrypted_secret = decrypt_secret(credential.encrypted_secret)
            
            # 4. 创建审计日志（记录开始）
            audit_log = await persistence.audit_log.create(
                actor_user_id=user_id,
                event_type="tool_execution",
                source="api",
                action="tool.execute",
                resource_type="tool",
                resource_id=tool_name,
                tool_name=tool_name,
                status="running",
                request_id=request_id,
                request_json=params
            )
            
            # 5. 调用 Provider
            provider = ProviderRegistry.get(provider_name)
            result = await provider.call(
                tool_name=tool_name,
                params=validated_params,
                credentials=decrypted_secret
            )
            
            # 6. 更新审计日志（成功）
            latency_ms = int((time.time() - start_time) * 1000)
            await persistence.audit_log.update(
                audit_log.id,
                status="succeeded",
                response_json=result,
                latency_ms=latency_ms
            )
            
            return result
            
        except Exception as e:
            # 6. 更新审计日志（失败）
            latency_ms = int((time.time() - start_time) * 1000)
            await persistence.audit_log.update(
                audit_log.id,
                status="failed",
                error_message=str(e),
                latency_ms=latency_ms
            )
            raise
```

### 3.3 Provider 架构

**基类**：

```python
# app/provider/base.py

class BaseProvider(ABC):
    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials
        self.client = None  # 由子类实现初始化
    
    @abstractmethod
    async def initialize(self):
        """初始化客户端（SDK 创建、连接等）"""
        pass
    
    @abstractmethod
    async def get_tools(self) -> List[ToolInfo]:
        """返回该 Provider 支持的所有 Tool"""
        pass
    
    @abstractmethod
    async def call(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行指定工具"""
        pass
```

**Kubernetes 示例**：

```python
# app/provider/kubernetes/client.py

class KubernetesProvider(BaseProvider):
    async def initialize(self):
        """使用凭证初始化 K8s 客户端"""
        # 凭证格式: {"kubeconfig_path": "...", "context": "..."}
        # 或: {"api_server": "...", "token": "..."}
        from kubernetes_asyncio import config, client
        
        if "kubeconfig_path" in self.credentials:
            await config.load_kube_config(
                self.credentials["kubeconfig_path"]
            )
        else:
            # 使用 token 和 API 服务器
            await config.load_incluster_config()
        
        self.client = client.CoreV1Api()
    
    async def get_tools(self) -> List[ToolInfo]:
        return [
            ToolInfo(
                name="kubernetes.pod_diagnostics",
                description="获取 Pod 诊断信息（状态、事件、日志）",
                parameters=ToolParameter(
                    type="object",
                    properties={
                        "namespace": {"type": "string"},
                        "pod_name": {"type": "string"},
                        "include_logs": {"type": "boolean"}
                    },
                    required=["namespace", "pod_name"]
                )
            ),
            ToolInfo(name="kubernetes.cluster_info", ...)
        ]
    
    async def call(self, tool_name: str, params: Dict) -> Dict:
        if tool_name == "kubernetes.pod_diagnostics":
            return await self._pod_diagnostics(params)
        else:
            raise UnknownToolError(tool_name)
    
    async def _pod_diagnostics(self, params: Dict) -> Dict:
        """多步编排示例：获取 Pod 状态、事件、日志"""
        namespace = params["namespace"]
        pod_name = params["pod_name"]
        
        # 1. 获取 Pod 状态
        pod = await self.client.read_namespaced_pod(pod_name, namespace)
        pod_status = {
            "phase": pod.status.phase,
            "conditions": [c.dict() for c in pod.status.conditions or []]
        }
        
        # 2. 获取 Pod 事件
        events = await self.client.list_namespaced_event(namespace)
        pod_events = [
            e.dict() for e in events.items 
            if e.involved_object.name == pod_name
        ]
        
        # 3. 获取 Pod 日志（如果请求）
        logs = None
        if params.get("include_logs", False):
            logs = await self.client.read_namespaced_pod_log(pod_name, namespace)
        
        return {
            "pod_status": pod_status,
            "events": pod_events,
            "logs": logs
        }
```

### 3.4 APScheduler 集成

**关键原则**：
- **Beat 必须单独起**（生产环境）
- **Worker 可水平扩展**（多副本）
- **共享 PostgreSQL job store**，确保不重复执行

#### APScheduler 启动方式

#### 按需异步任务

```python
# app/scheduler/tasks.py

@scheduler.scheduled_job(trigger=None)  # 按需任务
async def process_alert(alert_id: str):
    """处理单个告警的异步任务"""
    alert = await persistence.alert.get(alert_id)
    
    try:
        # 执行诊断、补偿、通知逻辑
        result = await execute_alert_diagnostics(alert)
        
        # 回写状态
        await persistence.alert.update(
            alert_id,
            status="succeeded",
            result=result
        )
        
        # 审计日志
        await persistence.audit_log.create(
            event_type="alert_processing",
            resource_id=alert_id,
            status="succeeded"
        )
        
    except Exception as e:
        await persistence.alert.update(
            alert_id,
            status="failed",
            error=str(e)
        )
        raise

# API 调用时投递任务
async def create_alert(request: AlertRequest, user_id: str):
    # 1. 插入告警
    alert = await persistence.alert.create(
        source=request.source,
        severity=request.severity,
        status="pending"
    )
    
    # 2. 投递异步任务
    from app.scheduler import scheduler
    scheduler.add_job(
        process_alert,
        args=(str(alert.id),),
        id=f"process_alert_{alert.id}",
        replace_existing=True
    )
    
    # 3. 立即返回
    return {"alert_id": str(alert.id), "status": "pending"}
```

**定时任务**：

```python
# app/scheduler/scheduled_tasks.py

@scheduler.scheduled_job(trigger='cron', hour=0, minute=0)
async def k8s_pod_sync_hourly():
    """每小时同步一次 K8s Pod 信息"""
    # 从 task_schedulers 表查询任务定义（如需）
    task_def = await persistence.task_scheduler.get_by_name("k8s_pod_sync_hourly")
    
    try:
        # 执行同步逻辑
        result = await sync_kubernetes_pods()
        
        # 更新 task_schedulers
        await persistence.task_scheduler.update(
            task_def.id,
            last_run_at=datetime.now(),
            last_status="succeeded",
            run_count=task_def.run_count + 1
        )
    except Exception as e:
        await persistence.task_scheduler.update(
            task_def.id,
            last_status="failed",
            last_error=str(e)
        )
        raise
```

**调度器初始化与配置**：

```python
# app/scheduler/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.executors.pool import ThreadPoolExecutor

class SchedulerManager:
    """APScheduler 管理器"""
    
    _instance = None
    
    @classmethod
    def get_scheduler(cls) -> AsyncIOScheduler:
        if cls._instance is None:
            cls._instance = cls._init_scheduler()
        return cls._instance
    
    @staticmethod
    def _init_scheduler() -> AsyncIOScheduler:
        """初始化 APScheduler
        
        共享配置（Beat + Worker 都使用）：
        - PostgreSQL JobStore：持久化任务
        - 任务去重：coalesce=True（跳过错过的执行）
        - 单实例运行：max_instances=1（防止并发执行）
        """
        
        from app.config import settings
        
        # PostgreSQL JobStore
        jobstore = SQLAlchemyJobStore(
            url=settings.DATABASE_URL,
            tablename="apscheduler_jobs"
        )
        
        # 执行器配置
        executors = {
            "default": AsyncIOExecutor(),
            "threadpool": ThreadPoolExecutor(max_workers=10)
        }
        
        # 调度器配置
        scheduler = AsyncIOScheduler(
            jobstores={"default": jobstore},
            executors=executors,
            job_defaults={
                "coalesce": True,  # 合并错过的执行（不重复）
                "max_instances": 1  # 同一任务不并发
            },
            timezone="UTC"
        )
        
        return scheduler


# 启动 Beat 进程
def run_beat():
    """启动 APScheduler Beat
    
    职责：
    1. 从 task_schedulers 表加载所有启用的定时任务
    2. 按 cron_expr 定时触发任务
    3. 任务投递到 APScheduler job store
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    from app.persistence.task_scheduler import sql as task_sql
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        
        # 从 task_schedulers 表加载所有定时任务
        async with get_db() as db:
            enabled_tasks = await task_sql.list_enabled(db)
            
            for task_def in enabled_tasks:
                # 注册到 APScheduler
                scheduler.add_job(
                    execute_scheduled_task,
                    trigger='cron',
                    args=(task_def.id,),
                    id=task_def.id,  # 使用 task_id 作为 job id
                    replace_existing=True,
                    **parse_cron_to_kwargs(task_def.cron_expr)
                )
        
        # 启动 Beat
        scheduler.start()
        print("APScheduler Beat started")
    
    asyncio.run(main())


# 启动 Worker 进程
def run_worker():
    """启动 APScheduler Worker
    
    职责：
    1. 从 job store 获取待执行任务
    2. 执行任务代码
    3. 更新任务状态（成功/失败）
    """
    import asyncio
    from app.scheduler.scheduler import SchedulerManager
    
    async def main():
        scheduler = SchedulerManager.get_scheduler()
        scheduler.start()
        print("APScheduler Worker started")
        
        # Worker 持续运行，直到收到 SIGTERM
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            scheduler.shutdown()
    
    asyncio.run(main())


# 应用入口
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        run_worker()
    else:
        run_beat()