import SearchProvider from '@components/search/SearchProvider';
import theme from '@styles/theme/theme';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hooks/useSearchIndex', () => ({
  default: () => ({
    entries: [
      {
        id: 'user-1',
        type: 'user',
        title: '김형준',
        subtitle: '@hyeongjun',
        keywords: [],
        image: '',
        action: { to: '/hyeongjun' },
      },
      {
        id: 'user-2',
        type: 'user',
        title: '테스터',
        subtitle: '@tester',
        keywords: [],
        image: '',
        action: { to: '/tester' },
      },
      {
        id: 'post-1',
        type: 'post',
        title: '검색 기능 만들기',
        subtitle: '부제',
        keywords: [],
        image: '',
        action: { to: '/posts/1' },
      },
    ],
    loading: false,
    error: false,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPalette() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/']}>
        <SearchProvider>
          <LocationProbe />
        </SearchProvider>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function openPalette() {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
}

beforeEach(() => {
  localStorage.clear();
});

describe('SearchPalette', () => {
  it('Ctrl+K로 열리고 Escape로 닫힌다', () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openPalette();
    expect(
      screen.getByRole('dialog', { name: '사이트 검색' })
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('스크롤 잠금', () => {
    const root = document.documentElement;

    // jsdom은 레이아웃을 계산하지 않으므로 창과 문서의 폭을 직접 준다.
    function setWidths({ window: windowWidth, document: documentWidth }) {
      window.innerWidth = windowWidth;
      Object.defineProperty(root, 'clientWidth', {
        configurable: true,
        value: documentWidth,
      });
    }

    afterEach(() => {
      delete root.clientWidth;
    });

    it('열려 있는 동안 html의 스크롤을 잠그고 사라진 스크롤바 폭만큼 오른쪽을 채운 뒤, 닫으면 되돌린다', () => {
      setWidths({ window: 1280, document: 1265 });
      renderPalette();
      expect(root.style.overflow).toBe('');

      openPalette();
      // html에 overflow가 있으면 body의 overflow는 화면 스크롤로 전달되지 않으므로 잠금은 html에 건다.
      expect(root.style.overflow).toBe('hidden');
      expect(document.body.style.overflow).toBe('');
      // 스크롤바가 사라진 만큼 폭이 늘지 않도록 같은 폭을 오른쪽에서 채운다.
      expect(root.style.paddingRight).toBe('15px');

      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
      expect(root.style.overflow).toBe('');
      expect(root.style.paddingRight).toBe('');
    });

    it('스크롤바가 자리를 차지하지 않으면 오른쪽을 채우지 않는다', () => {
      setWidths({ window: 1280, document: 1280 });
      renderPalette();

      openPalette();
      expect(root.style.overflow).toBe('hidden');
      expect(root.style.paddingRight).toBe('');
    });

    it('원래 있던 오른쪽 안쪽 여백은 닫을 때 그대로 돌려준다', () => {
      setWidths({ window: 1280, document: 1265 });
      root.style.paddingRight = '4px';
      renderPalette();

      openPalette();
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
      expect(root.style.paddingRight).toBe('4px');
      root.style.paddingRight = '';
    });
  });

  it('초성 질의로 결과를 필터링하고 나머지는 숨긴다', async () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'ㄱㅎㅈ' },
    });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /김형준/ })).toBeInTheDocument()
    );
    expect(screen.queryByText('테스터')).not.toBeInTheDocument();
  });

  it('Enter로 선택하면 해당 경로로 이동하고 최근 항목에 저장된다', async () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '검색 기능' } });
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: /검색 기능/ })
      ).toBeInTheDocument()
    );

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/posts/1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('unblind:recent-searches'));
    expect(saved[0].id).toBe('post-1');

    // 다시 열면 빈 질의 상태에서 최근 항목이 보인다
    openPalette();
    expect(screen.getByText('최근 항목')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /검색 기능/ })
    ).toBeInTheDocument();
  });

  it('한글 IME 조합 중의 Enter는 항목을 선택하지 않는다', async () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '검색 기능' } });
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: /검색 기능/ })
      ).toBeInTheDocument()
    );

    fireEvent.keyDown(input, {
      key: 'Enter',
      keyCode: 229,
      isComposing: true,
    });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ArrowDown으로 활성 항목을 이동한 뒤 Enter로 선택한다', async () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole('combobox');
    // 'ㅅ' 초성은 '검색 기능 만들기'(ㄱㅅ…)와 '테스터'(ㅌㅅㅌ)에 매칭된다
    fireEvent.change(input, { target: { value: 'ㅅ' } });
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', 'search-option-1');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('location')).toHaveTextContent('/tester');
  });
});
