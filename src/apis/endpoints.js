export const ENDPOINTS = {
  SESSIONS: '/sessions',
  ME: '/me',
  IMAGES: '/images',
  // Assumed name: the backend has no file upload yet; see its brief on image uploads.
  IMAGE_UPLOAD: '/images/upload',
  USERS: {
    BY_ID: (id) => `/users/${encodeURIComponent(id)}`,
    BY_USERNAME: (username) =>
      `/users/by-username/${encodeURIComponent(username)}`,
    CURSOR: '/users/cursor',
  },
  POSTS: {
    LIST: '/posts',
    BY_ID: (postId) => `/posts/${encodeURIComponent(postId)}`,
  },
};
