## ComfyUI-CC-ImageLoader

### 📝 简介

**ComfyUI-CC-ImageLoader** 是一个增强型图片加载节点,专为 ComfyUI 设计。基于 [ComfyUI-Thumbnails](https://github.com/audioscavenger/ComfyUI-Thumbnails) 和 [ComfyUI_Local_Media_Manager](https://github.com/Firetheft/ComfyUI_Local_Media_Manager) 两个优秀项目的开发而来。

### ✨ 核心特性

#### 🚀 性能优化
- **虚拟滚动技术**: 只渲染可见区域的图片,支持数千张图片流畅浏览
- **缩略图缓存**: WebP 格式缩略图,基于 MD5 的智能缓存机制
- **瀑布流布局**: 自适应多列布局,充分利用屏幕空间
- **懒加载**: 图片按需加载,减少内存占用

#### 📁 文件管理
- **路径导航**: 支快速切换文件夹
- **星级评分**: 1-5 星评分系统
- **标签系统**: 为图片添加标签,支持批量编辑
- **批量操作**: 批量删除、标签编辑
- **排序功能**: 按名称、日期、评分排序

### 📦 安装方法

#### 方法 1: Git Clone (推荐)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/henjicc/ComfyUI-CC-ImageLoader.git
```

#### 方法 2: 手动安装
1. 下载项目压缩包
2. 解压到 `ComfyUI/custom_nodes/ComfyUI-CC-ImageLoader`
3. 重启 ComfyUI

### 🎮 使用说明

1. 启动 ComfyUI
2. 添加**加载图像**节点即可，直接作用于 ComfyUI 原生加载图像节点

### 📊 项目架构

```
ComfyUI-CC-ImageLoader/
├── __init__.py                 # 节点注册
├── LoadImageEnhanced.py        # 后端核心逻辑
├── web/                        # 前端资源
│   ├── js/
│   │   └── imageloader_enhanced.js
│   └── css/
│       └── imageloader_enhanced.css
├── .cache/                     # 缓存目录(自动创建)
│   └── thumbnails/             # 缩略图
├── config.json                 # 配置文件(自动创建)
└── metadata.json               # 元数据(自动创建)
```

### 🙏 致谢

本项目参考并融合了以下优秀项目的设计理念:
- [ComfyUI-Thumbnails](https://github.com/audioscavenger/ComfyUI-Thumbnails) - 缩略图显示和文件夹支持
- [ComfyUI_Local_Media_Manager](https://github.com/Firetheft/ComfyUI_Local_Media_Manager) - 高性能虚拟滚动和元数据管理