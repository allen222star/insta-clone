import axios from "axios";
import { mockAuth, mockMsgs, mockNotifs, mockPosts, mockStories, mockUsers, mockSettings } from "./mockApi";

export const API_URL = import.meta.env.VITE_API_URL ?? "";
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const headers = config.headers || {};
  const token = localStorage.getItem("ig_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof headers.delete === "function") {
      headers.delete("Content-Type");
      headers.delete("content-type");
    } else {
      delete headers["Content-Type"];
      delete headers["content-type"];
    }
  }
  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || "");
    const authCall = url.includes("/api/auth/login") || url.includes("/api/auth/signup");
    if (status === 401 && !authCall && localStorage.getItem("ig_token")) {
      localStorage.removeItem("ig_token");
      window.dispatchEvent(new Event("ig-logout"));
    }
    return Promise.reject(error);
  }
);

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API_URL}${path}`;
}

const liveAuth = {
  signup: (data) => api.post("/api/auth/signup", data),
  login: (data) => api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
  changePassword: (data) => api.post("/api/auth/password", data),
};

const liveUsers = {
  get: (username) => api.get(`/api/users/${username}`),
  updateMe: (form) => api.patch("/api/users/me", form),
  posts: (username, params) => api.get(`/api/users/${username}/posts`, { params }),
  follow: (username) => api.post(`/api/users/${username}/follow`),
  unfollow: (username) => api.delete(`/api/users/${username}/follow`),
  suggested: (limit = 5) => api.get("/api/users/suggested", { params: { limit } }),
  search: (q) => api.get("/api/users/search", { params: { q } }),
  followers: (username) => api.get(`/api/users/${username}/followers`),
  following: (username) => api.get(`/api/users/${username}/following`),
  saved: (params) => api.get("/api/users/me/saved", { params }),
};

const liveSettings = {
  get: () => api.get("/api/settings"),
  patch: (data) => api.patch("/api/settings", data),
};

const livePosts = {
  feed: (params) => api.get("/api/posts/feed", { params }),
  explore: (params) => api.get("/api/posts/explore", { params }),
  get: (id) => api.get(`/api/posts/${id}`),
  create: (form) => api.post("/api/posts", form),
  remove: (id) => api.delete(`/api/posts/${id}`),
  like: (id) => api.post(`/api/posts/${id}/like`),
  unlike: (id) => api.delete(`/api/posts/${id}/like`),
  save: (id) => api.post(`/api/posts/${id}/save`),
  unsave: (id) => api.delete(`/api/posts/${id}/save`),
  comments: (id, params) => api.get(`/api/posts/${id}/comments`, { params }),
  addComment: (id, content) => api.post(`/api/posts/${id}/comments`, { content }),
  deleteComment: (id) => api.delete(`/api/comments/${id}`),
  byTag: (name, params) => api.get(`/api/posts/tag/${name}`, { params }),
  edit: (id, data) => api.patch(`/api/posts/${id}`, data),
  likes: (id) => api.get(`/api/posts/${id}/likes`),
  hashtags: (q) => api.get("/api/hashtags", { params: { q } }),
};

const liveStories = {
  list: () => api.get("/api/stories"),
  create: (form) => api.post("/api/stories", form),
  remove: (id) => api.delete(`/api/stories/${id}`),
};

const liveNotifs = {
  list: () => api.get("/api/notifications"),
  read: () => api.post("/api/notifications/read"),
  unread: () => api.get("/api/notifications/unread-count"),
};

const liveMsgs = {
  conversations: () => api.get("/api/messages/conversations"),
  unread: () => api.get("/api/messages/unread-count"),
  thread: (username, params) => api.get(`/api/messages/${username}`, { params }),
  send: (username, payload) =>
    api.post(`/api/messages/${username}`, typeof payload === "string" ? { content: payload } : payload),
};

const liveAdmin = {
  stats: () => api.get("/api/admin/stats"),
  users: (params) => api.get("/api/admin/users", { params }),
  deleteUser: (username) => api.delete(`/api/admin/users/${username}`),
  posts: (params) => api.get("/api/admin/posts", { params }),
  deletePost: (id) => api.delete(`/api/admin/posts/${id}`),
};

export const authApi = USE_MOCK ? mockAuth : liveAuth;
export const userApi = USE_MOCK ? mockUsers : liveUsers;
export const settingsApi = USE_MOCK ? mockSettings : liveSettings;
export const postApi = USE_MOCK ? mockPosts : livePosts;
export const storyApi = USE_MOCK ? mockStories : liveStories;
export const notifApi = USE_MOCK ? mockNotifs : liveNotifs;
export const msgApi = USE_MOCK ? mockMsgs : liveMsgs;
export const adminApi = liveAdmin;
