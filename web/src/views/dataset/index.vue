<template>
  <div class="dataset-center">
    <a-row class="grid-demo title-box">
      <a-button
        style="margin: 4px"
        type="text"
        class="back-btn themeFontColor"
        @click="() => $router.back()"
      >
        <icon-undo
          style="margin-right: 4px; font-weight: bold; font-size: 20px"
        />返回</a-button
      >
      <span class="title-text">数据集管理</span>
    </a-row>

    <a-row
      :gutter="12"
      style="height: calc(100vh - 170px); margin: 0; padding: 0"
    >
      <a-col :span="5" class="three-left" style="">
        <!-- createDataSetVisable = true -->
        <a-button
          type="primary"
          v-permission="'dataSetManagement:add'"
          class="themeBtnColor three-left-btn"
          @click="openCreateDataSetVisable"
          >新建数据集</a-button
        >

        <div class="three-box">
          <a-input-search
            class="three-box-input"
            placeholder="请输入数据集名称"
            v-model="searchKey"
          />
          <a-tree
            @expand="treeExpand"
            :default-expand-all="true"
            :fieldNames="{ title: 'name', key: 'id', children: 'children' }"
            :block-node="true"
            :default-selected-keys="pageParameys.datasetId"
            :default-expanded-keys="pageParameys.datasetExpandedKeys"
            :expanded-keys="pageParameys.datasetExpandedKeys"
            :data="treeData"
            @mouseleave="onMouseLeave"
            style="width: 100%; position: relative"
            @select="treeSelect"
          >
            <template #extra="nodeData">
              <IconDelete
                v-permission="'dataSetManagement:deleteDataset'"
                v-show="
                  hoveredNodeKey === nodeData?.id &&
                  nodeData.children.length === 0
                "
                style="
                  top: 5px;
                  color: #325ab5;
                  position: absolute;
                  right: 0;
                  color: #3370ff;
                  right: 25px;
                  font-size: 20px;
                "
                @click="() => onIconClick(nodeData)"
              />
            </template>
            <template #title="nodeData">
              <div
                style="width: 100% !important"
                :style="{
                  color:
                    nodeData.id == pageParameys.datasetId
                      ? 'var(--wyk-color-theme)'
                      : '',
                }"
                @mouseenter="onMouseEnter(nodeData?.id)"
                v-if="((index = getMatchIndex(nodeData?.name)), index < 0)"
              >
                {{ nodeData?.name }}
              </div>
              <span v-else>
                {{ nodeData?.name?.substr(0, index) }}
                <span style="color: var(--color-primary-light-4)">
                  {{ nodeData?.name?.substr(index, searchKey.length) }} </span
                >{{ nodeData?.name?.substr(index + searchKey.length) }}
              </span>
            </template>
          </a-tree>
        </div>
      </a-col>
      <a-col
        :span="19"
        class="img-list"
        style="margin-left: 0; padding-left: 0"
      >
        <div class="img-list-content">
          <a-button
            v-permission="'dataSetManagement:import'"
            type="primary"
            class="themeBtnColor"
            @click="openImportDataSet"
            >导入数据</a-button
          >
          <a-button
            style="margin-left: 21px"
            v-permission="'dataSetManagement:deleteDsFile'"
            @click="delImg"
            v-if="!isDelBtn && pageData.length > 0"
            >删除图片</a-button
          >
          <a-button
            style="margin-left: 21px"
            v-permission="'dataSetManagement:deleteDsFile'"
            :disabled="!delData.length > 0"
            @click="delImgOK"
            v-if="isDelBtn"
            >确认删除</a-button
          >
          <a-button
            style="margin-left: 21px"
            v-permission="'dataSetManagement:deleteDsFile'"
            @click="cancelDelImg"
            v-if="isDelBtn"
            >取消删除</a-button
          >
          <a-divider style="margin: 12px 0" />
          <a-pagination
            class="img-pagination"
            :total="pageParameys.total"
            :current="pageParameys.current"
            :page-size="pageParameys.pageSize"
            :page-size-options="pageParameys.options"
            :default-page-size="35"
            size="small"
            show-total
            show-jumper
            show-page-size
            @change="pageChange"
            @page-size-change="pageSizeChange"
          />

          <a-spin
            style="z-index: 10; height: 70%; width: 100%"
            :loading="loading"
            :size="48"
            tip="加载中，请稍等..."
          >
            <a-checkbox-group v-model="delData" style="z-index: 1">
              <a-empty
                style="position: absolute; top: 250px; left: 0; right: 0"
                v-if="pageData.length == 0 && loading == false"
              />
              <a-row sty v-if="pageData.length > 0" class="img-box">
                <div
                  class="img-item"
                  style="width: 194px; height: 110px; position: relative"
                  :style="{
                    marginRight: (index + 1) % 7 == 0 ? '0px' : '14px',
                  }"
                  v-for="(item, index) in pageData"
                  :key="index"
                >
                  <div
                    v-if="item.thumbnail == ''"
                    style="
                      width: 194px;
                      height: 110px;
                      background: #f4f4f4;
                      text-align: center;
                      position: relative;
                      padding-top: 30px;
                    "
                  >
                    <div
                      class="actions"
                      style="position: absolute; top: 5px; right: -10px"
                      v-if="isDelBtn"
                    >
                      <a-checkbox :value="item.fileId"></a-checkbox>
                    </div>
                    <img
                      style="width: 50px; height: 50px"
                      src="http://localhost:8088/空图片.png"
                      alt=""
                    />
                  </div>
                  <a-image
                    v-if="item.imgAccessUrl != ''"
                    style="cursor: pointer"
                    width="194"
                    height="110"
                    :src="item.imgAccessUrl"
                  >
                    <template #extra>
                      <div
                        class="actions"
                        v-if="isDelBtn"
                        style="position: absolute; top: -86px; right: -10px"
                      >
                        <a-checkbox :value="item.fileId"></a-checkbox>
                      </div>
                    </template>
                  </a-image>
                  <div
                    style="
                      width: 100%;
                      text-align: center;
                      white-space: nowrap; /* 防止文本换行 */
                      overflow: hidden; /* 隐藏溢出的内容 */
                      text-overflow: ellipsis; /* 显示省略号 */
                      font-family: PingFang SC;
                      font-weight: 400;
                      font-style: Regular;
                      font-size: 12px;
                      line-height: 18px;
                      letter-spacing: 0%;
                      vertical-align: middle;
                    "
                  >
                    {{ item.storageName }}
                  </div>
                </div>
              </a-row>
            </a-checkbox-group>
          </a-spin>
        </div>
      </a-col>
    </a-row>
    <a-modal v-model:visible="delVisible" @cancel="handleCancel" unmountOnClose>
      <template #title
        ><icon-exclamation-circle-fill
          style="color: #ff7d00; font-size: 26px; margin-right: 5px"
        />
        <span
          style="
            font-family: PingFang SC;
            font-weight: 400;
            font-size: 16px;
            leading-trim: NONE;
            line-height: 24px;
            letter-spacing: 0%;
            vertical-align: middle;
          "
        >
          删除图片</span
        >
      </template>
      <div
        style="
          font-family: PingFang SC;
          font-weight: 400;
          font-size: 14px;
          leading-trim: NONE;
          line-height: 22px;
          letter-spacing: 0%;
        "
      >
        确认删除该数据集中的{{
          delData.length
        }}张图片吗？删除后，数据无法找回，请谨慎处理。
      </div>
      <template #footer>
        <div style="width: 100%; text-align: center">
          <a-button @click="cancelDel" :disabled="loading">取消</a-button>
          <a-button
            :loading="loading"
            class="delBthColor"
            type="primary"
            @click="delDataOK"
            style="margin-left: 10px"
            >确定</a-button
          >
        </div>
      </template>
    </a-modal>

    <!-- 删除数据集 -->

    <a-modal
      v-model:visible="delCurrentDataSetVisible"
      @cancel="handleCancel"
      :on-before-ok="handleBeforeOk"
      unmountOnClose
    >
      <template #title
        ><icon-exclamation-circle-fill
          style="color: #ff7d00; font-size: 26px; margin-right: 5px"
        />
        <span
          style="
            font-family: PingFang SC;
            font-weight: 400;
            font-size: 16px;
            leading-trim: NONE;
            line-height: 24px;
            letter-spacing: 0%;
            vertical-align: middle;
          "
        >
          删除图片</span
        >
      </template>
      <div
        style="
          font-family: PingFang SC;
          font-weight: 400;
          font-size: 14px;
          leading-trim: NONE;
          line-height: 22px;
          letter-spacing: 0%;
        "
      >
        {{ delCurrentDataSetContent }}
      </div>
      <template #footer>
        <div style="width: 100%; text-align: center">
          <a-button @click="delCurrentDataSetCancel" :disabled="loading"
            >取消</a-button
          >
          <a-button
            :loading="loading"
            class="delBthColor"
            type="primary"
            @click="delCurrentDataSetOk"
            style="margin-left: 10px"
            >确定</a-button
          >
        </div>
      </template>
    </a-modal>

    <!-- 新建数据集 -->
    <MyDialog
      v-model="createDataSetVisable"
      :title="'新建数据集'"
      width="650px"
      :center="true"
      :close-on-click-modal="false"
      :show-confirm-button="true"
      :show-cancel-button="true"
      :confirm-button-loading="loading"
      :confirm-button-disabled="loading"
      @cancel="handleCancelCreate"
    >
      <div style="margin: 0px auto; max-height: 500px; overflow: hidden">
        <a-form
          ref="formRef"
          :model="form"
          status-icon
          :rules="rules"
          label-width="auto"
          class="demo-ruleForm"
        >
          <a-form-item label="数据集名称" field="name">
            <a-input
              v-model.number="form.name"
              placeholder="请输入数据集名称"
            />
          </a-form-item>
          <a-form-item label="父级" field="id">
            <a-select
              allow-search
              v-model="form.id"
              placeholder="请选择数据集父级"
              @change="parentSelChange"
              allow-clear
            >
              <a-option
                v-for="(item, index) in parentSel"
                :key="index"
                :value="item.id"
                >{{ item.name }}</a-option
              >
            </a-select>
          </a-form-item>
          <a-form-item v-if="isUpload" label="是否大文件">
            <a-radio-group v-model="isBig">
              <a-radio value="1">压缩包</a-radio>
              <a-radio value="0">普通数据集</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="isUpload && isBig == 0" label="导入数据文件">
            <a-upload
              action="/"
              :before-upload="beforeUpload"
              directory
              :file-list="fileList"
              @before-remove="beforeRemove"
              @change="handleUploadChange"
              multiple
            >
              <template #upload-button>
                <a-button
                  type="primary"
                  class="themeBtnColor"
                  style="height: 32px; width: 400px"
                  >选择文件夹</a-button
                >
              </template>
            </a-upload>
          </a-form-item>

          <a-form-item v-if="isUpload && isBig == 1" label="导入压缩包">
            <LargeFileUploader
              accept=".zip,.rar,.mp4"
              ref="LargeFileUploaderRef"
            />
          </a-form-item>

          <!-- <a-button type="primary" @click="handleConfirm" :loading="uploading">
            确定上传
          </a-button> -->
        </a-form>
      </div>
      <template #footer>
        <div style="width: 100%; text-align: center">
          <a-button @click="handleCancelCreate" :disabled="loading"
            >取消</a-button
          >
          <a-button
            :loading="loading"
            @click="handleConfirmCreate"
            type="primary"
            style="margin-left: 15px"
            class="themeBtnColor"
            >确认</a-button
          >
        </div>
      </template>
    </MyDialog>

    <!-- 导入数据 -->
    <MyDialog
      v-model="importDataSetVisable"
      :title="'导入图片'"
      width="850px"
      :center="true"
      :close-on-click-modal="false"
      :show-confirm-button="true"
      :show-cancel-button="true"
      :confirm-button-loading="loading"
      :confirm-button-disabled="loading"
      @cancel="handleCancelUpload"
    >
      <div style="margin: 0px auto; min-height: 600px">
        <a-form
          ref="formRef1"
          :model="form"
          status-icon
          :rules="rules"
          :label-col="{ span: 24 }"
          :wrapper-col="{ span: 24 }"
          class="demo-ruleForm"
        >
          <div style="display: flex">
            <a-form-item label="数据集" field="datasetDataId">
              <div>
                <a-select
                  v-model="form.datasetDataId"
                  allow-search
                  placeholder="请选择数据集父级"
                  style="min-width: 280px"
                  allow-clear
                >
                  <a-option
                    v-for="(item, index) in childListSel"
                    :key="index"
                    :value="item.id"
                    >{{ item.name }}</a-option
                  >
                </a-select>
              </div>
            </a-form-item>
            <a-form-item label="数据集组" field="datasetGroupId">
              <div>
                <a-select
                  @change="datasetGroupChange"
                  v-model="form.datasetGroupId"
                  placeholder="请选择数据集父级"
                  allow-clear
                  allow-search
                  style="min-width: 280px"
                >
                  <a-option
                    v-for="(item, index) in parentSel"
                    :key="index"
                    :value="item.id"
                    >{{ item.name }}</a-option
                  >
                </a-select>
              </div>
            </a-form-item>
          </div>

          <a-form-item label="是否大文件">
            <a-radio-group v-model="isBig">
              <a-radio value="1">压缩包</a-radio>
              <a-radio value="0">普通数据集</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="isBig == 1" label="导入压缩包">
            <LargeFileUploader
              accept=".zip,.rar,.mp4"
              ref="LargeFileUploaderRef"
            />
          </a-form-item>
          <div class="update-box" v-if="isBig == 0">
            <a-upload
              @before-remove="beforeRemove"
              :file-list="fileList"
              @change="handleUploadChange"
              style="width: 100%"
              draggable
              multiple
              action="https://arco.design/"
            ></a-upload>
            <div class="upload-btn" style="display: flex">
              <div>
                <a-upload
                  @before-remove="beforeRemove"
                  class="updata-btn"
                  :file-list="fileList"
                  @change="handleUploadChange"
                  multiple
                  action="https://arco.design/"
                  directory
                  style="height: 32px"
                >
                  <template #upload-button>
                    <a-button
                      type="primary"
                      class="themeBtnColor"
                      style="height: 32px"
                      >选择文件夹</a-button
                    >
                  </template>
                </a-upload>
              </div>
              <div>
                <a-upload
                  @before-remove="beforeRemove"
                  class="updata-btn"
                  multiple
                  :file-list="fileList"
                  @change="handleUploadChange"
                  action="https://arco.design/"
                  style="height: 32px; margin-left: 15px"
                >
                  <template #upload-button>
                    <a-button
                      type="primary"
                      class="themeBtnColor"
                      style="height: 32px"
                      >选择图片</a-button
                    >
                  </template>
                </a-upload>
              </div>
            </div>
          </div>
        </a-form>
      </div>
      <template #footer>
        <div style="width: 100%; text-align: center">
          <a-button @click="handleCancelUpload" :disabled="loading"
            >取消</a-button
          >
          <a-button
            :loading="loading"
            @click="handleConfirmUpload"
            type="primary"
            style="margin-left: 15px"
            class="themeBtnColor"
            >确认</a-button
          >
        </div>
      </template>
    </MyDialog>
  </div>
