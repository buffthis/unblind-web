import { ENDPOINTS } from '@apis/endpoints';
import axios from 'axios';

// 세션 확인용 요청은 "비로그인"이 정상 응답이므로 401 리다이렉트 대상에서 제외한다.
const AUTH_EXEMPT_PATHS = [ENDPOINTS.SESSIONS, ENDPOINTS.ME];

// No default Content-Type: axios marks plain objects as JSON on its own, and a JSON
// default would make it flatten FormData into JSON, dropping uploaded files.
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

function shouldRedirectToLogin(error) {
  if (error.response?.status !== 401) return false;
  const path = (error.config?.url || '').split('?')[0];
  if (AUTH_EXEMPT_PATHS.includes(path)) return false;
  // 이미 로그인 페이지라면 하드 리다이렉트를 반복하지 않는다 (무한 리로드 방지).
  return window.location.pathname !== '/login';
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldRedirectToLogin(error)) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.assign(`/login?returnTo=${returnTo}`);
    }
    return Promise.reject(error);
  }
);

export default client;
