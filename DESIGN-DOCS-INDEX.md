# CI-Atlas Go 设计文档索引

## 📚 Go 文档清单

- **[go-design/ARCHITECTURE.md](go-design/ARCHITECTURE.md)** — Go 版本系统架构
  - Clean Architecture 分层
  - Port-Adapter 依赖倒置
  - API / MCP / Scheduler 交互

- **[go-design/DETAILED_DESIGN.md](go-design/DETAILED_DESIGN.md)** — Go 版本详细设计
  - Entity / Service / Adapter / Infra / App
  - 数据库结构与模块接口
  - 构建、部署与测试方案

- **[go-design/QUICK-START.md](go-design/QUICK-START.md)** — 快速开始
  - 技术栈速览
  - 初始化与开发命令
  - 阅读路径建议

- **[go-design/DEPENDENCIES-GUIDE.md](go-design/DEPENDENCIES-GUIDE.md)** — 依赖指南
  - go.mod 示例
  - 依赖选型说明
  - 配置与 SDK 建议

---

## 📖 推荐阅读顺序

1. 先读 [go-design/QUICK-START.md](go-design/QUICK-START.md)
2. 再读 [go-design/ARCHITECTURE.md](go-design/ARCHITECTURE.md)
3. 最后读 [go-design/DETAILED_DESIGN.md](go-design/DETAILED_DESIGN.md)

---

## 🛠️ Go 开发环境

```bash
cd go-design
# 查看文档并按文档中的 go mod 示例初始化项目
```

---

## 🔗 相关链接

- 参考项目：[gerrit/web-desgin/go-backend](../gerrit/web-desgin/go-backend)
- Go 设计目录：[go-design/](go-design/)
- MCP 规范：https://modelcontextprotocol.io/

