import torch
import os
import sys
import hashlib
import json
import time
from pathlib import Path
from PIL import Image, ImageOps, ImageSequence, ImageFile, UnidentifiedImageError
import numpy as np
from aiohttp import web
from server import PromptServer
import folder_paths

VERSION = "1.0.0"
DEBUG = False

# 配置文件路径
NODE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(NODE_DIR, "config.json")
METADATA_FILE = os.path.join(NODE_DIR, "metadata.json")
CACHE_DIR = os.path.join(NODE_DIR, ".cache")
THUMBNAIL_CACHE_DIR = os.path.join(CACHE_DIR, "thumbnails")

# 支持的文件格式
SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tiff', '.tif']
SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi']


def ensure_cache_dirs():
    """确保缓存目录存在"""
    os.makedirs(THUMBNAIL_CACHE_DIR, exist_ok=True)


ensure_cache_dirs()


def load_config():
    """加载配置文件"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"LoadImageEnhanced: Error loading config: {e}")
    return {}


def save_config(data):
    """保存配置文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"LoadImageEnhanced: Error saving config: {e}")


def load_metadata():
    """加载元数据"""
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"LoadImageEnhanced: Error loading metadata: {e}")
    return {}


def save_metadata(data):
    """保存元数据"""
    try:
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"LoadImageEnhanced: Error saving metadata: {e}")


def get_file_hash(filepath):
    """获取文件的MD5哈希值"""
    try:
        hasher = hashlib.md5()
        hasher.update(filepath.encode('utf-8'))
        stat = os.stat(filepath)
        hasher.update(str(stat.st_mtime).encode('utf-8'))
        return hasher.hexdigest()
    except Exception:
        return hashlib.md5(filepath.encode('utf-8')).hexdigest()


def get_thumbnail_path(filepath):
    """获取缩略图缓存路径"""
    file_hash = get_file_hash(filepath)
    return os.path.join(THUMBNAIL_CACHE_DIR, f"{file_hash}.webp")


def create_thumbnail(image_path, max_size=400):
    """创建缩略图"""
    try:
        thumbnail_path = get_thumbnail_path(image_path)
        
        # 如果缓存存在且文件未修改,直接返回
        if os.path.exists(thumbnail_path):
            cache_mtime = os.path.getmtime(thumbnail_path)
            source_mtime = os.path.getmtime(image_path)
            if cache_mtime > source_mtime:
                return thumbnail_path
        
        # 生成缩略图
        with Image.open(image_path) as img:
            # 处理 EXIF 旋转
            img = ImageOps.exif_transpose(img)
            
            # 转换为 RGB
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 计算缩略图尺寸
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # 保存为 WebP 格式
            img.save(thumbnail_path, 'WEBP', quality=85)
            
        return thumbnail_path
    except Exception as e:
        if DEBUG:
            print(f"LoadImageEnhanced: Error creating thumbnail for {image_path}: {e}")
        return None


def myPillow(fn, arg):
    """处理 PIL 图片加载错误"""
    prev_value = None
    try:
        x = fn(arg)
    except (OSError, UnidentifiedImageError, ValueError):
        prev_value = ImageFile.LOAD_TRUNCATED_IMAGES
        ImageFile.LOAD_TRUNCATED_IMAGES = True
        x = fn(arg)
    finally:
        if prev_value is not None:
            ImageFile.LOAD_TRUNCATED_IMAGES = prev_value
    return x


def scan_directory(directory, recursive=True):
    """扫描目录,返回文件和文件夹结构"""
    if not os.path.isdir(directory):
        return []
    
    items = []
    metadata = load_metadata()
    input_dir = folder_paths.get_input_directory()
    
    try:
        for entry in os.scandir(directory):
            try:
                full_path = entry.path
                name = entry.name
                
                # 跳过隐藏文件和缓存目录
                if name.startswith('.'):
                    continue
                
                item_meta = metadata.get(full_path, {})
                
                if entry.is_dir():
                    # 如果是文件夹,递归扫描获取文件列表
                    sub_files = []
                    if recursive:
                        for sub_entry in os.scandir(full_path):
                            if sub_entry.is_file():
                                ext = os.path.splitext(sub_entry.name)[1].lower()
                                if ext in SUPPORTED_IMAGE_EXTENSIONS:
                                    sub_files.append(sub_entry.name)
                    
                    items.append({
                        'name': name,
                        'type': 'folder',
                        'files': sub_files
                    })
                elif entry.is_file():
                    ext = os.path.splitext(name)[1].lower()
                    if ext in SUPPORTED_IMAGE_EXTENSIONS:
                        stat = entry.stat()
                        # 计算相对于input目录的路径
                        try:
                            relative_path = os.path.relpath(full_path, input_dir)
                            # 在Windows上转换路径分隔符为正斜杠
                            relative_path = relative_path.replace(os.sep, '/')
                        except ValueError:
                            # 如果无法计算相对路径,使用文件名
                            relative_path = name
                        
                        items.append({
                            'name': name,
                            'type': 'image',
                            'path': full_path,  # 用于缩略图等
                            'relative_path': relative_path,  # 用于LoadImage
                            'mtime': stat.st_mtime,
                            'size': stat.st_size,
                            'rating': item_meta.get('rating', 0),
                            'tags': item_meta.get('tags', [])
                        })
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError) as e:
        print(f"LoadImageEnhanced: Error scanning directory {directory}: {e}")
    
    return items


