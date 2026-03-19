# Etsy688 Local - 项目说明

## 文件结构

etsy688-local/
├── server/
│   ├── index.js          # Express 服务端（API 接口）
│   ├── config.js          # 配置文件读/写
│   ├── db.js             # SQLite 数据库
│   ├── package.json
│   ├── uploads/          # 上传文件目录
│   └── public/
│       └── index.html     # 前端界面
└── README.md

## 快速启动

```bash
# 1. 安装依赖
cd etsy688-local
npm install

# 2. 配置 API Key（必填）
#    编辑 server/config.json 填入你的 Key

# 3. 启动服务
node server/index.js
#    服务地址：http://localhost:3001
#    前端：http://localhost:3001/admin（配置页）
```

## API Key 配置（server/config.json）

```json
{
  "replicate_token": "r8_xxx",
  "openai_key": "sk-xxx",
  "admin_pin": "1234"
}
```
