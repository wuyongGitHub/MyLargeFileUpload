import SparkMD5 from 'spark-md5';
/**
 * auth：WuYong 
 * annotate：计算文件MD5哈希值工具calculateFileMD5，
 * MD5哈希值通常用于唯一的标识文件内容，即使文件名相同但内容不同,
 * 他们的MD5哈希值也会不同。
 */

// 接收一个file对象作为参数，并返回一个Promise，结果为计算得到的MD5哈希值
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
      spark.append(e.target?.result as ArrayBuffer); // 计算MD5
      console.log('分片块读取完成');
      currentChunk++; // 移动到下一个分块
      if (currentChunk < chunks) loadNext(); // 读取下一个分块
      else resolve(spark.end()); // 返回MD5值
    };
    // 文件读取错误
    reader.onerror = reject;
    loadNext(); // 开始读取第一个分块
  });
};