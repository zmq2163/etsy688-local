# Etsy688 Local - 产品规格说明书

## 1. 产品定位

**Etsy688 Local** 是一款面向内部团队使用的本地 AI 内容创作工具，完整复刻 etsy688.com 的全部功能，无需登录，开箱即用。所有外部 AI 服务 API Key 统一配置在服务端配置文件。

---

## 2. 技术架构

```
浏览器 (localhost:5173)
        │
        ▼
┌───────────────────┐
│   React SPA       │  ← 前端（Vite + React + TypeScript）
│   TailwindCSS    │
└────────┬──────────┘
         │ fetch / axios
┌────────▼──────────┐
│   Express.js      │  ← 后端（Node.js + Express）
│   REST API        │
└────────┬──────────┘
         │
    ┌────┴──────────────────┐
    │  better-sqlite3       │  ← 任务记录（SQLite）
    │  multer (文件上传)     │
    │  local fs (文件存储)   │
    └────────────────────────┘
         │
    ┌────┴────────────────────────┐
    │  AI 服务（可配置）          │
    │  • Stable Diffusion (Replicate)
    │  • GPT-4 (OpenAI)          │
    │  • 视频生成 (Replicate/Pika)
    └────────────────────────────┘
```

---

## 3. 功能模块

| # | 模块 | 说明 |
|---|------|------|
| A | 主生成器 | 上传产品图 + SEO 文案，一键生成场景图 |
| B | 视频创作 | 单张图生成动态商品展示视频 |
| C | 真人模特场景 | 产品图 + 场景 → AI 模特展示图 |
| D | 质感细节增强 | AI 超分辨率，提升图片清晰度 |
| E | 技术尺寸标注 | 自动在产品图上标注尺寸线 |
| F | 创意合成实验室 | 多图融合到同一商业场景 |
| G | 独立 SEO 工具 | 关键词 → 标题/描述/Tags |
| H | ⚙️ 系统配置 | 管理员配置 API Keys |

---

## 4. 功能详细规格

### 模块A：主生成器

**界面区域：**
- 3个拖拽上传区（正面图/侧面图/细节图），支持 JPG/PNG/WebP，≤10MB，最短边≥800px
- 尺寸选择：1:1 / 3:4 / 4:3 / 9:16 / 5:4（单选，默认1:1）
- 产品尺寸（可选）：长/宽/高输入框 + 单位切换（cm/inch）
- 场景风格：智能匹配 / 真人模特 / 家居场景 / Pinterest / Instagram / 自定义
- SEO关键词输入框 + 标题/描述/Tags 复选框开关
- [优化SEO文案] 按钮 + [开始生成场景图] 按钮

**输出：** PNG/JPG 场景图，宽度1200px，按比例计算高度

---

### 模块B：视频创作

**界面区域：**
- 单图拖拽上传（≤15MB，最短边≥600px）
- 创作提示词输入框（可选，最大300字符）
- 时长选择：5秒 / 10秒
- [立即开始生成] 按钮
- 进度条（实时显示，WebSocket推送）
- 视频播放器（静音自动循环播放）
- [下载MP4] [下载GIF] [重新生成]

**输出：** MP4 1080P 视频 + GIF（宽480px）

---

### 模块C：真人模特场景

**界面区域：**
- 产品白底图上传（推荐800px+，非白底自动抠图）
- 场景描述文本框（预填默认英文Prompt）
- 快速模板下拉：户外阳光 / 咖啡馆 / 卧室 / 街拍 / 影棚 / 自定义
- 输出尺寸（5选项）+ 生成数量（1~4张）
- [开始生成模特图] 按钮
- 网格展示区（2×2），每张：[下载] [重新生成] [换款生成]

**输出：** JPG 模特图，人脸已脱敏处理

---

### 模块D：质感细节增强

**界面区域：**
- 原图上传（≤10MB）
- 增强倍数：2x / 4x（单选）
- 输出尺寸（跟随比例）
- [生成高清特写] 按钮
- 左右对比展示（滑块对比工具）
- [下载高清图] [与原图对比] [重新生成]

