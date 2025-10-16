# ComfyUI-CC-ImageLoader

[English](#english) | [中文](#中文)

---

## 中文

### 📝 简介

**ComfyUI-CC-ImageLoader** 是一个增强型图片加载节点,专为 ComfyUI 设计。它融合了 **ComfyUI-Thumbnails** 和 **ComfyUI_Local_Media_Manager** 两个优秀项目的优势,提供高性能的图片浏览和管理功能。

### ✨ 核心特性

#### 🚀 性能优化
- **虚拟滚动技术**: 只渲染可见区域的图片,支持数千张图片流畅浏览
- **缩略图缓存**: WebP 格式缩略图,基于 MD5 的智能缓存机制
- **瀑布流布局**: 自适应多列布局,充分利用屏幕空间
- **懒加载**: 图片按需加载,减少内存占用

#### 📁 文件管理
- **文件夹导航**: 支持无限层级子文件夹浏览
- **面包屑导航**: 直观的路径导航,快速跳转
- **多种文件类型**: 支持图片、视频、音频文件
- **快捷路径**: 保存常用目录,一键访问

#### 🏷️ 元数据管理
- **星级评分**: 1-5 星评分系统
- **标签系统**: 为图片添加标签,支持批量编辑
- **标签过滤**: OR/AND 两种过滤模式
- **全局搜索**: 跨文件夹按标签搜索

#### 🎯 高级功能
- **多选支持**: 
  - `Ctrl/Cmd + 点击` - 多选
  - `Shift + 点击` - 范围选择
- **批量操作**: 批量删除、标签编辑
- **工作流加载**: 从图片元数据直接加载工作流
- **排序功能**: 按名称、日期、评分排序

### 📦 安装方法

#### 方法 1: Git Clone (推荐)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/yourusername/ComfyUI-CC-ImageLoader.git
```

#### 方法 2: 手动安装
1. 下载项目压缩包
2. 解压到 `ComfyUI/custom_nodes/ComfyUI-CC-ImageLoader`
3. 重启 ComfyUI

### 🎮 使用说明

#### 基本使用

1. **启动 ComfyUI**
2. **添加/找到 LoadImage 节点**
3. **点击图片选择下拉框** - 会自动打开增强浏览器

#### 界面操作

**顶部工具栏**:
- 🔼 **Up 按钮**: 返回上级目录
- 📍 **面包屑导航**: 点击路径快速跳转
- 🔄 **刷新按钮**: 重新加载文件列表
- 📊 **排序选项**: 选择排序方式和顺序
- 🔍 **文件类型过滤**: 选择显示的文件类型

**中部过滤栏**:
- 🏷️ **标签过滤器**: 输入标签过滤图片
- ⚙️ **OR/AND 按钮**: 切换过滤逻辑
- 🌐 **全局搜索**: 跨所有文件夹搜索

**图片网格**:
- 点击图片 - 选择并加载
- `Ctrl/Cmd + 点击` - 添加到多选
- `Shift + 点击` - 范围选择
- ⭐ 星级评分 - 点击星星评分
- ✏️ 编辑按钮 - 编辑标签

**元数据编辑面板**:
- 当选中图片进行编辑时显示
- 添加/删除标签
- 支持批量编辑多个图片

**底部状态栏**:
- 显示文件数量和选择状态
- 全选/删除按钮

#### 快捷键

- `Escape` - 关闭浏览器
- `Ctrl/Cmd + 点击` - 多选
- `Shift + 点击` - 范围选择

### 🔧 配置

所有配置自动保存在节点目录下:

- `config.json` - 用户设置(路径预设等)
- `metadata.json` - 图片元数据(评分、标签)
- `.cache/thumbnails/` - 缩略图缓存目录

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

### 🎨 技术亮点

#### 后端
- **节点覆盖**: 无缝替换原生 LoadImage 节点
- **缩略图生成**: PIL + WebP 高质量压缩
- **智能缓存**: 基于文件修改时间的缓存验证
- **RESTful API**: 标准化的 HTTP 接口

#### 前端
- **虚拟滚动**: 瀑布流 + 虚拟滚动,处理海量图片
- **响应式设计**: 自适应不同屏幕尺寸
- **事件优化**: 防抖/节流处理,避免频繁计算
- **模块化设计**: 清晰的类结构,易于维护

### 🔄 与参考项目的对比

| 特性 | ComfyUI-Thumbnails | Local_Media_Manager | CC-ImageLoader |
|------|-------------------|---------------------|----------------|
| 缩略图显示 | ✅ | ✅ | ✅ |
| 文件夹支持 | ✅ | ✅ | ✅ |
| 虚拟滚动 | ❌ | ✅ | ✅ |
| 缩略图缓存 | ❌ | ✅ | ✅ |
| 元数据管理 | ❌ | ✅ | ✅ |
| 批量操作 | ❌ | ✅ | ✅ |
| 无缝集成 | ✅ | ❌ | ✅ |
| 性能优化 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 🐛 常见问题

**Q: 缩略图不显示?**
A: 检查 `.cache/thumbnails/` 目录权限,确保 ComfyUI 有写入权限。

**Q: 增强浏览器没有打开?**
A: 确保点击的是 LoadImage 节点的图片选择下拉框。

**Q: 标签过滤不生效?**
A: 确保标签输入格式正确(逗号分隔),检查 OR/AND 模式。

**Q: 性能问题?**
A: 虚拟滚动默认启用,如果有数千张图片,可能需要等待初次布局计算完成。

### 📝 更新日志

#### v1.0.0 (2024)
- ✨ 初始版本发布
- ✅ 核心功能实现
- ✅ 虚拟滚动优化
- ✅ 元数据管理系统
- ✅ 批量操作功能

### 🤝 贡献指南

欢迎提交 Issue 和 Pull Request!

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 📄 许可证

本项目采用 MIT 许可证。

### 🙏 致谢

本项目参考并融合了以下优秀项目的设计理念:
- [ComfyUI-Thumbnails](https://github.com/audioscavenger/ComfyUI-Thumbnails) - 缩略图显示和文件夹支持
- [ComfyUI_Local_Media_Manager](https://github.com/X1337-AI/ComfyUI_Local_Media_Manager) - 高性能虚拟滚动和元数据管理

感谢 ComfyUI 社区的支持!

---

## English

### 📝 Introduction

**ComfyUI-CC-ImageLoader** is an enhanced image loading node designed for ComfyUI. It combines the advantages of **ComfyUI-Thumbnails** and **ComfyUI_Local_Media_Manager**, providing high-performance image browsing and management features.

### ✨ Key Features

#### 🚀 Performance Optimization
- **Virtual Scrolling**: Only renders visible images, supports smooth browsing of thousands of images
- **Thumbnail Caching**: WebP format thumbnails with MD5-based smart caching
- **Masonry Layout**: Adaptive multi-column layout for optimal space utilization
- **Lazy Loading**: Images loaded on demand to reduce memory usage

#### 📁 File Management
- **Folder Navigation**: Unlimited subfolder browsing
- **Breadcrumb Navigation**: Intuitive path navigation with quick jumps
- **Multiple File Types**: Supports images, videos, and audio files
- **Quick Paths**: Save frequently used directories for one-click access

#### 🏷️ Metadata Management
- **Star Ratings**: 1-5 star rating system
- **Tag System**: Add tags to images with batch editing support
- **Tag Filtering**: OR/AND filtering modes
- **Global Search**: Cross-folder tag-based search

#### 🎯 Advanced Features
- **Multi-Selection**: 
  - `Ctrl/Cmd + Click` - Multi-select
  - `Shift + Click` - Range selection
- **Batch Operations**: Batch delete, tag editing
- **Workflow Loading**: Load workflows directly from image metadata
- **Sorting**: Sort by name, date, or rating

### 📦 Installation

#### Method 1: Git Clone (Recommended)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/yourusername/ComfyUI-CC-ImageLoader.git
```

#### Method 2: Manual Installation
1. Download the project zip
2. Extract to `ComfyUI/custom_nodes/ComfyUI-CC-ImageLoader`
3. Restart ComfyUI

### 🎮 Usage

#### Basic Usage

1. **Start ComfyUI**
2. **Add/Find LoadImage node**
3. **Click the image selection dropdown** - Enhanced browser opens automatically

#### Interface Controls

**Top Toolbar**:
- 🔼 **Up Button**: Return to parent directory
- 📍 **Breadcrumb Navigation**: Click path segments to jump
- 🔄 **Refresh Button**: Reload file list
- 📊 **Sort Options**: Choose sort method and order
- 🔍 **File Type Filter**: Select file types to display

**Middle Filter Bar**:
- 🏷️ **Tag Filter**: Enter tags to filter images
- ⚙️ **OR/AND Button**: Toggle filter logic
- 🌐 **Global Search**: Search across all folders

**Image Grid**:
- Click image - Select and load
- `Ctrl/Cmd + Click` - Add to multi-selection
- `Shift + Click` - Range selection
- ⭐ Star Rating - Click stars to rate
- ✏️ Edit Button - Edit tags

**Metadata Edit Panel**:
- Shows when images are selected for editing
- Add/remove tags
- Supports batch editing multiple images

**Bottom Status Bar**:
- Shows file count and selection status
- Select All/Delete buttons

#### Keyboard Shortcuts

- `Escape` - Close browser
- `Ctrl/Cmd + Click` - Multi-select
- `Shift + Click` - Range selection

### 🔧 Configuration

All settings are auto-saved in the node directory:

- `config.json` - User settings (path presets, etc.)
- `metadata.json` - Image metadata (ratings, tags)
- `.cache/thumbnails/` - Thumbnail cache directory

### 📊 Project Structure

```
ComfyUI-CC-ImageLoader/
├── __init__.py                 # Node registration
├── LoadImageEnhanced.py        # Backend core logic
├── web/                        # Frontend resources
│   ├── js/
│   │   └── imageloader_enhanced.js
│   └── css/
│       └── imageloader_enhanced.css
├── .cache/                     # Cache directory (auto-created)
│   └── thumbnails/             # Thumbnails
├── config.json                 # Config file (auto-created)
└── metadata.json               # Metadata (auto-created)
```

### 🎨 Technical Highlights

#### Backend
- **Node Override**: Seamlessly replaces native LoadImage node
- **Thumbnail Generation**: PIL + WebP high-quality compression
- **Smart Caching**: Cache validation based on file modification time
- **RESTful API**: Standardized HTTP interfaces

#### Frontend
- **Virtual Scrolling**: Masonry + virtual scrolling for massive image sets
- **Responsive Design**: Adapts to different screen sizes
- **Event Optimization**: Debounce/throttle to avoid frequent calculations
- **Modular Design**: Clear class structure, easy to maintain

### 🔄 Comparison with Reference Projects

| Feature | ComfyUI-Thumbnails | Local_Media_Manager | CC-ImageLoader |
|---------|-------------------|---------------------|----------------|
| Thumbnail Display | ✅ | ✅ | ✅ |
| Folder Support | ✅ | ✅ | ✅ |
| Virtual Scrolling | ❌ | ✅ | ✅ |
| Thumbnail Cache | ❌ | ✅ | ✅ |
| Metadata Management | ❌ | ✅ | ✅ |
| Batch Operations | ❌ | ✅ | ✅ |
| Seamless Integration | ✅ | ❌ | ✅ |
| Performance | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 🐛 FAQ

**Q: Thumbnails not showing?**
A: Check `.cache/thumbnails/` directory permissions, ensure ComfyUI has write access.

**Q: Enhanced browser doesn't open?**
A: Make sure you're clicking the LoadImage node's image selection dropdown.

**Q: Tag filtering not working?**
A: Ensure tag input format is correct (comma-separated), check OR/AND mode.

**Q: Performance issues?**
A: Virtual scrolling is enabled by default. For thousands of images, initial layout calculation may take a moment.

### 📝 Changelog

#### v1.0.0 (2024)
- ✨ Initial release
- ✅ Core features implemented
- ✅ Virtual scrolling optimization
- ✅ Metadata management system
- ✅ Batch operation features

### 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the MIT License.

### 🙏 Acknowledgments

This project references and integrates design concepts from:
- [ComfyUI-Thumbnails](https://github.com/audioscavenger/ComfyUI-Thumbnails) - Thumbnail display and folder support
- [ComfyUI_Local_Media_Manager](https://github.com/X1337-AI/ComfyUI_Local_Media_Manager) - High-performance virtual scrolling and metadata management

Thanks to the ComfyUI community for their support!

---

**Star ⭐ this project if you find it helpful!**