</template>
<script lang="ts" setup name="DataSet">
import { FormInstance } from "element-plus";
import { Message } from "@arco-design/web-vue";
import {
  datasetTree,
  queryDatasetFilesPage,
  addDataset,
  deleteDatasetFiles,
  parentSelList,
  childList,
  deleteDataSet,
  uploadDatasetFiles,
} from "../../api/dataset/index";
import {
  onMounted,
  computed,
  reactive,
  ref,
  defineAsyncComponent,
  nextTick,
} from "vue";
const isBig = ref("1");
const MyDialog = defineAsyncComponent(
  () => import("../../components/hskDialog/index.vue")
);

const LargeFileUploader = defineAsyncComponent(
  () => import("../../components/largeFileUploader/index.vue")
);
const formRef = ref<FormInstance>();
const formRef1 = ref<FormInstance>();
const form: any = reactive({
  name: "",
  pid: "",
  id: "",
  datasetDataId: "",
  datasetGroupId: "",
});
const rules: any = reactive({
  name: [{ required: true, message: "请输入数据集名称" }],
  pid: [{ required: true, message: "请选择父级数据" }],
  id: [{ required: true, message: "请选择父级数据" }],
  datasetDataId: [{ required: true, message: "请选择数据集" }],
  datasetGroupId: [{ required: true, message: "请选择数据集组" }],
});
// 上传文件列表
const fileList = ref([]);
// 导入数据集弹窗显示隐藏
const importDataSetVisable = ref(false);
// 创建数据集弹窗显示隐藏
const createDataSetVisable = ref(false);
const searchKey = ref("");
const delVisible = ref(false);
const pageParameys = reactive({
  options: [35, 50, 100],
  datasetExpandedKeys: [], // 默认展开的树节点
  datasetId: [], // 默认树的第一个节点被选中
  total: 100,
  current: 1,
  pageSize: 35,
});
const currentDataSetID = ref(null);
const delCurrentDataSetVisible = ref(false);
const delCurrentDataSetContent = ref(
  "确认删除该数据集吗？删除后，数据无法找回，请谨慎处理。"
);
// 当前选中的父节点数据
const currentFaterInfo: any = {};
// 父级下拉列表选择
const parentSel = ref([]);
// 子级下拉列表
const childListSel = ref([]);
// 模拟异步操作
const loading = ref(false);
const delData = ref([]);
// 确认删除按钮是否显示
const isDelBtn = ref(false);
// 图片数据
const pageData = ref<any[]>([]);
// 当前鼠标移入所在id
const hoveredNodeKey = ref<string | null>(null);

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/svg+xml",
];

