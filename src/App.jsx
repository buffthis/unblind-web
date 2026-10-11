import ErrorBoundary from '@components/common/ErrorBoundary';
import Loading from '@components/common/Loading';
import ScrollToTop from '@components/common/ScrollToTop';
import SearchProvider from '@components/search/SearchProvider';
import { AuthProvider } from '@contexts/AuthContext';
import LoginPage from '@pages/LoginPage';
import NotFoundPage from '@pages/NotFoundPage';
import PostListPage from '@pages/PostListPage';
import UserListPage from '@pages/UserListPage';
import UserPage from '@pages/UserPage';
import GlobalStyle from '@styles/GlobalStyle';
import theme from '@styles/theme/theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import React, { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';
import { queryClient } from '@/queryClient';

// 마크다운 렌더러가 무거우므로 포스트 상세 페이지만 별도 청크로 분리한다.
const PostPage = lazy(() => import('@pages/PostPage'));
const PostEditorPage = lazy(() => import('@pages/PostEditorPage'));

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <ErrorBoundary>
          <MotionConfig reducedMotion="user">
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <AuthProvider>
                  <SearchProvider>
                    <ScrollToTop />
                    <Suspense fallback={<Loading />}>
                      <Routes>
                        <Route
                          path="/"
                          element={<Navigate to="/users" replace />}
                        />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/users" element={<UserListPage />} />
                        <Route path="/posts" element={<PostListPage />} />
                        {POST_EDITOR_ENABLED && (
                          <Route
                            path="/posts/new"
                            element={<PostEditorPage />}
                          />
                        )}
                        {POST_EDITOR_ENABLED && (
                          <Route
                            path="/posts/:postId/edit"
                            element={<PostEditorPage />}
                          />
                        )}
                        <Route path="/posts/:postId" element={<PostPage />} />
                        <Route path="/:username" element={<UserPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </SearchProvider>
                </AuthProvider>
              </BrowserRouter>
            </QueryClientProvider>
          </MotionConfig>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
