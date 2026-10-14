import ErrorBoundary from '@components/common/ErrorBoundary';
import Loading from '@components/common/Loading';
import ScrollToTop from '@components/common/ScrollToTop';
import SearchProvider from '@components/search/SearchProvider';
import { AuthProvider } from '@contexts/AuthContext';
import GlobalStyle from '@styles/GlobalStyle';
import theme from '@styles/theme/theme';
import { QueryClientProvider } from '@tanstack/react-query';
import React, { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { POST_EDITOR_ENABLED } from '@/config';
import { queryClient } from '@/queryClient';

// Every page is its own chunk, so the entry holds only the app shell and a first visit
// downloads just the page it opens. framer-motion stays out of the entry this way: only
// UserPage and the post article import it.
const LoginPage = lazy(() => import('@pages/LoginPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));
const PostListPage = lazy(() => import('@pages/PostListPage'));
const UserListPage = lazy(() => import('@pages/UserListPage'));
const UserPage = lazy(() => import('@pages/UserPage'));
const PostPage = lazy(() => import('@pages/PostPage'));
const PostEditorPage = lazy(() => import('@pages/PostEditorPage'));

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <ErrorBoundary>
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
                        <Route path="/posts/new" element={<PostEditorPage />} />
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
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
