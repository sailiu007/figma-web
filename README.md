# Atlas

Atlas 是一个 Python First 的 MCP Gateway 原型，包含：

- FastAPI API Gateway
- PostgreSQL 持久化
- Redis + Celery 异步任务
- 代码优先的 Tool Registry 自动发现
- RBAC / Credential / Tool Invocation 基础模型

## 环境变量

复制 `.env.example` 为 `.env`，按需调整：

```bash
cp .env.example .env
```

新增外部集成配置：

- `ATLAS_PUSHGATEWAY_URL`: Prometheus Pushgateway 地址
- `ATLAS_KUBECONFIG_PATH`: 可选，指定 kubeconfig 路径
- `ATLAS_KUBERNETES_CONTEXT`: 可选，指定 kubeconfig context
- `ATLAS_JENKINS_BASE_URL`: Jenkins 基础地址
- `ATLAS_JENKINS_USERNAME`: Jenkins 用户名
- `ATLAS_JENKINS_API_TOKEN`: Jenkins API Token

## 安装依赖

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

## 运行 API

```bash
uvicorn app.main:app --reload
```

## 运行前端

```bash
cd frontend
npm install
npm run dev
```

默认通过 Vite 代理把 /api 和 /healthz 转发到 http://127.0.0.1:8000。
如果后端不在这个地址，可以设置环境变量 VITE_ATLAS_PROXY_TARGET，或者在页面顶部直接填写 API Base URL。

## 运行 Worker

```bash
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

## 默认种子数据

应用启动会创建：

- tenant: `atlas`
- user: `admin`
- role: `platform_admin`

可以通过请求头覆盖上下文：

- `X-Atlas-User-Id`
- `X-Atlas-Tenant-Id`

如果不传，默认使用种子用户。

## 内置观测工具

Atlas 现在内置了三类同步工具：

- `prometheus.pushgateway_push_metrics`: 推送业务指标到 Prometheus Pushgateway
- `kubernetes.pod_diagnostics`: 查询 Kubernetes Pod 状态并提取异常日志
- `jenkins.pipeline_diagnostics`: 拉取 Jenkins 流水线日志并抽取异常行

外部系统逻辑按 connector 拆分，位于：

- `app/connectors/prometheus`
- `app/connectors/kubernetes`
- `app/connectors/jenkins`

其中 `client.py` 保持为可独立复用的对接逻辑，`tools.py` 只负责 Atlas 内的 Tool Registry 注册。
实现上优先使用外部系统对应的三方库来完成功能，例如 Kubernetes Python Client、Prometheus Python Client、python-jenkins，而不是把 connector 退化成手写 HTTP API 拼装层。
