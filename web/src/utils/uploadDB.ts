import { openDB } from 'idb';
/**
 * auth:WuYong
 * annotate：基于indexedDB的文件上传任务持久化存储
 * 1. 用户上传大文件的时候，被分割多个块(chunks)
 * 2. 每块上传成功后，其状态会被标记为uploaded:true
 * 3. 如果上传过程终端，可以通过indexed数据库恢复上传任务状态
 * 4. 重新开始上传时，只需要上传那些uploaded:false的块
 * 5. 可以避免上传已经重复的块，节省实践和带宽
 */

// 文件分块信息，索引和是否已上传的状态
export interface ChunkRecord {
  index: number;
  uploaded: boolean;
}

// 整个上传任务的记录，包含文件名，大小，分块大小，总分块数等信息，以及所有分块上传的装填
export interface UploadTaskRecord {
  id: string; // file md5
  filename: string; // 文件名
  size: number; // 文件大小
  chunkSize: number; // 分块大小
  totalChunks: number; // 总分块数
  chunks: ChunkRecord[]; // 所有分块上传的装填
  createdAt: number; // 创建时间
  updatedAt: number; // 更新时间
}

const DB_NAME = 'FileUploadDB'; // 数据库名
const STORE_NAME = 'uploadTasks'; // 存储对象名
const VERSION = 1; // 数据库版本

// 初始化数据库
export const initDB = async () => {
  return openDB<UploadTaskRecord>(DB_NAME, VERSION, {
    upgrade(db) {
      // 创建存储对象
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

// 保存上传任务
export const saveUploadTask = async (task: Omit<UploadTaskRecord, 'updatedAt'> & Partial<UploadTaskRecord>) => {
  const db = await initDB();
  const now = Date.now();
  // 创建上传任务
  await db.put(STORE_NAME, {
    ...task,
    updatedAt: now,
    createdAt: task.createdAt || now,
  });
};

// 获取上传任务
export const getUploadTask = async (id: string): Promise<UploadTaskRecord | null> => {
  const db = await initDB();
  // 获取上传任务
  return await db.get(STORE_NAME, id);
};

// 删除上传任务
export const deleteUploadTask = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};