class LoadImageEnhanced:
    """增强型图片加载节点"""
    
    print(f"\033[92m[LoadImageEnhanced]\033[0m version: {VERSION}")
    
    @classmethod
    def INPUT_TYPES(cls):
        input_dir = folder_paths.get_input_directory()
        
        # 扫描输入目录
        items = scan_directory(input_dir, recursive=True)
        
        # 构建选项列表(文件夹对象 + 文件名)
        folder_objects = []
        files = []
        
        for item in items:
            if item['type'] == 'folder':
                folder_objects.append({
                    'name': item['name'],
                    'files': item['files']
                })
            else:
                files.append(item['name'])
        
        # 合并列表:文件夹对象在前,文件名在后
        options = folder_objects + sorted(files, key=str.upper)
        
        return {
            "required": {
                "image": (options, {"image_upload": True})
            },
        }
    
    CATEGORY = "image"
    RETURN_TYPES = ("IMAGE", "MASK")
    FUNCTION = "load_image"
    
    def load_image(self, image):
        """加载图片"""
        image_path = folder_paths.get_annotated_filepath(image)
        
        img = myPillow(Image.open, image_path)
        
        output_images = []
        output_masks = []
        w, h = None, None
        
        excluded_formats = ['MPO']
        
        for i in ImageSequence.Iterator(img):
            i = myPillow(ImageOps.exif_transpose, i)
            
            if i.mode == 'I':
                i = i.point(lambda x: x * (1 / 255))
            image = i.convert("RGB")
            
            if len(output_images) == 0:
                w = image.size[0]
                h = image.size[1]
            
            if image.size[0] != w or image.size[1] != h:
                continue
            
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            else:
                mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")
            
            output_images.append(image)
            output_masks.append(mask.unsqueeze(0))
        
        if len(output_images) > 1 and img.format not in excluded_formats:
            output_image = torch.cat(output_images, dim=0)
            output_mask = torch.cat(output_masks, dim=0)
        else:
            output_image = output_images[0]
            output_mask = output_masks[0]
        
        return (output_image, output_mask)
    
    @classmethod
    def IS_CHANGED(cls, image):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()
    
    @classmethod
    def VALIDATE_INPUTS(cls, image):
        if not folder_paths.exists_annotated_filepath(image):
            return f"Invalid image file: {image}"
        return True


# ==================== API 路由 ====================

prompt_server = PromptServer.instance


@prompt_server.routes.get("/imageloader/thumbnail")
async def get_thumbnail(request):
    """获取缩略图"""
    filepath = request.query.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return web.Response(status=404)
    
    try:
        ext = os.path.splitext(filepath)[1].lower()
        if ext in SUPPORTED_IMAGE_EXTENSIONS:
            thumbnail_path = create_thumbnail(filepath)
            if thumbnail_path and os.path.exists(thumbnail_path):
                return web.FileResponse(thumbnail_path)
        
        # 如果无法生成缩略图,返回原图
        return web.FileResponse(filepath)
    except Exception as e:
        print(f"LoadImageEnhanced: Error serving thumbnail: {e}")
        return web.Response(status=500)


@prompt_server.routes.get("/imageloader/files")
async def get_files(request):
    """获取文件列表"""
    directory = request.query.get('directory', '')
    
    if not directory:
        directory = folder_paths.get_input_directory()
    
    if not os.path.isdir(directory):
        return web.json_response({"error": "Invalid directory"}, status=400)
    
    try:
        items = scan_directory(directory, recursive=False)
        parent_dir = os.path.dirname(directory) if directory != folder_paths.get_input_directory() else None
        
        return web.json_response({
            "items": items,
            "current_directory": directory,
            "parent_directory": parent_dir
        })
    except Exception as e:
        print(f"LoadImageEnhanced: Error getting files: {e}")
        return web.json_response({"error": str(e)}, status=500)


@prompt_server.routes.post("/imageloader/metadata")
async def update_metadata_route(request):
    """更新元数据"""
    try:
        data = await request.json()
        path = data.get("path")
        rating = data.get("rating")
        tags = data.get("tags")
        
        if not path or not os.path.exists(path):
            return web.json_response({"error": "Invalid path"}, status=400)
        
        metadata = load_metadata()
        
        if path not in metadata:
            metadata[path] = {}
        
        if rating is not None:
            metadata[path]['rating'] = int(rating)
        if tags is not None:
            metadata[path]['tags'] = [str(tag).strip() for tag in tags if str(tag).strip()]
        
        # 如果评分为0且没有标签,删除元数据条目
        entry = metadata.get(path, {})
        if entry.get('rating', 0) == 0 and not entry.get('tags'):
            del metadata[path]
        
        save_metadata(metadata)
        return web.json_response({"status": "ok"})
    except Exception as e:
        print(f"LoadImageEnhanced: Error updating metadata: {e}")
        return web.json_response({"error": str(e)}, status=500)


@prompt_server.routes.delete("/imageloader/delete")
async def delete_file(request):
    """删除文件"""
    try:
        data = await request.json()
        filepath = data.get("path")
        
        if not filepath or not os.path.exists(filepath):
            return web.json_response({"error": "File not found"}, status=404)
        
        # 删除文件
        os.remove(filepath)
        
        # 删除缩略图缓存
        thumbnail_path = get_thumbnail_path(filepath)
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        
        # 删除元数据
        metadata = load_metadata()
        if filepath in metadata:
            del metadata[filepath]
            save_metadata(metadata)
        
        return web.json_response({"status": "ok"})
    except Exception as e:
        print(f"LoadImageEnhanced: Error deleting file: {e}")
        return web.json_response({"error": str(e)}, status=500)


# ==================== 节点映射 ====================

NODE_CLASS_MAPPINGS = {
    'LoadImage': LoadImageEnhanced,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    'LoadImage': 'Load Image (Enhanced)',
}
