# MyLargeFileUpload
vue3+ts大文件上传，断点续传，秒传组件封装自用

# Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程

## 效果

### 正常分片上传秒传效果

【前端大文件分片上传断点续传秒传功能node全栈】 https://www.bilibili.com/video/BV17yYPzyEDQ/?share_source=copy_web&vd_source=077d8c6f9c10793046fed8e79140e741

### 断点续传效果

【大文件上传断点续传】 https://www.bilibili.com/video/BV18HYPz8Ehu/?share_source=copy_web&vd_source=077d8c6f9c10793046fed8e79140e741

![Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码](https://i-blog.csdnimg.cn/direct/8c466460580e40ca8263b9e844aa8fca.png)

`6`个并发传递分片请求效果，添加`CONCURRENCY`常量，控制并发数，保证稳定性及上传速度。
![Vue3+Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码）](https://i-blog.csdnimg.cn/direct/0795c85e2a5248e28f519f6eeacb7453.png)


![Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码](https://i-blog.csdnimg.cn/direct/41e27b3c8db74cbf89f4f617b4a81a44.png)
## 前言
前端开发中，令人头疼的除了`Canvas`的应用其次就是大文件上传方案了，恰巧最近碰到了令人头疼的大文件上传需求，要求上传压缩包大于`1024MB`的时候进行分片上传处理，可以断点续传，秒传，分片上传，前端左向右想给出解决方案：

> 前端在上传前首先调用文件初始化接口，向后端提交文件信息（包括文件大小、文件名、`MD5` 标识、分片总数等）。后端根据文件指纹（`MD5`）判断该文件是否已上传或已部分上传，若存在则返回已上传的分片信息，实现断点续传；若无记录，则进入常规分片上传流程。前端按序上传各分片，并通过进度条实时展示上传状态，提升用户体验。所有分片上传完成后，前端触发后端合并接口，将分片文件合并为完整文件。

之前做过一版大文件上传总结成博客了，[大文件上传前端版本>>>](https://blog.csdn.net/qq_42696432/article/details/137345958?fromshare=blogdetail&sharetype=blogdetail&sharerId=137345958&sharerefer=PC&sharesource=qq_42696432&sharefrom=from_link) 最后因为没有后端寸步难行，简直是闭门造车，根据对`nodejs`的了解学习，借助`AI`工具，进行了`Node.js`服务搭建与逻辑书写，成功了完成了从事前端以来除`MockJs`数据之后的真正意义上的接口。
![Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码](https://i-blog.csdnimg.cn/direct/8c466460580e40ca8263b9e844aa8fca.png)

## 思路
### 前端实现思路：
```javascript

		选择文件
		    ↓
		计算文件哈希（MD5）
		    ↓
		向服务端查询是否已存在该文件（秒传）
		    → 存在 → 提示“秒传完成”
		    ↓ 不存在
		读取本地缓存的分片上传状态（断点续传）
		    ↓
		对未上传的分片进行上传
		    ↓
		所有分片上传完成后通知服务端合并
		    ↓
		完成上传
```

### 后端实现思路：
本服务使用 `Express + Multer` 搭建了一个轻量级文件上传后端，支持 大文件分片上传、断点续传、秒传 和 分片合并 功能。
1. 文件唯一标识：通过前端计算文件的MD5值作为文件指纹，用于识别是否已经上传。
2. 分片命名规则：每个分片以` {md5}_{index}.chunk `命名，便于后端识别和管理。
3. 存储结构分离：`chunks/:`临时存储所有上传的分片文件。`files/:`存放合并后的完整文件。
4. 上传记录持久化：使用 `uploadedFiles.json` 记录已成功上传的文件`MD5`，实现秒传。

####  接口说明一：POST /api/upload/init —— 初始化上传
**目的**：判断文件是否需要上传、是否可秒传、是否支持断点续传。
**流程**：接收前端传来的文件信息`filename`、`size`、`md5`，检查 `uploadedFiles.json`，若该 `md5` 已存在且标记为已上传 → 返回 `uploaded: true`，触发秒传。否则，在 `chunks/ `目录中查找匹配 `md5_x.chunk` 的已有分片，提取已上传的分片索引（如 `[0, 1, 3]`）→ 返回给前端 → 实现断点续传。若无任何记录，则返回 `uploaded: false, uploadedChunks: []` → 正常上传所有分片。
#### 接口说明二：POST /api/upload/chunk —— 上传单个分片
**目的**：接收并保存单个文件分片。
**流程**：使用 `multer` 处理文件上传，自定义 `diskStorage` 存储路径和文件名。文件名格式为 `{md5}_{index}.chunk`，从中解析出 `md5` 和 `chunkIndex`。保存到 `chunks/` 目录，便于后续合并。

** 注意：前端需将分片以 `chunk` 字段上传，并在 `body` 中携带 `md5`、`chunkIndex` 等元数据。**

#### 接口说明三：POST /api/upload/merge —— 合并分片
目的：将所有分片按顺序合并为完整文件。
流程：校验参数`md5`、`filename`、`totalChunks`。检查是否所有分片都已上传（即 `md5_0.chunk` 到 `md5_{n-1}.chunk` 都存在）。使用 `fs.createWriteStream`创建目标文件流，按序读取每个分片并写入。
合并完成后在 `uploadedFiles.json` 中记录该文件（支持秒传）。可选清理 `chunks/` 目录（或保留用于调试）。返回合并成功结果。
#### 秒传
通过`MD5`查找`uploadedFiles.json`文件，若存在则直接返回成功。
#### 断点续传
查找已经存在的分片文件，返回已经上传的索引，前端跳过已上传的分片。
#### 正常上传
无记录，无分片，从头开始上传所有分片。
![Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码](https://i-blog.csdnimg.cn/direct/c517f1379fb940b5959d49bdfef0cdc3.png)


## 前端实现
### 第一步、安装MD5，idb相关插件
```typescript
npm install spark-md5 idb
```
### 第二步、创建utils/hashUtils.ts工具文件
计算文件`MD5`哈希值工具`calculateFileMD5`， `MD5`哈希值通常用于唯一的标识文件内容，即使文件名相同但内容不同,他们的`MD5`哈希值也会不同。接收一个`file`对象作为参数，并返回一个`Promise`，结果为计算得到的`MD5`哈希值。往往这一部分是很耗费时间的，后续再进行优化。

```typescript
import SparkMD5 from 'spark-md5';
export const calculateFileMD5 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunkSize = 5 * 1024 * 1024; // 分块大小为5MB
    const chunks = Math.ceil(file.size / chunkSize); // 计算分块数
    let currentChunk = 0; // 当前分块索引
    const spark = new SparkMD5.ArrayBuffer(); // 创建SparkMD5实例
    const reader = new FileReader(); // 创建FileReader实例
    console.log('开始计算文件MD5：', chunks);
    // 读取文件分块
    const loadNext = () => {
      console.log('读取分片块');
      const start = currentChunk * chunkSize; // 分块起始位置
      const end = Math.min(file.size, start + chunkSize);  // 分块结束位置
      reader.readAsArrayBuffer(file.slice(start, end)); // 读取文件分块
    };
    // 文件读取完成
    reader.onload = (e) => {
      console.log('分片块读取完成');
      spark.append(e.target?.result as ArrayBuffer); // 计算MD5
      currentChunk++; // 移动到下一个分块
      if (currentChunk < chunks) loadNext(); // 读取下一个分块
      else resolve(spark.end()); // 返回MD5值
    };
    // 文件读取错误
    reader.onerror = reject;
    loadNext(); // 开始读取第一个分块
  });
};
```
### 第三步、创建utils/uploadDB.ts工具文件
基于`indexedDB`的文件上传任务持久化存储 
>  1. 用户上传大文件的时候，被分割多个块(`chunks`)。
>  2. 每块上传成功后，其状态会被标记为`uploaded:true`。
>  3. 如果上传过程终端，可以通过`indexed`数据库恢复上传任务状态。
>  4. 重新开始上传时，只需要上传那些`uploaded:false`的块。
>  5. 可以避免上传已经重复的块，节省实践和带宽。

```typescript
import { openDB } from 'idb';
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
```
### 第四步、创建utils/useLargeUpload.ts上传方法
逻辑如下：
```javascript

		选择文件
		    ↓
		计算文件哈希（MD5）
		    ↓
		向服务端查询是否已存在该文件（秒传）
		    → 存在 → 提示“秒传完成”
		    ↓ 不存在
		读取本地缓存的分片上传状态（断点续传）
		    ↓
		对未上传的分片进行上传
		    ↓
		所有分片上传完成后通知服务端合并
		    ↓
		完成上传
```

```typescript
/**
 * 处理大文件上传，分片上传，断点续传，妙传功能
 */
import { ref } from 'vue';
import axios from 'axios';
import { calculateFileMD5 } from './hashUtils';
import { getUploadTask, saveUploadTask, deleteUploadTask } from './uploadDB';

// 后端接口（根据你的实际地址修改）
const API_BASE = 'http://localhost:3000/api/upload';

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
const CONCURRENCY = 3;

// 创建上传任务
export const useLargeUpload = () => {
  // 上传中
  const uploading = ref(false);
  const progress = ref(0); // 实时百分比（0~100）
  const uploadFile = async (
    file: File,
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

    // 2. 调用初始化接口
    const initRes = await axios.post(`${API_BASE}/init`, {
      filename: file.name,
      size: file.size,
      md5,
    });

    // 
    const { uploaded, uploadedChunks = [] } = initRes.data;

    // 秒传
    if (uploaded) {
      onProgress?.(100);
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

        formData.append(
          'chunk',
          blob,
          `${md5}_${index}.chunk` //  在文件名里传 md5 和 index
        );
        formData.append('md5', md5);
        formData.append('chunkIndex', index.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('filename', file.name);


        try {
          await axios.post(`${API_BASE}/chunk`, formData);
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
      await axios.post(`${API_BASE}/merge`, {
        md5,
        filename: file.name,
        totalChunks,
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
```

### 第五步、封装vue3大文件上传组件
创建`/components/largeFileUploader/index.vue`文件，用于全局通用

```typescript
<template>
  <div>
    <!-- 文件选择器：只选不传 -->
    <a-upload
      :accept="accept"
      :limit="1"
      @before-upload="handleBeforeUpload"
      @custom-request="handleCustomRequest"
      :showUploadList="true"
    >
      <template #upload-button>
        <a-button
          type="primary"
          class="themeBtnColor"
          style="height: 32px; width: 400px"
          >选择压缩大文件</a-button
        >
      </template>
    </a-upload>
    <div v-if="fileInfo.size !== ''">
      文件名：{{ fileInfo.name }}，大小：{{ fileInfo.size }}
      <span v-if="isUploading">上传中：{{ Math.floor(uploadProgress) }}%</span>
      <span v-if="uploadResult"> 【{{ uploadResult.message }}】 </span>
    </div>
    <!-- 显示上传状态（上传开始后） -->
    <!-- <span class="upload-status" style="margin-top: 8px"> -->
    <!-- </span> -->
    <div v-if="isUploading">
      <a-progress
        size="large"
        :percent="uploadProgress / 100"
        style="margin-top: 8px"
      />
    </div>

    <div class="upload-result" style="margin-top: 8px"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Message } from "@arco-design/web-vue";
import { useLargeUpload } from "../../utils/useLargeUpload";

defineProps<{
  accept?: string;
}>();
const fileInfo: any = ref({ name: "", size: "" });

// 用于存储选中的文件
const selectedFile = ref<File | null>(null);

// 上传状态
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);

const { uploadFile } = useLargeUpload();

// 阻止自动上传，仅保存文件
const handleBeforeUpload = (file: File) => {
  selectedFile.value = file;
  console.log("file", file);
  fileInfo.value = { name: file.name, size: formatBytes(file.size) };
  // Message.info("文件已选择，请点击确定开始上传");
  return false; // 关键：阻止自动上传
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${value} ${sizes[i]}`;
}

// customRequest 中什么都不做，或仅做校验
const handleCustomRequest = () => {
  // 这里不执行上传，仅配合 beforeUpload 使用
  return;
};

// 手动上传方法（供父组件调用）
const startUpload = async () => {
  if (!selectedFile.value) {
    Message.warning("请先选择一个文件");
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  uploadResult.value = null;

  const result = await uploadFile(selectedFile.value, (progress) => {
    uploadProgress.value = progress;
  });

  if (result.success) {
    Message.success(result.message);
  } else {
    Message.error(result.message);
  }

  isUploading.value = false;
  uploadResult.value = result;

  return result; // 可供父组件判断是否上传成功
};

// 暴露方法给父组件
defineExpose({
  startUpload,
  selectedFile,
});
</script>

<style scoped>
.upload-status,
.upload-result {
  margin-top: 8px;
  font-size: 14px;
}
</style>

```
### 第五步、使用组件
引入：

```typescript
const LargeFileUploader = defineAsyncComponent(
  () => import("../../components/largeFileUploader/index.vue")
);
```
使用：
```typescript
 <LargeFileUploader accept=".zip,.rar,.mp4" ref="LargeFileUploaderRef" />
 <a-button type="primary" @click="handleConfirm" :loading="uploading"> 确定上传 </a-button>
```
对应方法：

```typescript

const LargeFileUploaderRef = ref<{
  startUpload: () => Promise<{ success: boolean; message: string }>;
  selectedFile: File | null;
} | null>(null);

const uploading = ref(false);

const handleConfirm = async () => {
  if (!LargeFileUploaderRef.value) return;

  console.log("开始上传文件：", LargeFileUploaderRef.value);
  const file = LargeFileUploaderRef.value.selectedFile;
  if (!file) {
    // 可以提示用户
    return;
  }

  uploading.value = true;
  const result = await LargeFileUploaderRef.value.startUpload();
  uploading.value = false;

  if (result?.success) {
    // 处理成功逻辑
  }
};
```
### 第六步、查看前端效果
[video(video-6PFFGtnb-1757406861401)(type-bilibili)(url-https://player.bilibili.com/player.html?aid=115173373250627)(image-https://i-blog.csdnimg.cn/img_convert/08b6703a6a0c3f2da6f203b2c1f261a1.jpeg)(title-前端大文件分片上传断点续传秒传功能node全栈)]
## 后端实现
### 第一步、初始化node项目服务
```typescript
mkdir node-upload-server
cd node-upload-server
npm init -y
npm install express multer fs-extra spark-md5 cors
```
`node`安装插件介绍：
> `express`: `Web` 服务器
> `multer`: 处理文件上传
> `fs-extra`: 增强版 `fs` 操作
> `spark-md5`: 验证分片完整性
> `cors`: 支持跨域（前端通常是 `http://localhost:5173`）

### 第二步、创建 package.json 脚本
```typescript
{
  "name": "upload-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "fs-extra": "^11.3.1",
    "multer": "^2.0.2",
    "spark-md5": "^3.0.2"
  }
}
```
### 第二步、创建项目目录结构
```typescript
node-upload-server/
├── server.js                 # 主服务
├── uploads/
│   ├── chunks/               # 存放分，临时存放，上传完成即删除，如果断开上传或者断网不删除
│   └── files/                # 存放合并后的完整文件
├── uploadedFiles.json        # 记录已上传的文件（用于秒传）
└── package.json
```

![Vue3 + Node.js 实现大文件上传：断点续传、秒传、分片上传完整教程（含源码](https://i-blog.csdnimg.cn/direct/6796b18eee9b4bdd850f8a52d81a0d37.png)
### 第三步、后端逻辑文件server.js逻辑实现

```typescript
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const SparkMD5 = require('spark-md5');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 配置存储
const CHUNKS_DIR = path.join(__dirname, 'uploads', 'chunks');
const FILES_DIR = path.join(__dirname, 'uploads', 'files');
const UPLOAD_RECORDS = path.join(__dirname, 'uploadedFiles.json');

// 确保目录存在
fs.ensureDirSync(CHUNKS_DIR);
fs.ensureDirSync(FILES_DIR);

// Multer 配置：只处理分片上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHUNKS_DIR);
  },
  filename: (req, file, cb) => {
    // 从 originalname 拿到 {md5}_{index}.chunk
    const [md5, index] = file.originalname.split('.')[0].split('_');
    console.log(`分片保存: md5=${md5}, chunkIndex=${index}`);
    cb(null, `${md5}_${index}.chunk`);
  },
});

const upload = multer({ storage });

// 读取已上传文件记录（秒传用）
const readUploadRecords = () => {
  return fs.readJsonSync(UPLOAD_RECORDS, { throws: false }) || {};
};

const writeUploadRecord = (data) => {
  fs.writeJsonSync(UPLOAD_RECORDS, data, { spaces: 2 });
};

// 接口1: /api/upload/init - 初始化上传
app.post('/api/upload/init', (req, res) => {
  const { filename, size, md5 } = req.body;

  if (!md5 || !filename) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const records = readUploadRecords();

  // 场景1: 已存在 → 秒传
  if (records[md5] && records[md5].uploaded) {
    return res.json({
      uploaded: true,
      fileId: records[md5].fileId,
    });
  }

  // 查找已上传的分片（断点续传）
  const chunkPattern = new RegExp(`^${md5}_\\d+\\.chunk$`);
  const existingChunks = fs
    .readdirSync(CHUNKS_DIR)
    .filter(f => chunkPattern.test(f));

  const uploadedChunks = existingChunks
    .map(f => parseInt(f.split('_')[1]))
    .sort((a, b) => a - b);

  // 返回需要继续上传的分片索引
  res.json({
    uploaded: false,
    uploadedChunks,
  });
});

// 接口2: /api/upload/chunk - 上传分片
app.post('/api/upload/chunk', upload.single('chunk'), (req, res) => {
  const { md5, chunkIndex, totalChunks, filename } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Chunk upload failed' });
  }

  console.log(`Received chunk ${chunkIndex} for ${filename} [${md5}]`);

  res.json({ success: true });
});

// 接口3: /api/upload/merge - 合并分片
app.post('/api/upload/merge', async (req, res) => {
  const { md5, filename, totalChunks } = req.body;

  if (!md5 || !filename || !totalChunks) {
    return res.status(400).json({ error: 'Missing merge params' });
  }

  const chunkFilenames = [];
  for (let i = 0; i < totalChunks; i++) {
    chunkFilenames.push(`${md5}_${i}.chunk`);
  }

  // 检查是否所有分片都已上传
  const allExists = chunkFilenames.every(f =>
    fs.existsSync(path.join(CHUNKS_DIR, f))
  );

  if (!allExists) {
    return res.status(400).json({ error: 'Not all chunks are uploaded' });
  }

  const finalFilePath = path.join(FILES_DIR, filename);

  try {
    // 逐个合并分片
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(CHUNKS_DIR, `${md5}_${i}.chunk`);
      const data = await fs.readFile(chunkPath);
      writeStream.write(data);

      // 可选：删除分片
      // await fs.unlink(chunkPath);
    }

    writeStream.end();

    writeStream.on('finish', () => {
      // 记录秒传信息
      const records = readUploadRecords();
      records[md5] = {
        uploaded: true,
        filename,
        fileId: md5,
        mergedAt: new Date().toISOString(),
      };
      writeUploadRecord(records);

      // 可选：清理分片
      fs.remove(CHUNKS_DIR).then(() => fs.ensureDirSync(CHUNKS_DIR));

      res.json({
        success: true,
        fileId: md5,
        message: 'Merge successful',
      });
    });

  } catch (err) {
    res.status(500).json({ error: 'Merge failed', details: err.message });
  }
});

// 可选：提供已上传文件列表（调试用）
app.get('/api/upload/files', (req, res) => {
  res.json(readUploadRecords());
});

// 启动服务
app.listen(PORT, () => {
  console.log(` Upload server running at http://localhost:${PORT}`);
  console.log(` Chunks: ${CHUNKS_DIR}`);
  console.log(` Files: ${FILES_DIR}`);
});
```
### 第四步、前端链接设置
```typescript
const API_BASE = 'http://localhost:3000/api/upload';
// 接口调用例子
 const initRes = await axios.post(`${API_BASE}/init`, {
   filename: file.name,
   size: file.size,
   md5,
 });
```
### 第五步、前端vite.config.ts配置代理避免跨域
```typescript
server: {
  host: '0.0.0.0',
  open: true, //启动服务时自动打开浏览器访问
  port: 8088, //端口号， 如果端口号被占用，会自动提升1
  proxy: {
    '/api/upload': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    // '/dev-api': { // 匹配 /dev-api 开头的请求，
    [env.VITE_APP_BASE_API]: { // 引用变量作为key时，要加中括号[]
      // 目标服务器
      target: env.VITE_APP_SERVICE_URL,
      // 开启代理
      changeOrigin: true,
      rewrite: path => path.replace(new RegExp(`^${env.VITE_APP_BASE_API}/`), '')
    },
  }
},
```
### 第六步、前后端功能测试流程
1. 选择一个大文件（如 `2000MB`）。
2. 第一次上传 → 分片上传 → 完成后合并。
3. 再次上传相同文件 → 秒传。
4. 上传一半时刷新页面 → 继续上传 → 断点续传。
5. 检查 `uploads/files/` 是否有合并后的文件。
## 完结~ 后续优化补充
