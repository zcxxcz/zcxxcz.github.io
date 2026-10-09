# 内容发布约定

- 本仓库是 zcxxcz.github.io 总入口。公开内容可由 agent 在检查通过后自动发布；用户明确要求仅草稿时不得发布。
- 首先阅读 README.md。新增文章/HTML/PDF 放 `content/<唯一slug>/`，复杂应用保留独立仓库。不得收录 morning-read、students-names。
- 每个任务使用独立分支/独立 worktree，从最新 main 开始；不得强制推送。只提交本任务文件，不自动提交用户或其他 agent 的改动。
- 内容默认 draft；正文、附件和元信息齐全后才设 published。不要复制整个个人知识库或任何私人数据。
- 不手动修改 dist、Pagefind 索引或汇总 catalog。每个内容独立元信息，目录自动生成。
- 列表筛选只认受控主题词（`scripts/build.mjs` 的 `TOPICS`：信奥 / 文章与资料 / 家庭游戏 / 英语）。每条内容的 `tags` 必须包含其中一个，其余 tags 视为自由关键词；要加新主题先改 `TOPICS`，否则内容点不到。
- 首页卡片分组、同系列合并（`cardGroups` / `seriesDefs`）与资料库折叠分组（`listGroups`）同样写在 `scripts/build.mjs`。卡片 id 缺失或未标 featured 时只跳过并告警，不中断构建。
- 发布前运行 npm test、npm run build；涉及页面/搜索变化时运行 npm run test:browser。Windows 与 macOS 均使用 Node 脚本。
- 提交后运行 npm run publish；检查成功即自动合并和上线，不要求重复人工确认。脚本要求 gh 已登录。
- 报告真实线上链接和发布状态。创建的 PR 应用当前 agent 提供的附件工具关联到聊天。
- 修改发布/索引公共脚本时，同步 templates 和已接入仓库的脚本；独立仓库的包名及原业务规则不变。
- 已有 URL 保持稳定。数据库变更与静态发布分开处理，不在发布工作流自动执行迁移。
