import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/auth';
import { Session, Local } from '@/utils/storage';
import { Message } from "@arco-design/web-vue";
// 保存到 Local或 Session的key名
export const Key = {
  rememberKey: 'isRemember', // 记住密码的key
  accessTokenKey: 'accessToken', // 访问令牌本地保存的key
  userInfoKey: 'userInfo', // 用户信息本地保存的key
  accountNumber: "accountNumber"
}
console.log(import.meta.env.VITE_APP_SERVICE_URL)
// 手动创建一个 axios 对象, 参考: https://github.com/axios/axios#creating-an-instance
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 20000, // 请求超时的毫秒数，请求时间超过指定值，则请求会被中断
});

// 请求拦截器
request.interceptors.request.use(config => {
  // 获取token
  const authStore = useAuthStore();
  const accessToken = authStore.accessToken;
  if (accessToken) {
    // oauth2 请求头 Authorization: Bearer xxxxx
    config.headers.Authorization = `Bearer ${Session.get(Key.accessTokenKey)}`;
  }
  return config;
}, error => {
  // 出现异常, catch可捕获到
  return Promise.reject(error);
})
// 响应拦截器
request.interceptors.response.use(response => {
  const res = response.data;
  // 20000 正常响应，返回响应结果给调用方
  if (res.code == 200 || res.code == '200') {
    return res;
  }
  // 非正常响应弹出错误信息
  Message.error(res.msg);
  return Promise.reject(res);
}, error => {

  const authStore = useAuthStore();
  // 处理响应错误
  const { msg, response } = error;
  if (response.data.code == 500) {
    Message.error(response.data.msg)
  } else if (response.data.msg.indexOf('timeout') != -1) {
    Message.error('网络超时！');
  } else if (response.data.msg == 'Network Error') {
    Message.error('网络连接错误！');
  } else {
    // console.log("response.data.code", response.data.code)
    if (response.data.code == 1001) {
      authStore.isToLoginvisible = true
    }
    else {
      Message.error(response.data.msg)
    };
  }
  return Promise.reject(error);
});
export default request; // 导出 axios 对象