# Local Mode 本地部署方案设计

## Context

新增 $10/月 的 "Local" 套餐（与 Basic 同价），让用户通过 Colima + Docker 在自己的 macOS/Linux 机器上运行 OpenClaw。本地模式的核心优势：零云端计算成本、数据完全本地化、可操作 Chrome 插件钱包（MetaMask）。

## 架构决策：混合模式

用户仍然通过云端 Backend 注册账号、创建 Bot、付费（$10/月），但 **运行时完全在本地**。不需要本地部署 Runtime Provisioner，CLI 脚本直接操作 Docker。Dashboard 操作体验与云端一致（Start/Stop/Delete 按钮正常使用）。

```
┌─────────────────────────────────┐
│  Cloud Backend (billing, auth)  │
│  clawup.org                     │
└──────────┬──────────────────────┘
           │ heartbeat API
           │ (status, gateway_url)
┌──────────▼──────────────────────────────────┐
│  User's Machine (Colima + Docker)           │
│  clawup-local.sh 直接管理容器（无 Provisioner）│
│                                              │
│  ┌─ OpenClaw 容器 ─────────────────┐        │
│  │  localhost:18789 (gateway)       │        │
│  │  ↕ MCP 协议                     │        │
│  │  mcporter bind → 签名桥 App      │        │
│  └──────────────────────────────────┘        │
│                                              │
│  ┌─ MetaMask 签名桥 MCP App 容器 ──┐        │
│  │  localhost:18790                  │        │
│  │  WebSocket → 用户浏览器 → MetaMask│        │
│  └──────────────────────────────────┘        │
│                                              │
│  $HOME/.clawup/ (data + backups)             │
│  Chrome 浏览器打开签名桥页面（保持连接）        │
└──────────────────────────────────────────────┘
```

## 关键设计决策

### 隔离级别
Local plan 使用 `isolation: "standard"`（与 Basic 相同），通过 `bot.plan == Local` 区分本地 bot。不引入新的 isolation 类型。

### Start/Stop 异步化
所有 bot 操作（create/start/stop）均为异步模式：
- 立即返回 `202 Accepted` + `job_id`
- 后台 `tokio::spawn` 执行实际操作
- 通过 job message 更新进度（前端 poll job 状态）
- 失败时回滚 bot 状态 + 设 `last_error`

这对云端和本地模式都适用，解决了 ACK 模式下 start/stop 耗时长导致前端超时的问题。

### 余额前置检查
`create_bot` 和 `start_bot` 均检查用户余额是否覆盖至少一个月费周期。Free plan（月费=0）不受影响。

### Reconcile 保护
Reconcile loop 不会覆盖被并发操作（stop/delete）修改的 bot 状态：
- 排除有 in-flight `bot_stop` job 的 bot
- 排除 `Stopped` / `Deleted` 状态的 bot
- 写回状态时检查当前状态是否仍为 reconcile 可管理的状态

## 1. 套餐配置

**`backend/plans.json`** — `"local"` plan：
```json
"local": {
  "limits": {
    "allow_advanced_mode": false,
    "isolation": "standard",
    "monthly_price": "10",
    "audience": "users running OpenClaw locally via Colima + Docker (macOS/Linux)",
    "compute_hourly_cents": 0.0,
    "storage_gb_hourly_cents": 0.0,
    "monthly_cap_cents": 1000
  }
}
```

计费：$10/月平台费（与 Basic 同价），不收计算/存储费用（用户自供硬件）。

## 2. Backend 改动

### Bot 生命周期（`bots.rs`，异步模式）
- **create_bot**：返回 202 + job_id，后台 tokio::spawn 执行 provision
- **start_bot**：返回 202 + job_id，后台执行 provisioner start + app rebind
- **stop_bot**：返回 202 + job_id，后台执行 backup → provisioner stop
- 所有操作先设 `status = Reconciling`，通过 job.message 更新进度

### 余额检查
- `create_bot`：`plan_monthly_fee > 0 && balance < fee` → 402 INSUFFICIENT_BALANCE
- `start_bot`：同上

### Bootstrap 响应优化
- `auth_bootstrap` 返回 `deploy_account_options`，前端首次渲染即可显示

## 3. Runtime Provisioner 改动

