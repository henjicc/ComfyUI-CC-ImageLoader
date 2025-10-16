# 测试指南

## 🔍 问题修复说明

### 修复的问题

1. **前端扩展注册时机** - 从 `setup` 改为 `init` 阶段劫持 `LiteGraph.ContextMenu`
2. **CSS注入** - 添加了CSS样式文件的自动注入
3. **节点检测** - 修复了获取当前节点的方式
4. **菜单劫持逻辑** - 先创建原始菜单,然后延迟关闭并显示增强浏览器
5. **Widget更新** - 添加了选中图片后更新节点widget值的逻辑
6. **Widget Callback触发** - ⭐ **关键修夏**: 调用`widget.callback()`触发节点预览更新
7. **画布重绘** - 调用`app.graph.setDirtyCanvas()`强制重绘界面
8. **默认目录** - 添加了从 API 获取默认输入目录的逻辑

1. **前端扩展注册时机** - 从 `setup` 改为 `init` 阶段劫持 `LiteGraph.ContextMenu`
2. **CSS注入** - 添加了CSS样式文件的自动注入
3. **节点检测** - 修复了获取当前节点的方式
4. **菜单劫持逻辑** - 先创建原始菜单,然后延迟关闭并显示增强浏览器
5. **Widget更新** - 添加了选中图片后更新节点widget值的逻辑
6. **默认目录** - 添加了从API获取默认输入目录的逻辑

### 关键修改

#### 1. 前端扩展 (web/js/imageloader_enhanced.js)

**修改前**:
```javascript
async setup() {
    const originalContextMenu = LiteGraph.ContextMenu;
    LiteGraph.ContextMenu = function(values, options) {
        // ...
    };
}
```

**修改后**:
```javascript
async init() {
    // 注入CSS
    await injectCss("/extensions/ComfyUI-CC-ImageLoader/css/imageloader_enhanced.css");
    
    // 劫持ContextMenu
    const ctxMenu = LiteGraph.ContextMenu;
    LiteGraph.ContextMenu = function(values, options) {
        const currentNode = LGraphCanvas.active_canvas?.current_node;
        if (currentNode?.type !== "LoadImage") {
            return ctxMenu.call(this, values, options);
        }
        
        // 先创建原始菜单
        const ctx = ctxMenu.call(this, values, options);
        
        // 创建增强浏览器
        const gallery = new ImageGallery({
            onSelect: (selectedPath) => {
                const widget = currentNode.widgets?.find(w => w.type === "combo" && w.name === "image");
                if (widget) {
                    widget.value = selectedPath;
                    
                    // ⭐ 关键: 触发widget的callback以更新节点预览
                    if (widget.callback) {
                        widget.callback(selectedPath);
                    }
                    
                    // 强制重绘画布
                    if (app.graph) {
                        app.graph.setDirtyCanvas(true, false);
                    }
                }
                ctx.close();
                gallery.close();
            }
        });
        
        // 延迟显示
        setTimeout(() => {
            ctx.close();
            gallery.show();
        }, 50);
        
        return ctx;
    };
}
```

## 🧪 测试步骤

### 前置准备

1. **确保项目位置正确**
   ```bash
   cd ComfyUI/custom_nodes
   ls -la | grep ComfyUI-CC-ImageLoader
   ```

2. **检查文件完整性**
   ```bash
   cd ComfyUI-CC-ImageLoader
   ls -la
   # 应该看到:
   # - __init__.py
   # - LoadImageEnhanced.py
   # - web/js/imageloader_enhanced.js
   # - web/css/imageloader_enhanced.css
   ```

3. **重启 ComfyUI**
   - 完全关闭 ComfyUI
   - 重新启动

### 测试 1: 节点覆盖

✅ **验证点**: LoadImage 节点是否被成功覆盖

**步骤**:
1. 在 ComfyUI 中添加一个 `LoadImage` 节点
2. 查看控制台输出,应该看到:
   ```
   [LoadImageEnhanced] version: 1.0.0
   [LoadImageEnhanced] Loaded successfully!
   [LoadImageEnhanced] Frontend v1.0.0 loaded
   ```

### 测试 2: 增强浏览器打开

✅ **验证点**: 点击图片选择下拉框时,增强浏览器应该打开

**步骤**:
1. 点击 LoadImage 节点的 image 下拉框
2. 观察:
   - 原始下拉菜单应该闪现然后关闭
   - 增强浏览器窗口应该打开
   - 窗口应该显示在屏幕中央

**预期结果**:
- 看到深色主题的浮动窗口
- 顶部有工具栏(路径、排序、过滤)
- 中间是图片网格(如果有图片的话)

### 测试 3: 文件夹导航

✅ **验证点**: 能够浏览文件夹结构

**步骤**:
1. 在增强浏览器中,应该能看到 ComfyUI/input 目录的内容
2. 如果有子文件夹,点击文件夹图标
3. 面包屑导航应该更新
4. 点击 ⬆️ Up 按钮返回上级

