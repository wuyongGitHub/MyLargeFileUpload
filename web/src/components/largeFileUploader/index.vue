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

const datasetId = ref("");
const datasetPId = ref("");
const datasetName = ref("");
// 手动上传方法（供父组件调用）
const startUpload = async () => {
  if (!selectedFile.value) {
    Message.warning("请先选择一个文件");
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  uploadResult.value = null;

  const result = await uploadFile(
    selectedFile.value,
    datasetId.value,
    datasetPId.value,
    datasetName.value,
    (progress) => {
      uploadProgress.value = progress;
    }
  );

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
  datasetId,
  datasetPId,
  datasetName,
});
</script>

<style scoped>
.upload-status,
.upload-result {
  margin-top: 8px;
  font-size: 14px;
}
</style>