### 代码架构（重构后）
```
runtime-provisioner/
├── main.go              — server struct, HTTP handlers, types (2500 行)
├── docker_backend.go    — Docker 容器操作 (dockerProvision, execInRuntime, restore)
├── ack_backend.go       — Kubernetes/ACK 操作
├── gateway.go           — Gateway 健康检查/reload/verify/auto-fix
├── oss.go               — OSS 存储操作
├── scripts.go           — Shell 脚本构建（引用 embedded .sh 文件）
├── helpers.go           — 工具函数
├── scripts/
│   ├── openclaw-bootstrap.sh    — 容器启动脚本
│   ├── configure_openclaw.sh    — 配置写入脚本
│   ├── mcporter_bind.sh         — MCP App 绑定脚本
│   ├── model_auth_paste.sh      — 模型认证脚本
│   └── restore_openclaw.sh      — 恢复脚本（curl --retry 下载）
└── *_test.go            — 275+ 单元测试 + flow 测试
```

### Restore 流程
- 共享逻辑 `resolveRestoreParams()` → Docker / ACK 各自执行
- Restore 参数持久化到 `Bot` struct（create_failed 重试不丢失）
- 成功后 `configureOpenclawRuntime` 使用 `OPENCLAW_CONFIG_APPLY_MODE=merge`
- 成功后清除 restore 参数

### Gateway 兼容性保障
1. **bootstrap.sh**：启动前修补 `gateway.bind=lan` + `http.endpoints`
2. **waitReadyAfterReload**：POST `/v1/chat/completions` 硬验证
3. **auto-fix**：404 → `patchGatewayHTTPEndpoints`（纯 Go 实现）→ reload → 重验证
4. 所有函数支持 ACK 模式（`ack.execInRuntime` / `ack.reloadGateway`）

### Backup 改进
- **ACK 模式**：改用 presigned PUT URL，pod 内 `tar | curl PUT` 直传 OSS
- **Stop 前 backup**：必须成功（重试 3 次），失败则 abort stop（OSS 启用时）
- **背景 context**：provision/start 的长时间操作使用 `context.Background()`，不被 HTTP 超时打断

## 4. 本地备份

替代 OSS，使用本地文件系统：
- **stop 时自动备份**：`tar czf $HOME/.clawup/backups/$(date +%Y%m%d-%H%M%S).tar.gz -C $HOME/.clawup/data .`
- **start 时可选恢复**：从最新备份解压
- **保留最近 5 份**，自动清理旧备份

## 5. MetaMask 签名桥

### 实现方式
签名桥已实现为独立 Node.js 应用（`metamask-bridge/`），随 CLI 自动拉起：

```
metamask-bridge/
├── server.js       — MCP Server (SSE) + WebSocket Server
├── public/
│   └── index.html  — 签名桥前端（WebSocket → window.ethereum → MetaMask）
├── package.json
└── Dockerfile
```

### MCP Tools
| Tool | 说明 |
|------|------|
| `get_accounts` | 获取 MetaMask 账户地址列表 |
| `sign_transaction` | 交易签名 → MetaMask 弹窗 → 返回 txHash |
| `sign_message` | personal_sign 消息签名 |
| `sign_typed_data` | EIP-712 签名（x402 DELEGATE） |
| `get_chain_id` | 当前网络 |
| `switch_chain` | 切换网络 |

## 6. CLI 脚本

**`scripts/clawup-local.sh`**

```bash
clawup-local.sh start    # 安装 Colima + 拉镜像 + 启动容器 + 签名桥 + 心跳
clawup-local.sh stop     # 自动备份 + 停止容器 + 签名桥
clawup-local.sh status   # 显示 OpenClaw + 签名桥状态
clawup-local.sh backup   # 手动备份
clawup-local.sh restore  # 从最新备份恢复
```

## 7. 当前实现状态

| 组件 | 状态 |
|------|------|
| Local plan 配置 (`plans.json`) | ✅ 已实现（$10/月，isolation=standard） |
| 异步 start_bot / stop_bot | ✅ 已实现（对所有模式生效） |
| 余额前置检查 | ✅ 已实现 |
| Reconcile 保护（stop/delete 并发安全） | ✅ 已实现 |
| Provisioner 拆分重构 + 275+ 测试 | ✅ 已实现 |
| Gateway HTTP endpoint 验证 + auto-fix | ✅ 已实现 |
| Gateway SIGUSR1 draining 保护 | ✅ 已实现（channels 临时禁用 + retry） |
| Restore 参数持久化 + merge 模式 | ✅ 已实现 |
| ACK backup presigned PUT | ✅ 已实现 |
| Bootstrap deploy_account_options | ✅ 已实现 |
| 签名桥 MCP App (`metamask-bridge/`) | ✅ 已实现 |
| CLI 脚本 (`clawup-local.sh`) | ✅ 已实现 |
| 前端性能优化（lazy-load + next/image） | ✅ 已实现 |
| Local plan 前端 UI（BOT_GUIDES 等） | 🔲 待集成 |
| Local heartbeat 端点 | 🔲 待集成 |
| MCP Registry `local_only` 字段 | 🔲 待实现 |

