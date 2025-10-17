/**
 * LoadImageEnhanced - 前端主文件
 * 高性能图片浏览器,融合 Thumbnails 和 Local_Media_Manager 的优势
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const DEBUG = false;
const VERSION = "1.0.0";

// ==================== 工具函数 ====================

/**
 * 防抖函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 生成随机 ID
 */
function generateId(length = 8) {
    const arr = new Uint8Array(length / 2);
    crypto.getRandomValues(arr);
    return Array.from(arr, dec => dec.toString(16).padStart(2, "0")).join("");
}

/**
 * 注入 CSS
 */
function injectCss(href) {
    if (document.querySelector(`link[href^="${href}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("type", "text/css");
        link.href = href;
        const timeout = setTimeout(resolve, 1000);
        link.addEventListener("load", () => {
            clearTimeout(timeout);
            resolve();
        });
        document.head.appendChild(link);
    });
}

/**
 * 显示消息
 */
function showMessage(msg) {
    if (app.ui && app.ui.dialog) {
        app.ui.dialog.show(msg);
        if (app.ui.dialog.element) {
            app.ui.dialog.element.style.zIndex = 10010;
        }
    } else {
        console.log(msg);
    }
}

// ==================== 图片浏览器类 ====================

class ImageGallery {
    constructor(options = {}) {
        this.options = {
            inputDir: options.inputDir || '',
            startDir: options.startDir || '', // ⭐ 起始目录（相对路径）
            onSelect: options.onSelect || (() => {}),
            onClose: options.onClose || (() => {}),
        };
        
        // 状态变量
        this.inputDir = this.options.inputDir;  // ⚠️ 保存 input 目录路径
        this.currentDir = this.options.inputDir;
        this.parentDir = null;
        this.allItems = [];
        this.layoutData = [];
        this.selectedItems = [];
        this.editingItems = new Set();
        
        // ⭐ 设置选项（从 localStorage 加载）
        this.settings = this.loadSettings();
        
        // 布局参数
        this.columnCount = 0;
        this.cardWidth = 0;
        this.scrollTop = 0;
        this.containerHeight = 0;
        
        // 配置
        this.minCardWidth = this.settings.thumbnailSize; // ⭐ 使用设置的缩略图大小
        this.gap = 5;
        this.virtualPadding = 1500;  // ⭐ 虚拟滚动缓冲区（像素），控制预渲染范围，增大可减少跳动但会增加渲染压力
        this.layoutDebounceDelay = 200;  // ⭐ 布局重算防抖延迟（毫秒），图片加载时避免频繁重算
        
        // 排序和过滤
        this.sortBy = this.settings.sortBy;        // ⭐ 从设置加载排序方式
        this.sortOrder = this.settings.sortOrder;  // ⭐ 从设置加载排序顺序
        this.filterType = 'none';    // ⭐ 过滤类型: none | filename | tags | rating
        this.filterValue = '';       // ⭐ 过滤值
        
        // 创建 UI
        this.createUI();
        this.attachEvents();
        
        // 加载样式
        injectCss("/imageloader_enhanced/css/imageloader_enhanced.css");
    }
    
    /**
     * 创建 UI 结构
     */
    createUI() {
        // ⭐ 背景遮罩层
        this.backdrop = document.createElement("div");
        this.backdrop.className = "lie-backdrop";
        this.backdrop.style.opacity = '0';
        
        // 主容器
        this.container = document.createElement("div");
        this.container.className = "lie-context-menu dark";
        // ⭐ CSS 已经定义了居中定位，这里只设置初始隐藏
        this.container.style.opacity = '0';
        
        // 头部工具栏
        this.createHeader();
        
        // ⭐ 设置面板
        this.createSettingsPanel();
        
        // 图片网格
        this.createGallery();
        
        // 元数据编辑面板
        this.createMetadataPanel();
        
        // 底部状态栏
        this.createFooter();
        
        // ⭐ 不在这里添加到DOM，等到show()时再添加
    }
    
    /**
     * 创建头部工具栏
     */
    createHeader() {
        const header = document.createElement("div");
        header.className = "lie-header";
        
        // 第一行:路径导航
        const toolbar1 = document.createElement("div");
        toolbar1.className = "lie-toolbar";
        toolbar1.innerHTML = `
            <button class="lie-up-btn" title="返回上级目录">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M31 36L19 24L31 12" stroke="#c3c3c3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="lie-path-nav">
                <div class="lie-breadcrumb"></div>
            </div>
            <button class="lie-refresh-btn" title="刷新">
                <svg width="15" height="15" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M42 8V24" stroke="#c3c3c3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 24L6 40" stroke="#c3c3c3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M42 24C42 14.0589 33.9411 6 24 6C18.9145 6 14.3216 8.10896 11.0481 11.5M6 24C6 33.9411 14.0589 42 24 42C28.8556 42 33.2622 40.0774 36.5 36.9519" stroke="#c3c3c3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        
        // 第二行:排序和过滤
        const toolbar2 = document.createElement("div");
        toolbar2.className = "lie-toolbar";
        toolbar2.innerHTML = `
            <label>排序:</label>
            <select class="lie-sort-by">
                <option value="name">名称</option>
                <option value="date">日期</option>
                <option value="rating">评分</option>
            </select>
            <select class="lie-sort-order">
                <option value="asc">升序</option>
                <option value="desc">降序</option>
            </select>
            <label style="margin-left: 16px;">过滤:</label>
            <select class="lie-filter-type">
                <option value="none">无过滤</option>
                <option value="filename">文件名</option>
                <option value="tags">标签</option>
                <option value="rating">星标</option>
            </select>
            <input type="text" class="lie-filter-input" placeholder="输入过滤条件..." style="display: none;">
            <select class="lie-rating-filter" style="display: none;">
                <option value="0">全部</option>
                <option value="5">⭐⭐⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="2">⭐⭐</option>
                <option value="1">⭐</option>
            </select>
            <button class="lie-settings-btn" title="设置" style="margin-left: auto;">
                <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.2838 43.1713C14.9327 42.1736 11.9498 40.3213 9.58787 37.867C10.469 36.8227 11 35.4734 11 34.0001C11 30.6864 8.31371 28.0001 5 28.0001C4.79955 28.0001 4.60139 28.01 4.40599 28.0292C4.13979 26.7277 4 25.3803 4 24.0001C4 21.9095 4.32077 19.8938 4.91579 17.9995C4.94381 17.9999 4.97188 18.0001 5 18.0001C8.31371 18.0001 11 15.3138 11 12.0001C11 11.0488 10.7786 10.1493 10.3846 9.35011C12.6975 7.1995 15.5205 5.59002 18.6521 4.72314C19.6444 6.66819 21.6667 8.00013 24 8.00013C26.3333 8.00013 28.3556 6.66819 29.3479 4.72314C32.4795 5.59002 35.3025 7.1995 37.6154 9.35011C37.2214 10.1493 37 11.0488 37 12.0001C37 15.3138 39.6863 18.0001 43 18.0001C43.0281 18.0001 43.0562 17.9999 43.0842 17.9995C43.6792 19.8938 44 21.9095 44 24.0001C44 25.3803 43.8602 26.7277 43.594 28.0292C43.3986 28.01 43.2005 28.0001 43 28.0001C39.6863 28.0001 37 30.6864 37 34.0001C37 35.4734 37.531 36.8227 38.4121 37.867C36.0502 40.3213 33.0673 42.1736 29.7162 43.1713C28.9428 40.752 26.676 39.0001 24 39.0001C21.324 39.0001 19.0572 40.752 18.2838 43.1713Z" fill="none" stroke="#c3c3c3" stroke-width="4" stroke-linejoin="round"/>
                    <path d="M24 31C27.866 31 31 27.866 31 24C31 20.134 27.866 17 24 17C20.134 17 17 20.134 17 24C17 27.866 20.134 31 24 31Z" fill="none" stroke="#c3c3c3" stroke-width="4" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        
        
        header.appendChild(toolbar1);
        header.appendChild(toolbar2);
        this.container.appendChild(header);
        
        // 保存元素引用
        this.upBtn = header.querySelector('.lie-up-btn');
        this.breadcrumb = header.querySelector('.lie-breadcrumb');
        this.refreshBtn = header.querySelector('.lie-refresh-btn');
        this.sortBySelect = header.querySelector('.lie-sort-by');
        this.sortOrderSelect = header.querySelector('.lie-sort-order');
        this.filterTypeSelect = header.querySelector('.lie-filter-type');
        this.filterInput = header.querySelector('.lie-filter-input');
        this.ratingFilter = header.querySelector('.lie-rating-filter');
        this.settingsBtn = header.querySelector('.lie-settings-btn'); // ⭐ 设置按钮
        
        // ⭐ 设置排序选项的初始值
        this.sortBySelect.value = this.settings.sortBy;
        this.sortOrderSelect.value = this.settings.sortOrder;
    }
    
    /**
     * 创建图片网格
     */
    createGallery() {
        this.gallery = document.createElement("div");
        this.gallery.className = "lie-gallery";
        
        this.placeholder = document.createElement("div");
        this.placeholder.className = "lie-placeholder";
        this.placeholder.textContent = "加载中...";
        this.gallery.appendChild(this.placeholder);
        
        this.container.appendChild(this.gallery);
    }
    
    /**
     * 创建元数据编辑面板
     */
    createMetadataPanel() {
        const panel = document.createElement("div");
        panel.className = "lie-metadata-panel";
        panel.innerHTML = `
            <div class="lie-metadata-row">
                <label>编辑标签 (<span class="lie-edit-count">0</span>):</label>
                <input type="text" class="lie-tag-edit-input" placeholder="添加标签...">
            </div>
            <div class="lie-metadata-row">
                <div class="lie-tag-editor"></div>
            </div>
        `;
        
        this.container.appendChild(panel);
        
        this.metadataPanel = panel;
        this.editCountSpan = panel.querySelector('.lie-edit-count');
        this.tagEditInput = panel.querySelector('.lie-tag-edit-input');
        this.tagEditor = panel.querySelector('.lie-tag-editor');
    }
    
    /**
     * ⭐ 创建设置面板
     */
    createSettingsPanel() {
        const panel = document.createElement("div");
        panel.className = "lie-settings-panel";
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="lie-settings-section">
                <div class="lie-settings-title">显示选项</div>
                <label class="lie-settings-option">
                    <input type="checkbox" class="lie-setting-show-rating" ${this.settings.showRating ? 'checked' : ''}>
                    <span>显示星标评分</span>
                </label>
                <label class="lie-settings-option">
                    <input type="checkbox" class="lie-setting-show-tags" ${this.settings.showTags ? 'checked' : ''}>
                    <span>显示标签</span>
                </label>
                <label class="lie-settings-option">
                    <input type="checkbox" class="lie-setting-show-filename" ${this.settings.showFilename ? 'checked' : ''}>
                    <span>显示文件名</span>
                </label>
            </div>
            <div class="lie-settings-section">
                <div class="lie-settings-title">缩略图大小</div>
                <div class="lie-slider-container">
                    <div class="lie-slider-header">
                        <span class="lie-slider-label">大小</span>
                        <span class="lie-slider-value">${this.settings.thumbnailSize}px</span>
                    </div>
                    <input type="range" class="lie-thumbnail-slider" 
                           min="100" max="400" step="50" 
                           value="${this.settings.thumbnailSize}">
                    <div class="lie-slider-presets">
                        <button class="lie-preset-btn" data-size="150">小</button>
                        <button class="lie-preset-btn" data-size="200">中</button>
                        <button class="lie-preset-btn" data-size="300">大</button>
                    </div>
                </div>
            </div>
            <div class="lie-settings-section">
                <div class="lie-settings-title">图片填充模式</div>
                <label class="lie-settings-option">
                    <input type="radio" name="image-fit" value="cover" ${this.settings.imageFit === 'cover' ? 'checked' : ''}>
                    <span>填充满网格（可能裁剪）</span>
                </label>
                <label class="lie-settings-option">
                    <input type="radio" name="image-fit" value="contain" ${this.settings.imageFit === 'contain' ? 'checked' : ''}>
                    <span>完整显示（可能留白）</span>
                </label>
            </div>
        `;
        
        this.container.appendChild(panel);
        this.settingsPanel = panel;
        
        // 绑定设置变更事件
        panel.querySelector('.lie-setting-show-rating').addEventListener('change', (e) => {
            this.settings.showRating = e.target.checked;
            this.saveSettings();
            this.calculateLayout(); // ⭐ 重新计算布局（高度变化）
            this.refreshAllCards(); // ⭐ 刷新所有卡片
        });
        
        panel.querySelector('.lie-setting-show-tags').addEventListener('change', (e) => {
            this.settings.showTags = e.target.checked;
            this.saveSettings();
            this.calculateLayout(); // ⭐ 重新计算布局（高度变化）
            this.refreshAllCards(); // ⭐ 刷新所有卡片
        });
        
        panel.querySelector('.lie-setting-show-filename').addEventListener('change', (e) => {
            this.settings.showFilename = e.target.checked;
            this.saveSettings();
            this.calculateLayout(); // ⭐ 重新计算布局（高度变化）
            this.refreshAllCards(); // ⭐ 刷新所有卡片
        });
        
        // ⭐ 滑块控件事件
        const slider = panel.querySelector('.lie-thumbnail-slider');
        const sliderValue = panel.querySelector('.lie-slider-value');
        
        // 实时更新数值显示（拖动时）
        slider.addEventListener('input', (e) => {
            sliderValue.textContent = `${e.target.value}px`;
        });
        
        // 松开鼠标后应用布局（使用防抖避免频繁重算）
        const applyThumbnailSize = debounce((size) => {
            this.settings.thumbnailSize = size;
            this.minCardWidth = size;
            this.saveSettings();
            this.refreshAllCards();
            this.calculateLayout();
        }, 150);
        
        slider.addEventListener('change', (e) => {
            applyThumbnailSize(parseInt(e.target.value));
        });
        
        // ⭐ 快捷预设按钮
        panel.querySelectorAll('.lie-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = parseInt(btn.dataset.size);
                slider.value = size;
                sliderValue.textContent = `${size}px`;
                applyThumbnailSize(size);
            });
        });
        
        // ⭐ 图片填充模式变更
        panel.querySelectorAll('input[name="image-fit"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.settings.imageFit = e.target.value;
                    this.saveSettings();
                    this.refreshAllCards(); // ⭐ 刷新所有卡片以应用新的填充模式
                }
            });
        });
    }
    
    /**
     * ⭐ 加载设置
     */
    loadSettings() {
        const defaultSettings = {
            showRating: true,
            showTags: true,
            showFilename: true,
            thumbnailSize: 150,  // ⭐ 默认为小 (150px)
            sortBy: 'date',      // ⭐ 默认排序方式：日期
            sortOrder: 'desc',   // ⭐ 默认排序顺序：降序
            imageFit: 'cover'    // ⭐ 默认图片填充模式：cover(填充) / contain(完整)
        };
        
        try {
            const saved = localStorage.getItem('imageloader_settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('加载设置失败:', error);
            return defaultSettings;
        }
    }
    
    /**
     * ⭐ 保存设置
     */
    saveSettings() {
        try {
            localStorage.setItem('imageloader_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }
    
    /**
     * ⭐ 计算信息面板高度（根据显示设置动态调整）
     */
    getInfoPanelHeight() {
        let height = 8; // 基础 padding (6px * 2)
        
        // 星级评分行（如果显示）
        if (this.settings.showRating) {
            height += 18; // 星级行高度 + 下边距
        }
        
        // 文件名行（如果显示）
        if (this.settings.showFilename) {
            height += 15; // 文件名行高度 + 上边距
        }
        
        // 标签行（如果显示）
        if (this.settings.showTags) {
            height += 23; // 标签行高度 + 上边距
        }
        
        // 最小高度（至少显示边框）
        return Math.max(height, 20);
    }
    
    /**
     * 创建底部状态栏
     */
    createFooter() {
        const footer = document.createElement("div");
        footer.className = "lie-footer";
        footer.innerHTML = `
            <div class="lie-footer-left">
                <span class="lie-item-count">0 项</span>
                <span class="lie-selected-count"></span>
            </div>
            <div class="lie-footer-right">
                <button class="lie-batch-tag-btn" disabled>🏷️ 批量标签</button>
                <button class="lie-batch-delete-btn" disabled>🗑️ 删除选中</button>
                <button class="lie-close-btn">关闭</button>
            </div>
        `;
        
        this.container.appendChild(footer);
        
        this.itemCountSpan = footer.querySelector('.lie-item-count');
        this.selectedCountSpan = footer.querySelector('.lie-selected-count');
        this.batchTagBtn = footer.querySelector('.lie-batch-tag-btn');
        this.batchDeleteBtn = footer.querySelector('.lie-batch-delete-btn');
        this.closeBtn = footer.querySelector('.lie-close-btn');
    }
    
    /**
     * 附加事件监听
     */
    attachEvents() {
        // 关闭按钮
        this.closeBtn.addEventListener('click', () => this.close());
        
        // ⭐ 批量标签
        this.batchTagBtn.addEventListener('click', (e) => {
            e.stopPropagation();  // 防止触发点击外部关闭
            this.toggleBatchTagging();
        });
        
        // ⭐ 批量删除
        this.batchDeleteBtn.addEventListener('click', () => this.batchDelete());
        
        // ⭐ 设置按钮
        this.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSettings();
        });
        
        // 上一级目录
        this.upBtn.addEventListener('click', () => this.navigateUp());
        
        // 刷新
        this.refreshBtn.addEventListener('click', () => this.loadFiles(true));
        
        // 排序
        this.sortBySelect.addEventListener('change', () => {
            this.sortBy = this.sortBySelect.value;
            this.settings.sortBy = this.sortBy;  // ⭐ 保存到设置
            this.saveSettings();
            this.applyFiltersAndSort();
        });
        
        this.sortOrderSelect.addEventListener('change', () => {
            this.sortOrder = this.sortOrderSelect.value;
            this.settings.sortOrder = this.sortOrder;  // ⭐ 保存到设置
            this.saveSettings();
            this.applyFiltersAndSort();
        });
        
        // ⭐ 过滤类型切换
        this.filterTypeSelect.addEventListener('change', () => {
            this.filterType = this.filterTypeSelect.value;
            this.updateFilterUI();
            this.applyFiltersAndSort();
        });
        
        // ⭐ 过滤输入
        this.filterInput.addEventListener('input', debounce(() => {
            this.filterValue = this.filterInput.value.trim();
            this.applyFiltersAndSort();
        }, 300));
        
        // ⭐ 星标过滤
        this.ratingFilter.addEventListener('change', () => {
            this.filterValue = this.ratingFilter.value;
            this.applyFiltersAndSort();
        });
        
        // 标签编辑输入
        this.tagEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tag = this.tagEditInput.value.trim();
                if (tag) {
                    this.addTagToSelected(tag);
                    this.tagEditInput.value = '';
                }
            } else if (e.key === 'Escape') {
                // ⭐ ESC 键关闭编辑
                this.editingItems.clear();
                this.renderTagEditor();
                this.updateVisibleItems();
            }
        });
        
        // ⭐ 点击外部关闭标签编辑和设置面板
        document.addEventListener('click', (e) => {
            // 关闭标签编辑
            if (this.editingItems.size > 0) {
                const isClickInside = this.metadataPanel.contains(e.target) || 
                                     e.target.classList.contains('lie-edit-btn') ||
                                     e.target.closest('.lie-edit-btn') ||
                                     e.target.classList.contains('lie-batch-tag-btn') ||
                                     e.target.closest('.lie-batch-tag-btn');
                if (!isClickInside) {
                    this.editingItems.clear();
                    this.renderTagEditor();
                    this.updateVisibleItems();
                }
            }
            
            // 关闭设置面板
            if (this.settingsPanel && this.settingsPanel.style.display === 'block') {
                const isClickInside = this.settingsPanel.contains(e.target) ||
                                     e.target.classList.contains('lie-settings-btn') ||
                                     e.target.closest('.lie-settings-btn');
                if (!isClickInside) {
                    this.settingsPanel.style.display = 'none';
                }
            }
        });
        
        // 虚拟滚动
        this.gallery.addEventListener('scroll', debounce(() => {
            this.scrollTop = this.gallery.scrollTop;
            this.updateVisibleItems();
        }, 50));
        
        // 窗口大小变化 - ⭐ 增加防抖延迟，避免在动画期间触发
        const resizeObserver = new ResizeObserver(debounce(() => {
            this.containerHeight = this.gallery.clientHeight;
            this.calculateLayout();
        }, 250)); // ⭐ 从 100ms 增加到 250ms，确保弹窗动画(200ms)完成后才重算布局
        resizeObserver.observe(this.gallery);
        
        // 键盘快捷键
        this.handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.container.parentNode) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
        
        // ⭐ 点击遮罩层关闭
        this.backdrop.addEventListener('click', () => {
            this.close();
        });
    }
    
    /**
     * 更新过滤 UI 显示
     */
    updateFilterUI() {
        // 隐藏所有过滤输入
        this.filterInput.style.display = 'none';
        this.ratingFilter.style.display = 'none';
        this.filterValue = '';
        
        // 根据过滤类型显示对应的输入框
        switch(this.filterType) {
            case 'filename':
                this.filterInput.style.display = 'inline-block';
                this.filterInput.placeholder = '输入文件名关键词...';
                this.filterInput.value = '';
                break;
            case 'tags':
                this.filterInput.style.display = 'inline-block';
                this.filterInput.placeholder = '输入标签,逗号分隔...';
                this.filterInput.value = '';
                break;
            case 'rating':
                this.ratingFilter.style.display = 'inline-block';
                this.ratingFilter.value = '0';
                break;
        }
    }
    
    /**
     * 渲染面包屑导航
     */
    renderBreadcrumb() {
        this.breadcrumb.innerHTML = '';
        
        if (!this.currentDir) {
            this.breadcrumb.textContent = '请选择目录';
            return;
        }
        
        // 获取基础路径（input 目录）
        const basePath = this.inputDir || '';
        
        // 计算相对路径
        let relativePath = this.currentDir;
        if (basePath && this.currentDir.startsWith(basePath)) {
            relativePath = this.currentDir.slice(basePath.length);
            // 移除开头的斜杠
            if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
                relativePath = relativePath.slice(1);
            }
        }
        
        // 根目录显示为 /
        const root = document.createElement('span');
        root.className = 'lie-breadcrumb-item';
        root.textContent = '/';
        root.dataset.path = basePath;
        root.addEventListener('click', () => this.navigateTo(basePath));
        this.breadcrumb.appendChild(root);
        
        // 如果不在根目录，显示子路径
        if (relativePath) {
            const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
            let builtPath = basePath;
            
            parts.forEach((part, index) => {
                // 添加分隔符
                const sep = document.createElement('span');
                sep.className = 'lie-breadcrumb-separator';
                sep.textContent = '>';
                this.breadcrumb.appendChild(sep);
                
                // 构建完整路径
                builtPath += (builtPath.endsWith('/') || builtPath.endsWith('\\') ? '' : '/') + part;
                const currentPath = builtPath;
                
                // 添加路径项
                const item = document.createElement('span');
                item.className = 'lie-breadcrumb-item';
                item.textContent = part;
                item.dataset.path = currentPath;
                item.addEventListener('click', () => this.navigateTo(currentPath));
                this.breadcrumb.appendChild(item);
            });
        }
    }
    
    /**
     * 导航到指定目录
     */
    navigateTo(path) {
        this.currentDir = path;
        this.loadFiles(false);
    }
    
    /**
     * 返回上级目录
     */
    navigateUp() {
        if (this.parentDir) {
            this.navigateTo(this.parentDir);
        }
    }
    
    /**
     * 加载文件列表
     */
    async loadFiles(forceRefresh = false) {
        try {
            this.placeholder.style.display = 'block';
            this.placeholder.textContent = '加载中...';
            this.gallery.classList.add('lie-loading');
            
            const params = new URLSearchParams({
                directory: this.currentDir,
                force_refresh: forceRefresh
            });
            
            const response = await api.fetchApi(`/imageloader/files?${params}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.allItems = data.items || [];
            this.parentDir = data.parent_directory;
            this.currentDir = data.current_directory;
            
            // ⚠️ 如果是第一次加载，保存 input 目录路径
            if (!this.inputDir && !this.parentDir) {
                this.inputDir = this.currentDir;
            }
            
            this.upBtn.disabled = !this.parentDir;
            this.renderBreadcrumb();
            this.applyFiltersAndSort();
            
        } catch (error) {
            console.error('加载文件失败:', error);
            this.placeholder.textContent = `错误: ${error.message}`;
            this.placeholder.style.color = 'red';
        } finally {
            this.gallery.classList.remove('lie-loading');
        }
    }
    
    /**
     * 应用过滤和排序
     */
    applyFiltersAndSort() {
        let filteredItems = [...this.allItems];
        
        // ⭐ 只显示文件夹和图片
        filteredItems = filteredItems.filter(item => {
            return item.type === 'folder' || item.type === 'image';
        });
        
        // ⭐ 根据过滤类型应用过滤
        if (this.filterType !== 'none' && this.filterValue) {
            filteredItems = filteredItems.filter(item => {
                // 文件夹始终显示
                if (item.type === 'folder') return true;
                
                switch(this.filterType) {
                    case 'filename':
                        // 文件名包含关键词（不区分大小写）
                        return item.name.toLowerCase().includes(this.filterValue.toLowerCase());
                    
                    case 'tags':
                        // 标签过滤（支持逗号分隔的多个标签）
                        const filterTags = this.filterValue.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                        if (filterTags.length === 0) return true;
                        const itemTags = (item.tags || []).map(t => t.toLowerCase());
                        // 只要包含任意一个标签就显示
                        return filterTags.some(ft => itemTags.includes(ft));
                    
                    case 'rating':
                        // 星标过滤（大于等于指定星级）
                        const minRating = parseInt(this.filterValue);
                        if (minRating === 0) return true;
                        return (item.rating || 0) >= minRating;
                    
                    default:
                        return true;
                }
            });
        }
        
        // 排序
        filteredItems.sort((a, b) => {
            // 文件夹始终在前
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            
            let compareResult = 0;
            
            if (this.sortBy === 'name') {
                compareResult = a.name.localeCompare(b.name, undefined, { numeric: true });
            } else if (this.sortBy === 'date') {
                compareResult = (a.mtime || 0) - (b.mtime || 0);
            } else if (this.sortBy === 'rating') {
                compareResult = (a.rating || 0) - (b.rating || 0);
            }
            
            return this.sortOrder === 'asc' ? compareResult : -compareResult;
        });
        
        this.allItems = filteredItems;
        this.itemCountSpan.textContent = `${filteredItems.length} 项`;
        
        if (filteredItems.length === 0) {
            this.placeholder.textContent = '没有找到文件';
            this.placeholder.style.display = 'block';
        } else {
            this.placeholder.style.display = 'none';
        }
        
        this.calculateLayout();
    }
    
    /**
     * 计算布局 - 规整网格算法
     */
    calculateLayout() {
        const containerWidth = this.gallery.clientWidth;
        if (containerWidth === 0 || this.allItems.length === 0) {
            this.gallery.style.height = '0px';
            this.layoutData = [];
            return;
        }
        
        // ⭐ 计算列数和卡片宽度（左右完全对称）
        const leftPadding = 6; // 左侧 padding
        const rightPadding = 6; // 右侧 padding（滚动条完全在这6px内）
        const topPadding = 6; // ⭐ 顶部 padding
        const availableWidth = containerWidth - leftPadding - rightPadding;
        
        this.columnCount = Math.max(1, Math.floor(availableWidth / (this.minCardWidth + this.gap)));
        const totalGapSpace = (this.columnCount - 1) * this.gap;
        this.cardWidth = (availableWidth - totalGapSpace) / this.columnCount;
        
        // ⭐ 计算动态信息面板高度
        const infoPanelHeight = this.getInfoPanelHeight();
        
        // ⭐ 计算固定的卡片高度（正方形 + 信息面板）
        const imageAreaHeight = this.cardWidth; // 图片区域为正方形
        const fixedCardHeight = imageAreaHeight + infoPanelHeight;
        
        // ⭐ 规整网格布局：按行列排列
        this.layoutData = this.allItems.map((item, index) => {
            const rowIndex = Math.floor(index / this.columnCount);
            const columnIndex = index % this.columnCount;
            
            // ⭐ 所有卡片使用相同的固定高度
            const cardHeight = fixedCardHeight;
            
            const position = {
                left: leftPadding + columnIndex * (this.cardWidth + this.gap),
                top: topPadding + rowIndex * (fixedCardHeight + this.gap),
                width: this.cardWidth,
                height: cardHeight,
                rowIndex: rowIndex,
                columnIndex: columnIndex
            };
            
            return position;
        });
        
        // ⭐ 设置容器总高度（基于总行数）
        const totalRows = Math.ceil(this.allItems.length / this.columnCount);
        const totalHeight = topPadding + totalRows * (fixedCardHeight + this.gap);
        this.gallery.style.height = `${totalHeight}px`;
        
        this.updateVisibleItems();
    }
    
    /**
     * 更新可见项 - 虚拟滚动渲染
     */
    updateVisibleItems() {
        const scrollTop = this.gallery.scrollTop;
        const viewHeight = this.gallery.clientHeight;
        const viewStart = scrollTop - this.virtualPadding;
        const viewEnd = scrollTop + viewHeight + this.virtualPadding;
        
        // 找出可见范围内的项
        const visibleItems = [];
        this.allItems.forEach((item, index) => {
            const layout = this.layoutData[index];
            if (!layout) return;
            
            const itemTop = layout.top;
            const itemBottom = layout.top + layout.height;
            
            if (itemBottom > viewStart && itemTop < viewEnd) {
                visibleItems.push({ item, index, layout });
            }
        });
        
        // 获取已存在的卡片
        const existingCards = new Map(
            Array.from(this.gallery.querySelectorAll('.lie-card'))
                .map(card => [card.dataset.path, card])
        );
        
        const visiblePaths = new Set(visibleItems.map(vi => vi.item.path || vi.item.name));
        
        // 移除不可见的卡片
        existingCards.forEach((card, path) => {
            if (!visiblePaths.has(path)) {
                card.remove();
            }
        });
        
        // 添加或更新可见卡片
        visibleItems.forEach(({ item, index, layout }) => {
            const path = item.path || item.name;
            let card = existingCards.get(path);
            
            if (!card) {
                card = this.createCard(item);
                this.gallery.appendChild(card);
            }
            
            // 更新位置和尺寸
            card.style.left = `${layout.left}px`;
            card.style.top = `${layout.top}px`;
            card.style.width = `${layout.width}px`;
            card.style.height = `${layout.height}px`; // ⭐ 设置固定高度
            
            // 更新选中状态
            const isSelected = this.selectedItems.some(sel => (sel.path || sel.name) === path);
            card.classList.toggle('selected', isSelected);
            
            // ⭐ 同步复选框状态
            const checkbox = card.querySelector('.lie-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
            
            const isEditing = this.editingItems.has(path);
            card.classList.toggle('edit-mode', isEditing);
        });
        
        this.updateSelectionUI();
    }
    
    /**
     * ⭐ 刷新所有卡片（强制重新创建）
     */
    refreshAllCards() {
        // 移除所有现有卡片
        const allCards = this.gallery.querySelectorAll('.lie-card');
        allCards.forEach(card => card.remove());
        
        // 重新渲染可见卡片
        this.updateVisibleItems();
    }
    
    /**
     * 创建卡片元素
     */
    createCard(item) {
        const card = document.createElement('div');
        card.className = 'lie-card';
        card.dataset.path = item.path || item.name;
        card.dataset.type = item.type;
        
        if (item.type === 'folder') {
            // 文件夹卡片
            card.innerHTML = `
                <div class="lie-card-media">
                    <div class="lie-folder-card">
                        <div class="lie-folder-icon">
                            <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                                <path d="M928 320H488L416 232c-15.1-18.9-38.3-29.9-63.1-29.9H128c-35.3 0-64 28.7-64 64v512c0 35.3 28.7 64 64 64h800c35.3 0 64-28.7 64-64V384c0-35.3-28.7-64-64-64z" fill="#F4D03F"></path>
                            </svg>
                        </div>
                        <div class="lie-folder-name">${item.name}</div>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                // 文件夹点击 - 导航到子目录
                const folderPath = item.path || (this.currentDir + '/' + item.name);
                this.navigateTo(folderPath);
            });
        } else if (item.type === 'image' || item.type === 'video') {
            // 图片/视频卡片
            const thumbnailUrl = `/imageloader/thumbnail?filepath=${encodeURIComponent(item.path)}&t=${item.mtime || Date.now()}`;
            
            const videoOverlay = item.type === 'video' ? `
                <div class="lie-video-overlay">
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                        <path d="M895.9 203.4H128.1c-35.3 0-64 28.7-64 64v489.2c0 35.3 28.7 64 64 64h767.8c35.3 0 64-28.7 64-64V267.4c0-35.3-28.7-64-64-64zM384 691.2V332.8L668.1 512 384 691.2z" fill="#FFD700"></path>
                    </svg>
                </div>
            ` : '';
            
            // ⭐ 根据设置应用图片填充模式
            const imageFitClass = this.settings.imageFit === 'contain' ? 'fit-contain' : 'fit-cover';
            
            card.innerHTML = `
                <div class="lie-card-media ${imageFitClass}">
                    <div class="lie-checkbox-wrapper">
                        <input type="checkbox" class="lie-checkbox">
                    </div>
                    <img src="${thumbnailUrl}" loading="lazy" alt="${item.name}">
                    ${videoOverlay}
                </div>
                <div class="lie-card-info">
                    <div class="lie-info-top" style="display: ${this.settings.showRating ? 'flex' : 'none'};">
                        <div class="lie-star-rating">
                            ${this.createStars(item.rating || 0)}
                        </div>
                        <button class="lie-edit-btn" title="编辑标签">
                            <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M42.1691 29.2451L29.2631 42.1511C28.5879 42.8271 27.6716 43.2069 26.7161 43.2069C25.7606 43.2069 24.8444 42.8271 24.1691 42.1511L8 26V8H26L42.1691 24.1691C43.5649 25.5732 43.5649 27.841 42.1691 29.2451Z" fill="none" stroke="#c3c3c3" stroke-width="4" stroke-linejoin="round"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M18.5 21C19.8807 21 21 19.8807 21 18.5C21 17.1193 19.8807 16 18.5 16C17.1193 16 16 17.1193 16 18.5C16 19.8807 17.1193 21 18.5 21Z" fill="#c3c3c3"/>
                            </svg>
                        </button>
                        ${item.has_workflow ? '<div class="lie-workflow-badge">Workflow</div>' : ''}
                    </div>
                    <div class="lie-filename" title="${item.name}" style="display: ${this.settings.showFilename ? 'block' : 'none'};">${item.name}</div>
                    <div class="lie-tags" style="display: ${this.settings.showTags ? 'flex' : 'none'};">
                        ${(item.tags || []).map(tag => `<span class="lie-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
            
            // ⭐ 图片加载事件 - 网格布局不需要重新计算布局
            // 因为所有卡片高度固定，图片宽高比不影响布局
            
            // ⭐ 复选框事件
            const checkbox = card.querySelector('.lie-checkbox');
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSelection(item);
            });
            
            // 点击图片预览
            const mediaEl = card.querySelector('.lie-card-media');
            mediaEl.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd + 点击 = 多选
                    this.toggleSelection(item);
                } else if (e.shiftKey) {
                    // Shift + 点击 = 范围选择
                    this.selectRange(item);
                } else {
                    // 普通点击 = 选择并关闭
                    // 使用 relative_path 而不是 path，因为ComfyUI期望的是相对路径
                    const imagePath = item.relative_path || item.name;
                    this.options.onSelect(imagePath);
                    this.close();
                }
            });
            
            // 星级评分
            const stars = card.querySelectorAll('.lie-star');
            stars.forEach((star, index) => {
                star.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const rating = index + 1;
                    // ⭐ 如果点击的是当前评分，则取消评分（变为0星）
                    const newRating = (item.rating === rating) ? 0 : rating;
                    await this.updateRating(item, newRating);
                });
                
                star.addEventListener('mouseenter', () => {
                    this.highlightStars(stars, index);
                });
            });
            
            const ratingEl = card.querySelector('.lie-star-rating');
            ratingEl.addEventListener('mouseleave', () => {
                // ⭐ 修复：使用 ?? 而不是 ||，以支持 0 星
                const currentRating = (item.rating ?? 0);
                this.highlightStars(stars, currentRating - 1);
            });
            
            // 编辑按钮
            const editBtn = card.querySelector('.lie-edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEditing(item, e.ctrlKey || e.metaKey);
            });
            
            // 工作流徽章
            const workflowBadge = card.querySelector('.lie-workflow-badge');
            if (workflowBadge) {
                workflowBadge.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.loadWorkflow(item);
                });
            }
            
            // 标签点击过滤
            const tagEls = card.querySelectorAll('.lie-tag');
            tagEls.forEach(tagEl => {
                tagEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tag = tagEl.textContent;
                    if (!this.filterTags.includes(tag)) {
                        this.filterTags.push(tag);
                        this.tagInput.value = this.filterTags.join(', ');
                        this.applyFiltersAndSort();
                    }
                });
            });
        }
        
        return card;
    }
    
    /**
     * 创建星级评分 HTML
     */
    createStars(rating) {
        return Array.from({ length: 5 }, (_, i) => {
            const filled = i < rating;
            const star = filled ? '★' : '☆';
            const className = filled ? 'lie-star rated' : 'lie-star';
            return `<span class="${className}" data-value="${i + 1}">${star}</span>`;
        }).join('');
    }
    
    /**
     * 高亮星级
     */
    highlightStars(stars, upToIndex) {
        stars.forEach((star, index) => {
            if (index <= upToIndex) {
                star.classList.add('hover');
                star.textContent = '★';
            } else {
                star.classList.remove('hover');
                const isRated = star.classList.contains('rated');
                star.textContent = isRated ? '★' : '☆';
            }
        });
    }
    
    /**
     * 更新评分
     */
    async updateRating(item, rating) {
        try {
            await api.fetchApi('/imageloader/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: item.path, rating })
            });
            
            item.rating = rating;
            this.updateVisibleItems();
        } catch (error) {
            console.error('更新评分失败:', error);
        }
    }
    
    /**
     * 切换选中状态
     */
    toggleSelection(item) {
        const index = this.selectedItems.findIndex(sel => 
            (sel.path || sel.name) === (item.path || item.name)
        );
        
        if (index > -1) {
            this.selectedItems.splice(index, 1);
        } else {
            this.selectedItems.push(item);
        }
        
        this.updateVisibleItems();
    }
    
    /**
     * 范围选择
     */
    selectRange(item) {
        if (this.selectedItems.length === 0) {
            this.selectedItems.push(item);
        } else {
            const lastSelected = this.selectedItems[this.selectedItems.length - 1];
            const lastIndex = this.allItems.indexOf(lastSelected);
            const currentIndex = this.allItems.indexOf(item);
            
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            
            for (let i = start; i <= end; i++) {
                const rangeItem = this.allItems[i];
                if (rangeItem.type !== 'folder' && !this.selectedItems.includes(rangeItem)) {
                    this.selectedItems.push(rangeItem);
                }
            }
        }
        
        this.updateVisibleItems();
    }
    
    /**
     * 切换编辑状态
     */
    toggleEditing(item, multiSelect = false) {
        const path = item.path || item.name;
        
        if (multiSelect) {
            // 多选模式
            if (this.editingItems.has(path)) {
                this.editingItems.delete(path);
            } else {
                this.editingItems.add(path);
            }
        } else {
            // 单选模式
            if (this.editingItems.has(path) && this.editingItems.size === 1) {
                this.editingItems.clear();
            } else {
                this.editingItems.clear();
                this.editingItems.add(path);
            }
        }
        
        this.renderTagEditor();
        this.updateVisibleItems();
    }
    
    /**
     * 加载工作流
     */
    async loadWorkflow(item) {
        try {
            const response = await fetch(`/view?filename=${encodeURIComponent(item.name)}&type=input`);
            const blob = await response.blob();
            const file = new File([blob], item.name, { type: blob.type });
            
            if (app.handleFile) {
                app.handleFile(file);
                showMessage('工作流加载成功');
            }
        } catch (error) {
            console.error('加载工作流失败:', error);
            showMessage('加载工作流失败: ' + error.message);
        }
    }
    
    /**
     * 全选
     */
    selectAll() {
        this.selectedItems = this.allItems.filter(item => item.type !== 'folder');
        this.updateSelectionUI();
    }
    
    /**
     * 批量删除
     */
    async batchDelete() {
        await this.deleteSelected();
    }
    
    /**
     * ⭐ 切换批量标签模式
     */
    toggleBatchTagging() {
        if (this.selectedItems.length === 0) return;
        
        // 清空单图编辑模式
        this.editingItems.clear();
        
        // 将所有选中项添加到编辑列表
        this.selectedItems.forEach(item => {
            const path = item.path || item.name;
            this.editingItems.add(path);
        });
        
        this.renderTagEditor();
        this.updateVisibleItems();
        
        // ⭐ 自动聚焦到输入框（延迟确保面板已渲染）
        setTimeout(() => {
            if (this.tagEditInput && this.metadataPanel.classList.contains('show')) {
                this.tagEditInput.focus();
            }
        }, 150);
    }
    
    /**
     * ⭐ 切换设置面板
     */
    toggleSettings() {
        if (this.settingsPanel.style.display === 'block') {
            this.settingsPanel.style.display = 'none';
        } else {
            this.settingsPanel.style.display = 'block';
        }
    }
    
    /**
     * 删除选中项
     */
    async deleteSelected() {
        if (this.selectedItems.length === 0) return;
        
        const confirm = window.confirm(`确定要删除 ${this.selectedItems.length} 个文件吗?`);
        if (!confirm) return;
        
        try {
            for (const item of this.selectedItems) {
                await api.fetchApi('/imageloader/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: item.path })
                });
            }
            
            // ⭐ 删除成功后不显示提示，直接刷新
            this.selectedItems = [];
            this.loadFiles(true);
        } catch (error) {
            console.error('删除失败:', error);
            // ⭐ 只在失败时显示错误提示
            alert(`删除失败: ${error.message}`);
        }
    }
    
    /**
     * 添加标签到选中项
     */
    async addTagToSelected(tag) {
        if (!tag || this.editingItems.size === 0) return;
        
        try {
            for (const path of this.editingItems) {
                const item = this.allItems.find(i => i.path === path);
                if (item) {
                    // ⭐ 修复：确保 item.tags 是数组
                    const currentTags = item.tags || [];
                    const newTags = [...new Set([...currentTags, tag])];
                    await api.fetchApi('/imageloader/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, tags: newTags })
                    });
                    item.tags = newTags;
                    
                    // ⭐ 移除对应的卡片DOM，强制重新渲染
                    const card = this.gallery.querySelector(`[data-path="${path}"]`);
                    if (card) {
                        card.remove();
                    }
                }
            }
            
            this.renderTagEditor();
            this.updateVisibleItems();
        } catch (error) {
            console.error('添加标签失败:', error);
        }
    }
    
    /**
     * 渲染标签编辑器
     */
    renderTagEditor() {
        this.editCountSpan.textContent = this.editingItems.size;
        
        if (this.editingItems.size === 0) {
            this.metadataPanel.classList.remove('show');
            return;
        }
        
        this.metadataPanel.classList.add('show');
        
        // 找出公共标签
        const itemsToEdit = this.allItems.filter(item => {
            const itemPath = item.path || item.name;
            return this.editingItems.has(itemPath);
        });
        
        const allTagArrays = itemsToEdit.map(item => item.tags || []);
        const commonTags = allTagArrays.length > 0 
            ? allTagArrays.reduce((acc, tags) => acc.filter(tag => tags.includes(tag)))
            : [];
        
        this.tagEditor.innerHTML = '';
        commonTags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'lie-tag';
            tagEl.textContent = tag;
            
            const removeEl = document.createElement('span');
            removeEl.className = 'lie-tag-remove';
            removeEl.textContent = ' ⓧ';
            removeEl.addEventListener('click', () => this.removeTagFromSelected(tag));
            
            tagEl.appendChild(removeEl);
            this.tagEditor.appendChild(tagEl);
        });
    }
    
    /**
     * 从选中项移除标签
     */
    async removeTagFromSelected(tag) {
        try {
            for (const path of this.editingItems) {
                const item = this.allItems.find(i => i.path === path);
                if (item) {
                    // ⭐ 修复：确保 item.tags 是数组
                    const currentTags = item.tags || [];
                    const newTags = currentTags.filter(t => t !== tag);
                    await api.fetchApi('/imageloader/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, tags: newTags })
                    });
                    item.tags = newTags;
                    
                    // ⭐ 移除对应的卡片DOM，强制重新渲染
                    const card = this.gallery.querySelector(`[data-path="${path}"]`);
                    if (card) {
                        card.remove();
                    }
                }
            }
            
            this.renderTagEditor();
            this.updateVisibleItems();
        } catch (error) {
            console.error('移除标签失败:', error);
        }
    }
    
    /**
     * 更新选择状态UI
     */
    updateSelectionUI() {
        this.selectedCountSpan.textContent = this.selectedItems.length > 0 
            ? ` | 已选 ${this.selectedItems.length}` 
            : '';
        
        // ⭐ 启用/禁用批量按钮
        const hasSelection = this.selectedItems.length > 0;
        this.batchTagBtn.disabled = !hasSelection;
        this.batchDeleteBtn.disabled = !hasSelection;
    }
    
    /**
     * 显示浏览器
     */
    show() {
        // ⭐ 先添加遮罩层
        document.body.appendChild(this.backdrop);
        // ⭐ 再添加弹窗
        document.body.appendChild(this.container);
        
        // ⭐ 强制浏览器完成布局计算
        void this.container.offsetHeight;
        
        // ⭐ 设置初始 transform（稍微缩小）
        this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        // ⭐ 添加过渡效果
        this.container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this.backdrop.style.transition = 'opacity 0.2s ease';
        
        // ⭐ 在下一帧触发动画
        requestAnimationFrame(() => {
            this.backdrop.style.opacity = '1';
            this.container.style.opacity = '1';
            this.container.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        // 如果没有指定inputDir,使用默认值
        if (!this.currentDir) {
            // 从 API 获取默认输入目录
            this.loadDefaultDir();
        } else {
            this.loadFiles(false);
        }
    }
    
    /**
     * 加载默认目录
     */
    async loadDefaultDir() {
        try {
            const response = await api.fetchApi('/imageloader/files');
            const data = await response.json();
            
            if (data.current_directory) {
                // ⚠️ 保存 input 目录路径
                this.inputDir = data.current_directory;
                
                // ⭐ 如果有 startDir，则跳转到对应的目录
                if (this.options.startDir) {
                    // 拼接完整路径
                    const fullPath = this.inputDir + '/' + this.options.startDir;
                    this.currentDir = fullPath.replace(/\/+/g, '/'); // 清理多余的斜杠
                } else {
                    this.currentDir = data.current_directory;
                }
                
                this.loadFiles(false);
            } else {
                this.placeholder.textContent = '无法获取默认目录';
                this.placeholder.style.display = 'block';
            }
        } catch (error) {
            console.error('加载默认目录失败:', error);
            this.placeholder.textContent = `错误: ${error.message}`;
            this.placeholder.style.color = 'red';
        }
    }
    
    /**
     * 关闭浏览器
     */
    close() {
        // ⭐ 添加关闭动画
        this.container.style.opacity = '0';
        this.container.style.transform = 'translate(-50%, -50%) scale(0.9)';
        this.backdrop.style.opacity = '0';
        
        // ⭐ 等待动画完成后移除元素
        setTimeout(() => {
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            if (this.backdrop.parentNode) {
                this.backdrop.parentNode.removeChild(this.backdrop);
            }
            
            // ⭐ 移除事件监听
            document.removeEventListener('keydown', this.handleKeyDown);
            
            this.options.onClose();
        }, 200); // 等待动画完成
    }
}

// ==================== ComfyUI 扩展注册 ====================

const ext = {
    name: "LoadImageEnhanced",
    
    async init() {
        console.log(`\x1b[92m[LoadImageEnhanced]\x1b[0m Frontend v${VERSION} loaded`);
        
        // 注入CSS样式
        await injectCss("/extensions/ComfyUI-CC-ImageLoader/css/imageloader_enhanced.css");
        
        // 劫持 LiteGraph.ContextMenu
        const ctxMenu = LiteGraph.ContextMenu;
        
        LiteGraph.ContextMenu = function(values, options) {
            // 获取当前节点
            const getCurrentNode = () => {
                try {
                    return LGraphCanvas.active_canvas?.current_node;
                } catch (e) {
                    return null;
                }
            };
            
            const currentNode = getCurrentNode();
            
            if (DEBUG) {
                console.log('ContextMenu called');
                console.log('Current node:', currentNode);
                console.log('Node type:', currentNode?.type);
                console.log('Options className:', options?.className);
                console.log('Values length:', values?.length);
            }
            
            // 重要: 只处理 LoadImage 节点的 combo 下拉菜单 (dark 主题)
            // 这样可以避免劫持右键菜单
            if (currentNode?.type !== "LoadImage" || options?.className !== "dark" || !values?.length) {
                return ctxMenu.call(this, values, options);
            }
            
            // 检查是否启用增强模式
            const enableEnhanced = true;
            
            if (!enableEnhanced) {
                return ctxMenu.call(this, values, options);
            }
            
            // ⭐ 获取当前节点已选择的图片路径
            let currentImagePath = '';
            let startDir = ''; // 起始目录
            
            try {
                const widget = currentNode.widgets?.find(w => 
                    w.type === "combo" && 
                    w.name === "image"
                );
                
                if (widget && widget.value) {
                    currentImagePath = widget.value;
                    
                    // 通过 folder_paths.get_annotated_filepath 获取完整路径
                    // 但我们需要从后端获取，所以先使用 API
                    // 这里简单处理：如果包含路径分隔符，取父目录
                    if (currentImagePath.includes('/') || currentImagePath.includes('\\')) {
                        const parts = currentImagePath.replace(/\\/g, '/').split('/');
                        parts.pop(); // 移除文件名
                        const relativeDir = parts.join('/');
                        
                        // startDir 会在 show() 时与 inputDir 拼接
                        startDir = relativeDir;
                    }
                }
            } catch (e) {
                console.warn('Failed to get current image path:', e);
            }
            
            // 创建增强图片浏览器
            const gallery = new ImageGallery({
                inputDir: '', // 从 folder_paths 获取
                startDir: startDir, // ⭐ 传入起始目录（相对路径）
                onSelect: (selectedPath) => {
                    if (DEBUG) console.log('Image selected:', selectedPath);
                    
                    // 使用 requestAnimationFrame 确保在正确的时机更新
                    requestAnimationFrame(() => {
                        const node = LGraphCanvas.active_canvas?.current_node;
                        if (!node) {
                            console.error('No current node found');
                            return;
                        }
                        
                        // 查找对应的 widget
                        const widget = node.widgets?.find(w => 
                            w.type === "combo" && 
                            w.name === "image" &&
                            w.options.values.length === values.length
                        );
                        
                        if (widget) {
                            if (DEBUG) console.log('Found widget:', widget);
                            
                            // 更新 widget 值（使用相对路径）
                            widget.value = selectedPath;
                            
                            // 触发 widget 的 callback
                            if (widget.callback) {
                                widget.callback(selectedPath);
                            }
                            
                            // 强制图形重绘
                            if (app.graph) {
                                app.graph.setDirtyCanvas(true, true);
                            }
                            
                            // 触发节点更新
                            if (node.onResize) {
                                node.onResize(node.size);
                            }
                            
                            if (DEBUG) console.log('Widget value updated to:', selectedPath);
                        } else {
                            console.error('Widget not found');
                        }
                    });
                    
                    // 关闭浏览器
                    gallery.close();
                },
                onClose: () => {
                    if (DEBUG) console.log('Gallery closed');
                }
            });
            
            // 立即显示浏览器（不创建原始菜单，避免闪烁）
            gallery.show();
            
            // 返回一个空的菜单对象，避免报错
            return {
                close: () => {},
                root: null
            };
        };
        
        LiteGraph.ContextMenu.prototype = ctxMenu.prototype;
    }
};

app.registerExtension(ext);
