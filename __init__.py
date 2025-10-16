"""
LoadImageEnhanced - 增强型图片加载节点
结合 ComfyUI-Thumbnails 和 ComfyUI_Local_Media_Manager 的优势
提供高性能的图片浏览和管理功能
"""

import nodes
from aiohttp import web
from server import PromptServer
from pathlib import Path

from .LoadImageEnhanced import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

# 覆盖原生 LoadImage 节点
nodes.NODE_CLASS_MAPPINGS['LoadImage'] = NODE_CLASS_MAPPINGS['LoadImage']
nodes.NODE_DISPLAY_NAME_MAPPINGS['LoadImage'] = NODE_DISPLAY_NAME_MAPPINGS['LoadImage']

# 设置 Web 资源目录
WEB_DIRECTORY = "./web"

# 注册静态资源路由(用于加载 assets)
if hasattr(PromptServer, "instance"):
    assets_path = (Path(__file__).parent.absolute() / "web").as_posix()
    PromptServer.instance.app.add_routes([
        web.static("/imageloader_enhanced", assets_path)
    ])

print(f"\033[92m[LoadImageEnhanced]\033[0m Loaded successfully!")
