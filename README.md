# DISF Frontend

图片优先的证据库前端（Vue 3 + Vite + Element Plus）。

本仓库**只包含前端**。后端、算法仓库、权重和实验数据请自行准备并对接，不要提交到本仓库。

## 克隆与启动

```bash
git clone https://github.com/Comui520/DISF.git
cd DISF
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173`。

开发服务器会把 `/api` 代理到 `http://127.0.0.1:8000`。请自行启动兼容的后端，或修改 `vite.config.js` 中的代理地址。

## 对接说明

前端通过 `/api` 访问后端。需要自行组装的接口包括（按页面使用情况）：

- `GET /api/health`
- `GET /api/models`
- `GET /api/labels`
- `GET /api/artifacts/images`
- `GET /api/files/{path}`
- `GET /api/similarity`、`/api/similarity/matrix`
- `GET /api/diff-map`、`/api/diff-map/pairs`
- `GET /api/fuzzing/results`
- `GET|POST /api/tasks` 及任务日志 / 停止

请使用自己的路径与环境配置，不要把本机绝对路径、密钥、数据集或模型权重放进本仓库。

可选：仅预览布局时（Windows PowerShell）

```powershell
$env:VITE_DEMO_MODE="true"; npm run dev
```

页面会标明「示例数据」，不能当作真实实验结果。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建结果 |
| `npm run test:unit` | 单元测试 |
