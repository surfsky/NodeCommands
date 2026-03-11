# NodeCommands

一组基于 Node.js 的命令行工具集。

## 特性

- **Word 转 PDF**: 将 Word 文档（.doc, .docx）批量转换为 PDF。
- **PDF 合并**: 将多个 PDF 文件合并为一个。

## 环境要求

- **Node.js**: v16 或更高版本
- **LibreOffice**: 必须安装，用于文档格式转换。

## 安装与使用

1. **克隆仓库**
   ```bash
   git clone https://github.com/surfsky/NodeCommands.git
   cd NodeCommands
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行工具**

   - **批量转换 Word 为 PDF**
     ```bash
     node toPdf.js [文件或目录...] --outdir=./output
     ```

   - **合并多个 PDF**
     ```bash
     node mergeToPdf.js [文件或目录...] --outfile=merged.pdf
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
