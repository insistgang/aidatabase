# AI 数据库学习航海

基于 React、TypeScript、Vite 和 Tailwind CSS 的数据库课程闯关应用。项目包含：

- 9 个学习关卡和 230 道题目
- 按玩家姓名保存的本地学习进度
- 学习事件采集与管理后台
- GitHub Pages 和 Surge 静态部署配置
- FastAPI + SQLite 学习数据服务

## 本地开发

前端需要 Node.js 20 或更高版本，学习数据服务支持 Python 3.9 或更高版本。

```bash
npm ci
npm run dev
```

默认地址为 `http://localhost:3000`，管理后台为 `http://localhost:3000/#/admin`。

## 质量检查

```bash
npm run lint
npm test
npm run build
```

`npm test` 包含玩家存档测试、构建目标配置测试和后端安全逻辑测试。

## 部署目标与学习数据采集

本项目有两类部署目标，**构建产物不同**，请勿混用：

| 构建脚本 | 部署目标 | API 基址 | 学习事件上报 | 管理后台 |
|---|---|---|---|---|
| `npm run build:github` | GitHub Pages（`insistgang.top/aidatabase/`） | 空（禁用） | 不可用 | 不可用 |
| `npm run build:selfhost` | 自建站（`aidatabase.insistgang.top`） | `/learning-api`（相对路径） | 可用 | 可用 |
| `npm run build:surge` | Surge 静态托管 | 空（禁用） | 不可用 | 不可用 |

说明：

- GitHub Pages 是**纯静态托管**，没有同源后端。若保留默认的 `/learning-api` 相对路径，前端请求会稳定收到 404。因此 `build:github` 显式把 `VITE_LEARNING_API_BASE_URL` 置空，前端据此**优雅降级**为不上报（页面显示「当前静态部署未配置学习数据后台 API」）。
- 自建站由 nginx 将 `/learning-api/` 反向代理到 FastAPI（见 `server/nginx`），因此 `build:selfhost` 使用相对路径 `/learning-api`，可获得同源请求，**学习事件采集与管理后台均可用**。
- **直接用 `build:github` 的产物覆盖自建站，会导致自建站丢失采集能力**（API 基址被编译为空）。自建站请使用 `build:selfhost` 产物。
- 后端**未配置 CORS**，因此不建议让 Pages 版跨域调用自建站后端（`application/json` 属非简单请求，会触发预检并失败）。

## 学习数据服务

服务代码位于 `server/learning-api`，生产依赖记录在
`server/learning-api/requirements.txt`。

必要环境变量：

- `ADMIN_TOKEN`：管理后台访问口令
- `DATA_DIR`：SQLite 数据目录，默认 `/var/lib/aidatabase-learning`

可选安全配置：

- `EVENT_RATE_LIMIT_PER_MINUTE`：单 IP 每分钟事件上限，默认 `120`
- `MAX_EVENT_REQUEST_BYTES`：事件请求体上限，默认 `16384`
- `MAX_STORED_EVENTS`：数据库最多保留事件数，默认 `200000`

生产部署示例位于 `server/nginx` 和
`server/learning-api/aidatabase-learning-api.service`。
