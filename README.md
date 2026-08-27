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

`npm test` 包含玩家存档测试和后端安全逻辑测试。

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
