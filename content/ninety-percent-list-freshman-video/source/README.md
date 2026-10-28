# 制作说明

成片：19:37，1920×1080，H.264 / AAC，24 fps（原理图以12 fps绘制）。
中文合成配音：Microsoft Edge `zh-CN-YunxiNeural`，以 edge-tts 生成；字幕由语句时间边界生成，长句按短语长度细分，语句内切分为近似对齐。

## 内容依据

清单来源：https://github.com/zxygentoo/the-ninety-percent-list
核对版本：e823e3ff46c43f044cb65f8e0cb2eedfdaabd205，核对日：2026-10-28。
各条目的原始材料链接保存在 `../lesson.json` 中。本视频未复现论文实验，所有曲线和图示为独立绘制的教学示意。

## 本地重新制作

需要 Python 3、Pillow、edge-tts、FFmpeg（带 libx264）及 ffprobe。安装依赖时建议使用独立虚拟环境。
画面默认使用 macOS STHeiti 字体；其他系统可通过 `FONT_CJK` 指定本地中文字体文件。

```sh
python make_audio.py /absolute/work/audio
python render.py /absolute/work --preview
python render.py /absolute/work
```

把 `lesson.json` 保持在本目录上一级；音频和临时片段均保存在 work 目录。渲染中断可继续，已有片段会复用；修改讲稿、配音或画面后，应先移走相关缓存片段再渲染。

来源清单以 MIT 协议发布。中文讲稿、原理示意图与动画为本视频独立创作；未使用论文原图、商业配乐或他人视频片段。原始材料权利归各作者。
