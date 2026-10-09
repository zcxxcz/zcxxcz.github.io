# 内容与作品

统一入口：**https://zcxxcz.github.io/**

公开课程、文章、工具和游戏的目录与中文全文搜索。现有应用保持独立仓库和原网址；新增 Markdown、HTML、PDF 放在本仓库。早读动物园与星球点名不收录。

## 在 Windows / macOS 上开始

安装 Git、Node.js 24 和 GitHub CLI，运行 `gh auth login`。两台电脑分别 clone；不要通过网盘同步 `.git` 或 `node_modules`。

```sh
gh repo clone zcxxcz/zcxxcz.github.io
cd zcxxcz.github.io
npm ci
git switch -c content/my-topic
npm run new -- my-topic "我的新内容" markdown
```

编辑 `content/my-topic/meta.json` 和 `body.md`。填好标题、简介、标签、日期；完成后把 `status` 从 `draft` 改成 `published`。图片和附件也放在该目录，使用相对路径。支持 `markdown`、`html`、`pdf`；HTML 编辑 `index.html`，PDF 添加 `document.pdf` 和 `search.txt` 文字稿。

```sh
npm test
npm run build
npm run preview
# 检查页面后，只提交本任务的文件：
git add content/my-topic
git commit -m "Publish my topic"
npm run publish
```

`npm run publish` 要求工作区干净且处于任务分支：推送分支 → 创建 PR → 等待云端检查 → 自动合并 → 等待 Pages 发布 → 验证网址。无需手工部署或更新索引。脚本不会自动暂存或提交其他 agent 的改动。不要使用 `npm publish`（那是发布 npm 软件包）。

遇到 main 更新，先 `git fetch origin`、`git merge origin/main`，解决冲突并重新验证，再运行发布命令。不做强制推送。并行任务分别使用 Git worktree 或独立 clone。

## 内容约定

- `content/<slug>/meta.json`：`id` 必须等于目录名；标题、简介、类型、标签、更新日期必填。`featured: true` 才出现在首页作品卡片。
- `tags` 里必须包含一个受控主题词（信奥 / 文章与资料 / 家庭游戏 / 英语），列表上方的筛选按钮由它自动生成并显示条数；其余 tags 作为自由关键词。新增主题需同时改 `scripts/build.mjs` 的 `TOPICS`。
- `status: draft` 不复制到公开产物；`status: published` 才上线。
- `format: markdown` 使用 `body.md`；`format: html` 使用原样发布的 `index.html`；`format: pdf` 使用 `file` 指定同目录附件。
- `search.txt` 可补充 PDF、图像演示的正文。无文字稿的 PDF 只索引简介，并在构建报告提示。
- 静态发布目录不包含 `meta.json`、Markdown 源文件及单独文字稿，但正文会进入公开搜索索引。
- 已发布 slug 保持稳定；需要改名时保留原 URL 的跳转页。

## 独立应用接入

每个已接入仓库包含 `publish.json`、`scripts/export_catalog.py`、`scripts/publish.mjs` 和 `.github/workflows/pages.yml`。应用按自身依赖构建，再导出公开 `catalog.json`。总入口在构建时读取这些目录，合成 Pagefind 中文索引。

新应用按照 `templates/INTEGRATION.md` 接入。第一次从新仓库运行发布脚本，会给总入口提交 `sites/<repo>.json` 注册 PR，等待检查并合并。后续发布成功自动触发总入口刷新。跨仓库触发使用操作者已有的 `gh` 登录，不在子仓库存放跨仓库令牌。

如果直接在 GitHub 网页合并或 `git push main`，项目会发布，但总索引依赖每天新加坡时间 06:23 的补漏同步（GitHub 调度可能延迟），也可以在本仓库 Actions → Publish Pages → Run workflow，或运行：

```sh
node scripts/publish.mjs --refresh-only
```

## 搜索与故障处理

课程多个讲稿合并成一条记录，默认链接到 PPT 对照页。应用只收录公开简介、使用手册，不读取登录后的数据。`catalog.json` 是版本 1 的公开接口，字段见模板。

PR 构建要求所有来源可用。日常刷新若单个来源临时不可用，使用线上上一次索引的对应记录，并在 Actions Summary 和 `build-report.json` 提示；首次发布无旧记录则失败。全部构建完成才替换线上版本。发布命令遇到索引降级会报告失败状态，不声称完全同步成功。

回滚：新建任务分支，`git revert <错误提交>` 后运行发布命令。独立应用回滚后仍需刷新总入口。数据库迁移不属于这个静态发布流程。

## 验证

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

检查重复 ID/URL、缺图、内部死链、中文搜索、分类筛选、桌面与手机布局。GitHub Actions 额外在 Windows 上验证 Node 脚本、构建和搜索。所有运行时、依赖以 workflow 和 lockfile 为准。