## 8. 前端性能优化

| 优化 | 效果 |
|------|------|
| Panel 懒加载（Nodes/Billing/PublicHome） | 首屏 JS 减少 ~30%，非 admin 用户不加载 Nodes 1668 行 |
| next/image 自动 WebP/AVIF | 3MB PNG → ~300KB WebP，自动 srcset 响应式 |
| Cache-Control headers | 静态资源 immutable 1年，图片 1天 + stale-while-revalidate 7天 |
| compress: true | gzip 压缩 |

### 文件结构
```
frontend/src/app/
├── page.tsx           — 主组件 (6650 行，从 8700 减)
├── panels/
│   ├── Nodes.tsx      — Admin 节点管理 (1668 行，dynamic import)
│   ├── Billing.tsx    — 计费面板 (777 行，dynamic import)
│   └── PublicHome.tsx — 公开首页 (503 行，dynamic import + next/image)
├── login/page.tsx     — 登录页
└── components/        — 公共组件
```

## 9. 已解决的技术问题

| 问题 | 根因 | 修复 |
|------|------|------|
| Chat 返回 GATEWAY_NOT_READY | 备份恢复后 `gateway.http.endpoints` 缺失 | bootstrap 修补 + provisioner 硬验证 + auto-fix |
| Chat 返回 HTML 而非 API | `gateway.bind = loopback`（来自旧备份） | bootstrap 强制 `bind=lan` |
| **Gateway 永久卡在 draining** | **SIGUSR1 in-process restart 时 Telegram channel 重连失败（401），gateway 无法退出 draining** | **SIGUSR1 前临时移除 channels 配置，restart 后恢复 + 第二次 SIGUSR1** |
| **双 SIGUSR1 导致 draining 死锁** | **chat endpoint 验证 404 后立即发第二次 SIGUSR1 打断第一次 restart** | **verifyChatEndpoint 重试 5 次（间隔 3/6/9/12s），确保第一次 restart 完成后再考虑 auto-fix** |
| Delete 后 bot 变回 Running | Reconcile loop 用旧 snapshot 覆盖状态 | 排除 in-flight stop job + 状态写回保护 |
| Stop 后 bot 变回 Running | Async stop_bot 设 Reconciling 后被 reconcile 覆盖 | 三层保护：排除 in-flight stop job / 排除 Stopped / 状态写回白名单 |
| Stop 后 start 丢失数据 | Stop backup 失败但仍 stop 了 pod（ACK 销毁 pod） | Backup-must-succeed gate + 重试 3 次 |
| ACK backup 超时 | kubectl exec stdout 传 80MB tar 太慢 | 改用 presigned PUT URL 直传 OSS |
| Start 超时 bot 卡 Stopped | start_bot 同步等 provisioner 60+秒，前端 timeout | start_bot 改异步 + provisioner 用 background context |
| Restore 成功但数据被覆盖 | configureOpenclawRuntime 用 replace 模式覆写 | Restore 后用 `OPENCLAW_CONFIG_APPLY_MODE=merge`，script 内 `export` |
| Restore 失败后重试丢参数 | restore params 没持久化到 Bot struct | 存到 Bot + 成功后清除 |
| patchGatewayHTTPEndpoints 找不到文件 | 硬编码 `/home/node/.openclaw` | glob 搜索 `/home/*/.openclaw` + `/root/.openclaw` |
| ACK 模式 exec 报 docker runtime required | verifyChatEndpoint/reloadRuntimeGateway/patchGateway 没有 ACK 分支 | 所有 exec 函数加 ACK 分支 |
| 前端 deploy account 下拉框延迟出现 | 数据在异步 refresh 中加载 | 合并到 bootstrap 响应 |
| OSS restore 下载中途断开 | curl 管道模式无法重试 | 下载到临时文件 + curl --retry 3 |
| 0 余额可创建 bot | create_bot/start_bot 无余额检查 | 月费 > 0 且余额不足时返回 402 |
