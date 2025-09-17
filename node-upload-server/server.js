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