---

### 模块E：技术尺寸标注

**界面区域：**
- 参照图上传
- 尺寸数值输入：长(L) / 宽(W) / 高(H)（L和W必填，H可选）
- 单位：cm / inch
- 标注样式：颜色（5色）/ 文字大小（小/中/大）
- 复选框：显示数值 / 显示尺寸名 / 显示对角线
- 输出尺寸
- [立即生成标注图] 按钮
- 标注图预览 + [下载] [重新生成] [切换单位]

---

### 模块F：创意合成实验室

**界面区域：**
- 4个产品图上传槽位（至少上传1张）
- 合成描述文本框（预填默认描述）
- 场景模板：极简白 / 家居 / 户外 / 自定义
- 输出尺寸 + 当前合成张数统计
- [开始合成] 按钮
- 结果大图展示 + [下载合成图] [下载各产品切割图] [重新合成]

---

### 模块G：独立SEO工具

**界面区域：**
- 产品关键词输入框（≥200字符）
- 3个功能模式卡片：关键词生成 / 链接分析 / 商品内容生成
- [开始生成] 按钮
- 结果分区展示：
  - 关键词列表（15个，可一键复制）
  - 标题建议（≤140字符，[复制]）
  - 描述内容（~150字符，[复制]）
  - Tags（13个，[一键复制全部]）

---

### 模块H：系统配置（管理员界面）

**路径：** `/admin` 或点击导航栏"配置"

**配置项：**
| 配置项 | 说明 |
|--------|------|
| STABLE_DIFFUSION_API_KEY | Replicate API Key |
| OPENAI_API_KEY | OpenAI API Key（GPT-4）|
| REPLICATE_API_TOKEN | Replicate Token |
| PIKA_API_KEY | Pika Labs API Key（视频）|
| 图片存储路径 | 本地存储目录 |
| 最大并发任务数 | 限制同时进行的AI任务 |
| 每日免费额度 | 无限制（内部使用）|

**特性：**
- 写入 `config.json` 文件（重启生效）
- 密码保护管理界面（简单PIN码，4位数字）
- API Key 以密文显示，带测试连接按钮
- 保存后显示"重启后生效"提示

---

## 5. 前后端接口约定

### 5.1 认证方式
- 无需登录
- 管理界面 PIN 码（简单本地验证，非JWT）
- 管理界面请求带上 `X-Admin-Pin` Header

### 5.2 文件上传接口
```
POST /api/upload
Content-Type: multipart/form-data
Body: { file: binary }
Response: { file_id, url, width, height, size }
```

### 5.3 任务接口
```
POST /api/generate/scene       → { task_id }
GET  /api/task/:id             → { status, progress, result_url, error }
```

### 5.4 SEO 接口
```
POST /api/seo/generate
Body: { keywords: string }
Response: { title, description, tags[] }
```

### 5.5 管理接口
```
GET    /api/admin/config       → { keys_public }
POST   /api/admin/config       → 更新 config.json
POST   /api/admin/verify-pin   → { valid: bool }
```

---

## 6. 数据模型

### 6.1 Task（任务表）
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,          -- scene/video/model/enhance/annotate/compose/seo
  status TEXT DEFAULT 'pending',-- pending/processing/completed/failed
  input_params TEXT,           -- JSON
  result_url TEXT,
  error TEXT,
  progress INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

### 6.2 Config（配置表 / 文件）
```json
{
  "stable_diffusion_key": "",
  "openai_key": "",
  "replicate_token": "",
  "pika_key": "",
  "admin_pin": "1234",
  "storage_path": "./uploads",
  "max_concurrent_tasks": 3
}
```

---

## 7. 验收标准

- [ ] 7个功能模块全部可用
- [ ] API Key 配置页面可正常保存/读取
- [ ] 无需登录即可使用所有功能
- [ ] 文件上传、任务提交、结果展示全流程跑通
- [ ] 视频生成有进度反馈
- [ ] SEO 文案生成正常输出
- [ ] 移动端界面基本可用
- [ ] 错误提示清晰，无控制台报错