// 文件后缀白名单（作为 MIME type 的补充）
const allowedImageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
];

const LargeFileUploaderRef = ref<{
  startUpload: () => Promise<{ success: boolean; message: string }>;
  selectedFile: File | null;
  datasetId: String | "";
  datasetPId: String | "";
  datasetName: String | "";
} | null>(null);

const uploading = ref(false);

const handleConfirm = async () => {
  if (!LargeFileUploaderRef.value) return;
  console.log("开始上传文件：", LargeFileUploaderRef.value);
  const file = LargeFileUploaderRef.value.selectedFile;
  LargeFileUploaderRef.value.datasetId = null;
  // LargeFileUploaderRef.value.datasetPId = form.id;
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
// let timeout;
function handleUploadChange(info) {
  // 首先过滤出合法的图片文件
  const validFiles = info.filter((file: any) => {
    const fileName = file.name.toLowerCase(); // 获取文件名并转换为小写以便比较
    // 检查文件扩展名
    const isImageByExt = allowedImageExtensions.some((ext) =>
      fileName.endsWith(ext)
    );
    return isImageByExt; // 只有当文件扩展名为允许的图片格式时才返回 true
  });

  // 去重逻辑：使用 文件名 + 文件大小 作为唯一标识符
  const existingKeys = new Set(
    fileList.value.map((f) => `${f.name}-${f.size}`)
  );

  const uniqueValidFiles = validFiles.filter((file) => {
    const key = `${file.name}-${file.size}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key); // 更新集合，防止后续相同文件再次加入
      return true;
    }
    return false; // 如果存在相同的文件（根据name和size），则不加入
  });

  // 更新 fileList，只保留合法且唯一的图片
  fileList.value = [...fileList.value, ...uniqueValidFiles];
}
// 重新获取集合数据
async function datasetGroupChange(params) {
  const res2 = await childList({ id: form.datasetGroupId });
  childListSel.value = [...res2.data];
  form.datasetDataId = "";
}

// 打开导入图片
async function openImportDataSet() {
  try {
    parentSel.value = [];
    const res = await parentSelList();
    parentSel.value = [...res.data];
    form.datasetGroupId = currentFaterInfo.pid;
    const res2 = await childList({ id: currentFaterInfo.pid });
    childListSel.value = [...res2.data];
    form.datasetDataId = currentFaterInfo.chilId;
    // console.log(res2);
  } catch (error) {
    console.error("获取父数据失败:", error);
  }
  importDataSetVisable.value = true;
}
// 打开新建数据集窗口
async function openCreateDataSetVisable() {
  try {
    parentSel.value = [];
    const res = await parentSelList();
    parentSel.value = [
      {
        id: 0,
        name: "根目录",
      },
      ...res.data,
    ];
  } catch (error) {
    console.error("获取树数据失败:", error);
  }
  createDataSetVisable.value = true;
}

function beforeRemove(e) {
  fileList.value = fileList.value.filter((file) => file.uid !== e.uid);
  // console.log("e,fileList", e, fileList);
}

function beforeUpload() {
  return false; // 阻止默认上传
}
function handleCancelUpload() {
  fileList.value = [];
  formRef.value.resetFields();
  importDataSetVisable.value = false;
}
function handleConfirmUpload() {
  formRef1.value.validate(async (valid) => {
    if (!valid) {
      loading.value = true;
      try {
        // console.log("fileList", fileList.value, form.datasetDataId);
        const tempObj = { datasetId: form.datasetDataId };
        const formData = new FormData();
        fileList.value.forEach((file, index) => {
          formData.append("files", file.file);
        });
        const res = await uploadDatasetFiles(formData, tempObj);
        loading.value = false;
        getTreeData();
        getList();
        fileList.value = [];
        importDataSetVisable.value = false;
      } catch (error) {
        loading.value = false;
        console.error("新增数据集失败:", error);
      }
    } else {
    }
  });
}
function delImg() {
  isDelBtn.value = true;
}
function cancelDel() {
  delVisible.value = false;
}
function handleConfirmCreate() {
  formRef.value.validate(async (valid) => {
    if (!valid) {
      loading.value = true;
      try {
        if (isBig.value == "1") {
          if (!LargeFileUploaderRef.value) return;
          console.log("开始上传文件：", LargeFileUploaderRef.value);
          const file = LargeFileUploaderRef.value.selectedFile;

          LargeFileUploaderRef.value.datasetId = null;
          LargeFileUploaderRef.value.datasetPId = form.id;
          LargeFileUploaderRef.value.datasetName = form.name;
          if (!file) {
            // 可以提示用户
            return;
          }
          uploading.value = true;
          const result = await LargeFileUploaderRef.value.startUpload();
          uploading.value = false;

          if (result?.success) {
            // // 处理成功逻辑
            // const tempObj = { pid: form.id, name: form.name };
            // const formData = new FormData();
            // fileList.value.forEach((file, index) => {
            //   formData.append("files", file.file);
            // });
            // const res = await addDataset(formData, tempObj);
            createDataSetVisable.value = false;
            loading.value = false;
            formRef.value.resetFields();
            fileList.value = [];
            getTreeData();
          } else {
            loading.value = false;
          }
        } else {
          const tempObj = { pid: form.id, name: form.name };
          const formData = new FormData();
          fileList.value.forEach((file, index) => {
            formData.append("files", file.file);
          });
          const res = await addDataset(formData, tempObj);
          createDataSetVisable.value = false;
          loading.value = false;
          formRef.value.resetFields();
          fileList.value = [];
          getTreeData();
        }
      } catch (error) {
        loading.value = false;
        console.error("新增数据集失败:", error);
      }
    } else {
    }
  });
}
function handleCancelCreate() {
  formRef.value.resetFields();
  createDataSetVisable.value = false;
}
async function delDataOK() {
  try {
    loading.value = true;
    const tempObj = {
      datasetId: pageParameys.datasetId[0],
      fileIds: delData.value,
    };
    const res = await deleteDatasetFiles(tempObj);
    delData.value = [];
    delVisible.value = false;
    isDelBtn.value = false;
    loading.value = false;
    getTreeData();
    getList();
  } catch (error) {
    loading.value = false;
    console.error("删除失败:", error);
  }
}
async function delImgOK() {
  delVisible.value = true;
  // isDelBtn.value = false;
}
function cancelDelImg() {
  delData.value = [];
  delVisible.value = false;
  isDelBtn.value = false;
}
async function getList() {
  loading.value = true;
  const query = {
    datasetId: pageParameys.datasetId[0],
    current: pageParameys.current,
    pageSize: pageParameys.pageSize,
  };
  const res = await queryDatasetFilesPage(query);
  pageData.value = res.data.data;
  loading.value = false;
  pageParameys.total = parseInt(res.data.total);
}
const treeData = computed(() => {
  if (!searchKey.value) return originTreeData.value;
  return searchData(searchKey.value);
});
function onMouseEnter(key: string) {
  hoveredNodeKey.value = key;
}
function pageChange(num: any, event: any) {
  pageParameys.current = num;
  getList();
}
function pageSizeChange(num: any, event: any) {
  pageParameys.current = 1;
  pageParameys.pageSize = num;
  getList();
}
// 展开关闭方法
function treeExpand(e?: any, a?: any) {
  // console.log("展开关闭", a.node.id);
  // 假设 pid === "0" 表示这是一个父节点
  const expandedKeys = [...pageParameys.datasetExpandedKeys];
  const index = expandedKeys.indexOf(a.node.id);
  if (index > -1) {
    // 如果当前节点已经在展开列表中，则收起该节点
    expandedKeys.splice(index, 1);
  } else {
    // 如果当前节点不在展开列表中，则展开该节点
    expandedKeys.push(a.node.id);
  }
  pageParameys.datasetExpandedKeys = expandedKeys;
}
/**
 *
 * @param selectedKeys 选中key
 * @param info 选中内容
 * 当前节点选中，如果是父节点则进行展开或者关闭
 * 如果当前节点
 */
function treeSelect(selectedKeys: string[], info: { node: any }) {
  delData.value = [];
  const currentNodeKey = selectedKeys[0]; // 获取当前选中的节点key
  if (info.node.pid === "0") {
    // 假设 pid === "0" 表示这是一个父节点
    const expandedKeys = [...pageParameys.datasetExpandedKeys];

    const index = expandedKeys.indexOf(currentNodeKey);

    if (index > -1) {
      // 如果当前节点已经在展开列表中，则收起该节点
      expandedKeys.splice(index, 1);
    } else {
      // 如果当前节点不在展开列表中，则展开该节点
      expandedKeys.push(currentNodeKey);
    }
    pageParameys.datasetExpandedKeys = expandedKeys;
  } else {
    currentFaterInfo.pid = info.node.pid;
    currentFaterInfo.chilId = info.node.id;
    // 子节点被点击时
    pageParameys.datasetId = selectedKeys;
    getList();
  }
}
function onMouseLeave() {
  hoveredNodeKey.value = null;
}
function handleCancel() {}
function handleBeforeOk() {}

const originTreeData = ref([]);
onMounted(async () => {
  try {
    const res = await datasetTree();
    originTreeData.value = res.data.treeList;
    if (originTreeData.value.length > 0) {
      // originTreeData.value[0].selectable = false;
      pageParameys.datasetExpandedKeys.push(originTreeData.value[0].id);
      pageParameys.datasetId.push(originTreeData.value[0].children[0].id);
      currentFaterInfo.pid = originTreeData.value[0].id;
      currentFaterInfo.chilId = originTreeData.value[0].children[0].id;
      await nextTick();
      getList();
    }
  } catch (error) {
    console.error("获取树数据失败:", error);
  }
});
async function getTreeData() {
  try {
    const res = await datasetTree();
    originTreeData.value = res.data.treeList;
    // if (originTreeData.value.length > 0) {
    //   pageParameys.datasetId.push(originTreeData.value[0].id);
    //   await nextTick();

    // }
  } catch (error) {
    console.error("获取树数据失败:", error);
  }
}
const isUpload = ref(false);
function parentSelChange(e: any) {
  if (e == "0") {
    isUpload.value = false;
  } else {
    console.log("parentSelChange", e);
    isUpload.value = true;
  }
}
async function onIconClick(nodeData: any) {
  currentDataSetID.value = nodeData.id;
  delCurrentDataSetContent.value = `"确认删除【${nodeData.name}】数据集吗？删除后，数据无法找回，请谨慎处理。"`;
  delCurrentDataSetVisible.value = true;
}

function delCurrentDataSetCancel() {
  delCurrentDataSetVisible.value = false;
}
async function delCurrentDataSetOk() {
  try {
    loading.value = true;
    parentSel.value = [];
    const res = await deleteDataSet({ datasetId: currentDataSetID.value });
    loading.value = false;
    getTreeData();
    getList();
  } catch (error) {
    loading.value = false;
    console.error("获取树数据失败:", error);
  }
  delCurrentDataSetVisible.value = false;
}

function searchData(keyword) {
  const loop = (data) => {
    const result = [];
    data.forEach((item: any) => {
      if (item.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
        result.push({ ...item });
      } else if (item.children) {
        const filterData = loop(item.children);
        if (filterData.length) {
          result.push({
            ...item,
            children: filterData,
          });
        }
      }
    });
    return result;
  };

  return loop(originTreeData.value);
}
function getMatchIndex(title) {
  if (!searchKey.value) return -1;
  return title.toLowerCase().indexOf(searchKey.value.toLowerCase());
}
</script>
<style scoped lang="scss">
::v-deep .arco-checkbox-checked .arco-checkbox-icon {
  background-color: var(--wyk-color-primary) !important;
}
.img-pagination {
  position: absolute;
  bottom: 6px;
  right: 10px;
  z-index: 1;
}
::v-deep .arco-btn-primary {
  background: var(--wyk-color-theme) !important;
}
::v-deep .arco-tree-node-title-text {
  display: block !important;
  width: 100% !important;
  height: 100%;
  text-align: left;
  color: var(--wyk-font-color);
}
::v-deep .arco-tree-node-switcher {
  color: var(--wyk-font-color);
}
::v-deep .arco-upload-drag {
  padding: 87px 0;
}

.three-box {
  margin-top: 20px;
  height: calc(100vh - 242px);
  overflow: hidden;
  overflow-y: auto;
  .three-box-input {
    margin-bottom: 8px;
    width: 100%;
    height: 36px;
  }
}
.three-left {
  margin-top: 15px;
  background: var(--wyk-bg-color);
  height: calc(100vh - 170px);
  padding-left: 18px !important;
  padding-top: 13px !important;
  padding-right: 18px !important;
  padding-bottom: 13px !important;
  text-align: center;
  .three-left-btn {
    width: 100%;
    height: 36px;
  }
}
.img-list {
  margin-top: 15px;
  height: calc(100vh - 170px);
  background: var(--wyk-dataset-bg-colod);
  padding-left: 15px;
  .img-list-content {
    width: calc(100% - 15px);
    background: var(--wyk-bg-color);
    height: 100%;
    margin-left: 15px;
    padding-left: 30px;
    padding-top: 12px;
    position: relative;
    .img-box {
      z-index: 0;
      max-height: 660px;
      overflow: hidden;
      overflow-y: auto;
      position: relative;
      .img-item {
        margin-bottom: 20px;
        margin-right: 10px;
      }
    }
  }
}

.dataset-center {
  background: var(--wyk-dataset-bg-colod);
}
.title-box {
  background: var(--wyk-dataset-title-box);
  height: 40px;
  width: 100%;
  line-height: 40px;
  .back-btn {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 16px;
    leading-trim: NONE;
    line-height: 100%;
    letter-spacing: 0%;
  }
  .title-text {
    margin: 0px auto;
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 20px;
    leading-trim: NONE;
    letter-spacing: 0%;
    line-height: 40px;
  }
}
@media (max-height: 900px) {
  .img-box {
    z-index: 0;
    max-height: 500px !important;
    overflow: hidden;
  }
}
.update-box {
  margin-top: 8px;
  position: relative;
  .upload-btn {
    width: 220px !important;
    position: absolute;
    top: 180px;
    right: 0;
    margin: 0px auto;
    left: 0;
  }
}
.updata-btn {
  ::v-deep .arco-upload-list {
    display: none;
  }
}
::v-deep .arco-upload-list.arco-upload-list-type-text,
.arco-upload-list.arco-upload-list-type-picture {
  max-height: 300px;
  overflow: hidden;
  overflow-y: auto;
}
</style>
