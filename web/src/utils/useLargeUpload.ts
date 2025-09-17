/**
 * 处理大文件上传，分片上传，断点续传，妙传功能
 */
import { ref } from 'vue';
import axios from 'axios';
import { calculateFileMD5 } from './hashUtils';
import { getUploadTask, saveUploadTask, deleteUploadTask } from './uploadDB';

import { Session, Local } from '@/utils/storage';

export const Key = {
  rememberKey: 'isRemember', // 记住密码的key
  accessTokenKey: 'accessToken', // 访问令牌本地保存的key
  userInfoKey: 'userInfo', // 用户信息本地保存的key
  accountNumber: "accountNumber"
}
// 后端接口
const API_BASE = 'api';

// 上传进度回调
interface UploadProgressCallback {
  (progress: number): void; // 0 ~ 100
}

// 上传结果
interface UploadResult {
  success: boolean;
  message: string;
  fileId?: string;
}

// 控制并发量，比如 3
const CONCURRENCY = 6;

// 创建上传任务
export const useLargeUpload = () => {
  // 上传中
  const uploading = ref(false);
  const progress = ref(0); // 实时百分比（0~100）
  const uploadFile = async (
    file: File,
    datasetId?: string,
    datasetPId?: string,
    datasetName?: string,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> => {
    console.log('开始上传文件：', file);
    const chunkSize = 5 * 1024 * 1024; // 分块大小
    const totalChunks = Math.ceil(file.size / chunkSize); // 总分块数
    const chunks: { index: number; blob: Blob }[] = []; // 所有分块

    // 切片
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize; // 分块开始位置
      console.log(`开始切片：${file.size}`);
      const end = Math.min(file.size, start + chunkSize); // 分块结束位置
      // 创建分块
      chunks.push({
        index: i,
        blob: file.slice(start, end),
      });
    }

    // 1. 计算文件 MD5
    const md5 = await calculateFileMD5(file);
    console.log('文件 MD5:', md5);
    const fileName = file.name ? file.name : 'file';
    const fileExtension = fileName.split('.').pop().toLowerCase(); // 获取后缀并转为小写
    console.log('文件后缀:', fileExtension); // 输出: rar
    console.log('文件信息', file, chunkSize, totalChunks,);
    // 2. 调用初始化接口
    const initRes = await axios.post(`${API_BASE}/carvedYu/dataset/chunk/init`, {
      fileSize: file.size,
      filename: file.name,
      format: fileExtension,
      md5Val: md5,
      shardingCount: totalChunks,
      shardingMaxSize: chunkSize,
      size: file.size,
      md5,

    },
      {
        headers: {
          'Authorization': `Bearer ${Session.get(Key.accessTokenKey)}`, // 替换 yourToken 为实际的 token 值
          'Content-Type': 'application/json',
        }
      });
    const { uploaded, uploadedChunks = [], uploadId = '' } = initRes.data.data;
    console.log('initRes', uploaded, uploadedChunks, uploadId);
    // 秒传
    if (uploaded) {
      onProgress?.(100);
      try {
        // await uploadWithConcurrency(pendingChunks, CONCURRENCY);
        // 5. 所有分片上传完成 → 合并
        await axios.post(`${API_BASE}/carvedYu/dataset/chunk/complete`, {
          md5,
          filename: file.name,
          totalChunks,
          uploadId,
          datasetId,
          datasetPId, datasetName
        });
        await deleteUploadTask(md5);
        uploading.value = false;
        return { success: true, message: "上传成功", fileId: md5 };
      } catch (err) {
        uploading.value = false;
        return { success: false, message: "上传失败，请重试" };
      }
      return { success: true, message: '库中以检索到，秒传成功', fileId: initRes.data.fileId };
    }
    // 3. 获取本地断点状态（IndexedDB）
    let localTask = await getUploadTask(md5);
    let chunkStatus: { index: number; uploaded: boolean }[];

    if (localTask && localTask.totalChunks === totalChunks) {
      chunkStatus = localTask.chunks;
    } else {
      chunkStatus = Array.from({ length: totalChunks }, (_, i) => ({
        index: i,
        uploaded: false,
      }));
    }

    // 合并服务端已上传的分片（断点续传关键）
    uploadedChunks.forEach((index: number) => {
      chunkStatus[index]!.uploaded = true;
    });

    // 保存最新状态
    await saveUploadTask({
      id: md5,
      filename: file.name,
      size: file.size,
      chunkSize,
      totalChunks,
      chunks: chunkStatus,
      createdAt: 0
    });

    uploading.value = true;
    // 4. 上传未完成的分片
    const pendingChunks = chunks.filter(chunk => !chunkStatus[chunk.index]!.uploaded);

    let completed = uploadedChunks.length; // 已完成数量

    // 更新进度
    const updateProgress = () => {
      const p = Math.round((completed / totalChunks) * 100);
      progress.value = p;
      onProgress?.(p);
    };

    updateProgress(); // 初始进度
    /** 控制并发上传*/
    async function uploadWithConcurrency(
      pendingChunks: { index: number; blob: Blob }[],
      limit: number
    ) {
      let completed = uploadedChunks.length; // 已完成的分片数
      let current = 0; // 当前索引
      const results: any[] = [];

      // 启动一个分片上传
      const startUpload = async () => {
        if (current >= pendingChunks.length) return; // 没有更多分片了

        const chunk = pendingChunks[current++];
        const { index, blob } = chunk;
        const formData = new FormData();

        const chunkMd5 = await calculateFileMD5(blob)

        /** 本地Node版本 */
        // formData.append(
        //   'chunk',
        //   blob,
        //   `${md5}_${index}.chunk` //  在文件名里传 md5 和 index
        // );
        // formData.append('md5', md5); // md5
        // formData.append('chunkIndex', index.toString()); // 分块索引
        // formData.append('totalChunks', totalChunks.toString()); // 总分块数
        // formData.append('filename', file.name); // 文件名
        /** 本地浏览器版本Java */
        formData.append(
          'chunkFile',
          blob,
          `${md5}_${index}.chunk` //  在文件名里传 md5 和 index
        );
        formData.append('chunkMd5', chunkMd5); // md5
        formData.append('chunkIndex', index.toString()); // 分块索引
        formData.append('totalChunks', totalChunks.toString()); // 总分块数
        formData.append('filename', file.name); // 文件名
        formData.append('uploadId', uploadId); // 文件名
        try {
          await axios.post(`${API_BASE}/carvedYu/dataset/chunk/upload`, formData);
          // 标记状态
          chunkStatus[index]!.uploaded = true;
          completed++;
          await saveUploadTask({
            id: md5,
            filename: file.name,
            size: file.size,
            chunkSize,
            totalChunks,
            chunks: chunkStatus,
            createdAt: Date.now(),
          });

          // 更新进度
          const p = Math.round((completed / totalChunks) * 100);
          progress.value = p;
          onProgress?.(p);

          results[index] = true; // 成功标记
        } catch (err) {
          console.error(`分片 ${index} 上传失败`, err);
          results[index] = false;
        }

        // 递归启动下一个任务
        await startUpload();
      };

      // 同时启动 limit 个任务
      const workers = Array.from({ length: limit }, startUpload);

      await Promise.all(workers);

      return results;
    }

    try {
      await uploadWithConcurrency(pendingChunks, CONCURRENCY);
      // 5. 所有分片上传完成 → 合并
      await axios.post(`${API_BASE}/carvedYu/dataset/chunk/complete`, {
        md5,
        filename: file.name,
        totalChunks,
        uploadId,
        datasetId,
        datasetPId, datasetName
      });
      await deleteUploadTask(md5);
      uploading.value = false;
      return { success: true, message: "上传成功", fileId: md5 };
    } catch (err) {
      uploading.value = false;
      return { success: false, message: "上传失败，请重试" };
    }
  };

  return {
    uploading,
    progress, // 可绑定到模板显示
    uploadFile, // (file, onProgress) => Promise
  };
};