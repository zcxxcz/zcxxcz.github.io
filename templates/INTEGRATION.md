# 独立项目接入模板

适用于 zcxxcz 的公开 GitHub Pages 项目。私有资料、登录数据不进入目录。

1. 在项目根目录创建 `publish.json`，参照下方协议；显式列出公开的搜索记录。每条记录的 ID 在总入口全局唯一。
2. 从总入口复制 `scripts/publish.mjs`、`scripts/export_catalog.py`、`scripts/verify_public.py`。package.json 添加 `"publish": "node scripts/publish.mjs"`。
3. 新建 `.github/workflows/pages.yml`，名称必须为 `Publish Pages`。参考 `zcxxcz/eileen-magic-pets` 的工作流，使用 PR 验证、main 推送部署、workflow_dispatch 手工重发。
4. 构建完成后运行 `python scripts/export_catalog.py dist/catalog.json` 和 `python scripts/verify_public.py dist`；只上传实际公开目录，不上传项目根目录、环境文件或源数据。
5. GitHub Settings → Pages 设置 GitHub Actions；前端公开配置放 Variables，服务端密钥不要打包到静态站。构建变量缺失必须失败。
6. 在干净任务分支提交，运行 `npm run publish`。首次发布会自动注册到总入口并刷新索引，后续无需重复登记。

```json
{
  "version": 1,
  "catalog": "https://zcxxcz.github.io/my-app/catalog.json",
  "records": [
    {
      "id": "my-app",
      "title": "应用名称",
      "type": "应用",
      "summary": "一句话说清用途",
      "tags": ["英语"],
      "url": "https://zcxxcz.github.io/my-app/",
      "updated": "2026-10-07",
      "featured": true,
      "textPaths": ["public/manual.html"]
    }
  ]
}
```

`textPaths` 只允许仓库内明确公开的文件，可为空。导出后该字段替换为 `text`，HTML 优先提取 article 正文、排除导航与脚本。目录输出为 `{ "version": 1, "records": [...] }`；记录字段为 id/title/type/summary/tags/url/updated/featured/text。总入口为记录增加 source，并输出 generated/warnings。

应用有多个作品时列出多条记录。不同版本讲稿可以放同一记录的多个 textPaths 中，生成时去掉重复段落，只保留一个访问 URL。
