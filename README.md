# NodeCommands

一组基于 Node.js 的命令行工具与本地 Web 工具集。

## 特性

- **Word 转 PDF**: 将 Word 文档（.doc, .docx）批量转换为 PDF。
- **PDF 合并**: 将多个 PDF 文件合并为一个。
- **文件查找**: 在指定目录下递归列出文件。
- **文本查找**: 在指定目录下递归查找包含特定文本的文件。
- **Web 控制台**: 在浏览器中调用本地 API，统一入口执行工具。

## 目录结构

```text
.
├── server/              # 本地 Web/API 服务
│   └── app.js
├── wwwroot/             # 前端页面（index/listfiles/topdf/components）
├── listfiles.js         # CLI: 列目录
├── toPdf.js             # CLI: Word 转 PDF
├── mergeToPdf.js        # CLI: PDF 合并
├── search.js            # CLI: 文本查找
└── utils.js
```

## 环境要求

- **Node.js**: v16 或更高版本
- **LibreOffice**: 必须安装，用于文档格式转换。

## 安装与使用

1. **克隆仓库**
   ```bash
   git clone https://github.com/surfsky/NodeCommands.git
   cd NodeCommands
   npm install
   ```

2. **运行 CLI 工具**

```bash
# 批量转换 Word 为 PDF
node toPdf.js [文件或目录...] --outdir=./output

# 合并多个 PDF
node mergeToPdf.js [文件或目录...] --outfile=merged.pdf

# 列出文件
node listfiles.js [目录]

# 查找文本
node search.js [目录] [文本]
```

3. **运行 Web 工具（推荐）**

```bash
npm start
# 或
npm run start:web
```

打开浏览器访问：

```text
http://127.0.0.1:5600
```

## 开发

欢迎参与项目贡献！请遵循以下步骤：

1. **Fork** 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 **Pull Request**

## 许可证

本项目采用 MIT 许可证。详情请见 `LICENSE` 文件。
