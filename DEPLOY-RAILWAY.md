# Etsy688 Local — 部署到 Railway（免费）

## 方案A：Railway 部署步骤

### 第一步：准备 GitHub 仓库

**方法一：快速上传（推荐）**

1. 打开 https://github.com/new 新建仓库，名称填 `etsy688-local`，选择 Private，点击 Create

2. 下载项目压缩包，通过 GitHub 网页上传：
   - 打开新建的仓库 → Add file → Upload files
   - 把 `/workspace/etsy688-local/` 下的所有文件拖进去
   - 注意：**不要上传 `node_modules` 文件夹**（太大，会超时）
   - Commit changes

**方法二：Git 命令行**

```bash
# 在项目根目录执行（注意不是 server 目录）
cd /workspace/etsy688-local
rm -rf node_modules
git init
git add .
git commit -m "Etsy688 Local v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/etsy688-local.git
git push -u origin main
```

---

### 第二步：连接 Railway

1. 打开 https://railway.app 并登录（推荐用 GitHub 账号）
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择刚才创建的 `etsy688-local` 仓库
4. Railway 会自动识别为 Node.js 项目

---

### 第三步：配置环境变量（关键！）

在 Railway 项目面板 → **Variables**，添加：

```
PORT=3001
NODE_ENV=production
```

**可选 — 配置 API Key（激活AI功能）：**

```
REPLICATE_TOKEN=r8_xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
ADMIN_PIN=1234
```

> 💡 不配置 Key 也可以部署，但 AI 功能不可用。
> Key 配置后可随时在 Railway Variables 中添加。

---

### 第四步：部署

1. 点击 **Deploy Now**
2. 等待构建完成（约2-3分钟）
3. 部署成功后，Railway 会分配一个公共 URL：
   ```
   https://etsy688-local.up.railway.app
   ```

---

### 第五步：验证

- 主界面：`https://your-app.up.railway.app`
- 配置面板：`https://your-app.up.railway.app/admin`（PIN：1234）

---

## API Key 获取（免费）

### Replicate Token（必需SDXL+视频）
1. 打开 https://replicate.com/account/api-tokens
2. 点击 Create API token
3. 复制 token，格式：`r8_xxx`
4. 最低成本：约 **$0.002/张图片**

### OpenAI API Key（SEO功能）
1. 打开 https://platform.openai.com/api-keys
2. Create new secret key
3. 复制 key，格式：`sk-xxx`
4. GPT-4o-mini 成本：约 **$0.0001/次SEO生成**

---

## 项目结构

```
etsy688-local/
├── server/
│   ├── index.js          # Express 服务端（所有API）
│   ├── config.js         # 配置文件读/写
│   ├── db.js            # SQLite 数据库
│   ├── uploads/         # 上传文件目录（自动创建）
│   └── public/
│       ├── index.html     # 前端界面（7个模块）
│       └── test-report.html # 测试报告
├── package.json
├── Procfile              # Railway 启动文件
└── railway.json          # Railway 配置
```

---

## 功能模块

| 模块 | 功能 | AI模型 |
|------|------|--------|
| 🖼️ 主生成器 | 产品图→商业场景图 | SDXL via Replicate |
| 🎬 视频创作 | 产品图→动态视频 | Zeroscope via Replicate |
| 👤 模特场景 | 白底图→模特穿戴图 | SDXL via Replicate |
| 🔍 质感增强 | 2x/4x 超分辨率 | Real-ESRGAN via Replicate |
| 📐 尺寸标注 | Canvas自动标注尺寸线 | 纯前端无需Key |
| 🧪 创意合成 | 多图融合商业场景 | SDXL via Replicate |
| 📊 SEO工具 | 标题+描述+Tags生成 | GPT-4o-mini via OpenAI |

---

## 费用说明

| 项目 | 费用 |
|------|------|
| Railway 托管 | **免费**（每月$5额度，个人项目够用） |
| Replicate SDXL | ~$0.002/张 |
| Replicate 视频 | ~$0.01/条 |
| OpenAI GPT-4o-mini | ~$0.0001/次SEO |

**月均成本：有量就付，无量就零**
