export const ENDPOINTS = {
  SESSIONS: '/sessions',
  ME: '/me',
  IMAGES: '/images',
  IMAGE_UPLOAD: '/images/uploads',
  DATA_FILES: '/data-files',
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
  SERIES: {
    LIST: '/series',
    MINE: '/me/series',
    BY_ID: (id) => `/series/${encodeURIComponent(id)}`,
    EDIT: (id) => `/series/${encodeURIComponent(id)}/edit`,
    BY_AUTHOR: (id) => `/users/${encodeURIComponent(id)}/series`,
  },
};