**预期结果**:
- 文件夹显示为黄色文件夹图标
- 点击后进入子目录
- 面包屑显示当前路径
- Up按钮可用时可以返回

### 测试 4: 图片选择

✅ **验证点**: 点击图片后应该更新节点并关闭浏览器

**步骤**:
1. 在增强浏览器中点击任意图片
2. 观察:
   - 浏览器窗口关闭
   - LoadImage 节点的 image 参数更新为所选图片
   - 节点预览区显示选中的图片

**预期结果**:
- 图片成功加载到节点
- 浏览器自动关闭

### 测试 5: 缩略图显示

✅ **验证点**: 图片应该显示为缩略图,而非原图

**步骤**:
1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 打开增强浏览器
4. 查看图片请求的URL

**预期结果**:
- 图片URL应该是 `/imageloader/thumbnail?filepath=...`
- 图片大小应该明显小于原图
- 加载速度快

### 测试 6: 虚拟滚动

✅ **验证点**: 大量图片时滚动流畅

**步骤**:
1. 准备一个包含 100+ 张图片的目录
2. 打开增强浏览器
3. 滚动图片列表
4. 观察性能

**预期结果**:
- 滚动流畅,无卡顿
- DOM中只有可见区域的卡片
- 使用开发者工具查看,DOM节点数量应该远少于图片总数

### 测试 7: 元数据功能

✅ **验证点**: 评分和标签功能

**步骤**:
1. 点击图片上的星星进行评分
2. 点击编辑按钮 ✏️
3. 在底部面板添加标签
4. 关闭浏览器,重新打开

**预期结果**:
- 评分立即显示
- 标签显示在图片下方
- 重新打开后数据保持

## 🐛 常见问题排查

### 问题 1: 浏览器没有打开

**可能原因**:
- JavaScript 加载失败
- 节点类型判断错误
- CSS 未正确加载

**排查步骤**:
1. 打开浏览器控制台 (F12)
2. 查看是否有 JavaScript 错误
3. 检查 Network 标签,确认 .js 和 .css 文件已加载
4. 在控制台输入:
   ```javascript
   console.log(LGraphCanvas.active_canvas?.current_node?.type)
   ```
   点击下拉框前后对比输出

### 问题 2: 原始菜单仍然显示

**可能原因**:
- ContextMenu 劫持失败
- 节点类型检测错误

**排查步骤**:
1. 在控制台输入:
   ```javascript
   console.log(LiteGraph.ContextMenu.toString())
   ```
   应该看到我们修改后的函数

2. 添加调试日志:
   - 修改 `imageloader_enhanced.js`
   - 将 `DEBUG` 常量改为 `true`
   - 重新加载页面,查看控制台输出

### 问题 3: 图片不显示

**可能原因**:
- 缩略图生成失败
- API 路由错误
- 权限问题

**排查步骤**:
1. 检查后端日志 (ComfyUI 终端)
2. 查看 `.cache/thumbnails` 目录是否有文件
3. 在浏览器 Network 标签查看缩略图请求状态
4. 手动访问: `http://localhost:8188/imageloader/files`
   应该返回 JSON 格式的文件列表

### 问题 4: 目录为空

**可能原因**:
- input 目录没有图片
- 文件扩展名不支持
- 扫描目录错误

**排查步骤**:
1. 确认 `ComfyUI/input` 目录有图片文件
2. 支持的格式: jpg, jpeg, png, bmp, gif, webp, tiff, tif
3. 检查文件权限

## 📊 性能验证

### 内存占用

**测试方法**:
1. 打开浏览器开发者工具
2. 切换到 Performance Monitor
3. 打开增强浏览器(1000+ 张图片)
4. 记录内存使用

**预期结果**:
- 初始内存 < 200MB
- 滚动时内存波动 < 50MB
- 无内存泄漏

### 渲染性能

**测试方法**:
1. 打开 Performance 标签
2. 点击 Record
3. 滚动图片列表
4. 停止录制,查看帧率

**预期结果**:
- 平均帧率 > 55 FPS
- 无明显掉帧
- 布局计算时间 < 100ms

## ✅ 验收标准

所有以下功能必须正常工作:

- [x] LoadImage 节点被成功覆盖
- [x] 点击下拉框打开增强浏览器
- [x] 浏览器显示图片缩略图
- [x] 文件夹导航正常
- [x] 面包屑导航可用
- [x] 点击图片选择并关闭
- [x] 缩略图缓存工作
- [x] 虚拟滚动流畅
- [x] 评分功能正常
- [x] 标签功能正常
- [x] 过滤和排序正常

## 🔄 已修复的核心问题总结

1. ✅ **扩展注册时机** - 从 setup 改为 init
2. ✅ **CSS注入** - 自动加载样式文件
3. ✅ **节点获取** - 正确获取 current_node
4. ✅ **菜单劫持** - 先调用原始菜单再显示增强版
5. ✅ **Widget更新** - 选中后更新节点值
6. ✅ **默认目录** - 从 API 获取输入目录

---

**测试完成后,如有问题请查看控制台日志并按照排查步骤进行诊断。**
