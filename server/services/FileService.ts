import fs from "fs";
import path from "path";
import { FileRepository } from "../repositories/FileRepository";

export const FileService = {
  getWorkspaceDir: (workspaceId: string) => {
    const dir = path.join(process.cwd(), "data", "workspaces", workspaceId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },

  createItem: (workspaceId: string, relativePath: string, type: 'file' | 'directory', content: string = '') => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path.join(dir, relativePath);
    if (type === 'directory') {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    return fullPath;
  },

  deleteItem: (workspaceId: string, relativePath: string) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const fullPath = path.join(dir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    FileRepository.deleteByPath(workspaceId, relativePath);
  },

  saveFile: (workspaceId: string, fileName: string, content: string) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  },

  deleteFile: (workspaceId: string, fileName: string) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },

  deleteWorkspaceDir: (workspaceId: string) => {
    const dir = path.join(process.cwd(), "data", "workspaces", workspaceId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    // Also delete from data/{workspaceId} if it exists (used in upload)
    const uploadDir = path.join(process.cwd(), "data", workspaceId);
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  },

  renameItem: (workspaceId: string, oldPath: string, newPath: string) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const oldFullPath = path.join(dir, oldPath);
    const newFullPath = path.join(dir, newPath);
    
    if (fs.existsSync(oldFullPath)) {
      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
      fs.renameSync(oldFullPath, newFullPath);
    }
    return newFullPath;
  },

  moveItem: (workspaceId: string, oldPath: string, newParentPath: string) => {
    const dir = FileService.getWorkspaceDir(workspaceId);
    const oldFullPath = path.join(dir, oldPath);
    const newFullPath = path.join(dir, newParentPath, path.basename(oldPath));
    if (fs.existsSync(oldFullPath)) {
      fs.renameSync(oldFullPath, newFullPath);
    }
    return newFullPath;
  },

  getFileTree: (dir: string, baseDir: string = "") => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items.map((item) => {
      const relativePath = path.join(baseDir, item.name).replace(/\\/g, '/');
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        return {
          name: item.name,
          path: relativePath,
          type: "directory",
          children: FileService.getFileTree(fullPath, relativePath),
        };
      }
      return {
        name: item.name,
        path: relativePath,
        type: "file",
        size: fs.statSync(fullPath).size,
        mtime: fs.statSync(fullPath).mtime,
      };
    });
  }
};
