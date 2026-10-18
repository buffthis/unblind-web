import Avatar from '@components/common/Avatar';
import Highlight from '@components/search/Highlight';
import useRecentSearches from '@hooks/useRecentSearches';
import useSearchIndex from '@hooks/useSearchIndex';
import { searchEntries } from '@utils/search';
import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FiExternalLink, FiFileText, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 15vh 20px 20px;
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 560px;
  background: ${({ theme }) => theme.colors.backgroundLight};
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 60vh;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.secondary};
`;

const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;

  &::placeholder {
    color: #9a9a9a;
    font-weight: 300;
  }
`;

const KeyHint = styled.kbd`
  font-family: inherit;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 2px 6px;
`;

const ResultList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
`;

const GroupLabel = styled.li`
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.secondary};
  padding: 8px 12px 4px;
`;

const StatusMessage = styled.div`
  padding: 24px 12px;
  text-align: center;
  font-weight: 300;
  color: ${({ theme }) => theme.colors.secondary};
`;

const PartialErrorNote = styled.div`
  padding: 6px 16px;
  font-size: 0.75rem;
  font-weight: 300;
  color: #c62828;
  background: #fff5f5;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ResultItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? 'rgba(0, 0, 0, 0.05)' : 'none')};
`;

const ThumbIcon = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.secondary};
  background: #f5f5f5;
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ItemText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const ItemTitle = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemSubtitle = styled.span`
  font-size: 0.75rem;
  font-weight: 300;
  color: ${({ theme }) => theme.colors.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TypeBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  padding: 2px 8px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const FooterHints = styled.div`
  padding: 8px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.7rem;
  font-weight: 300;
  color: ${({ theme }) => theme.colors.secondary};
  display: flex;
  gap: 16px;
`;

function ItemThumb({ entry }) {
  if (entry.type === 'user') {
    return <Avatar src={entry.image} size={28} />;
  }
  return (
    <ThumbIcon aria-hidden="true">
      {entry.image ? <img src={entry.image} alt="" /> : <FiFileText />}
    </ThumbIcon>
  );
}

export default function SearchPalette({ onClose }) {
  const navigate = useNavigate();
  const { entries, loading, error } = useSearchIndex(true);
  const { recent, addRecent } = useRecentSearches();
  const [query, setQuery] = useState('');
  // 큰 인덱스에서도 타이핑이 끊기지 않도록 필터링을 저우선순위 렌더로 미룬다.
  const deferredQuery = useDeferredValue(query);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 인덱스가 로드된 뒤에는 현재 존재하는 항목만 최근 목록으로 보여준다
  // (삭제된 유저 등 stale 항목이 죽은 링크가 되는 것을 방지).
  const availableRecent = useMemo(() => {
    if (entries.length === 0) return recent;
    const ids = new Set(entries.map((entry) => entry.id));
    return recent.filter((entry) => ids.has(entry.id));
  }, [entries, recent]);

  const isQueryEmpty = deferredQuery.trim() === '';
  const items = useMemo(() => {
    if (isQueryEmpty) {
      return availableRecent.map((entry) => ({
        entry,
        titleRanges: [],
        subtitleRanges: [],
      }));
    }
    return searchEntries(entries, deferredQuery);
  }, [entries, deferredQuery, isQueryEmpty, availableRecent]);

  // items가 줄어든 프레임에서도 활성 인덱스가 범위를 벗어나지 않도록 렌더 시점에 보정
  const safeActiveIndex =
    items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;

  // 질의가 바뀌면 첫 항목을 활성화
  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  // 열릴 때 입력으로 포커스를 옮기고, 닫힐 때 원래 위치로 복원한다.
  useEffect(() => {
    const previous = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);

  // 입력이 블러된 상태에서도 Escape가 동작하도록 문서 레벨에서 처리한다.
  useEffect(() => {
    const onDocKeyDown = (e) => {
      if (e.key === 'Escape' && !e.isComposing) onClose();
    };
    document.addEventListener('keydown', onDocKeyDown);
    return () => document.removeEventListener('keydown', onDocKeyDown);
  }, [onClose]);

  // 팔레트가 열려 있는 동안 배경 스크롤을 잠근다. html에 overflow가 있으면 body의
  // overflow는 화면 스크롤로 전달되지 않으므로 잠금은 html에 건다. 스크롤바가 사라지면
  // 폭이 그만큼 늘어 화면이 옆으로 움직이므로, 재 둔 스크롤바 폭을 오른쪽에서 채운다.
  // 스크롤바가 있던 자리는 배경이 덮어 어둡게 보인다.
  useEffect(() => {
    const root = document.documentElement;
    const original = {
      overflow: root.style.overflow,
      paddingRight: root.style.paddingRight,
    };
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = original.overflow;
      root.style.paddingRight = original.paddingRight;
    };
  }, []);

  // 키보드로 이동한 활성 항목이 스크롤 밖에 있으면 보이게 한다.
  useEffect(() => {
    listRef.current
      ?.querySelector(`#search-option-${safeActiveIndex}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeActiveIndex]);

  const select = (entry) => {
    addRecent(entry);
    onClose();
    if (entry.action?.href) {
      window.open(entry.action.href, '_blank', 'noopener,noreferrer');
    } else if (entry.action?.to) {
      navigate(entry.action.to);
    }
  };

  const moveActive = (delta) => {
    setActiveIndex((prev) => {
      const current = Math.min(prev, items.length - 1);
      return (current + delta + items.length) % items.length;
    });
  };

  const onKeyDown = (e) => {
    // 한글 IME 조합을 확정하는 Enter/방향키가 선택으로 오동작하지 않게 한다.
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[safeActiveIndex];
      if (item) select(item.entry);
    } else if (e.key === 'Tab') {
      // combobox 패턴: DOM 포커스는 입력에 고정하고 activedescendant로만 이동
      e.preventDefault();
    }
  };

  return createPortal(
    <Backdrop
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-label="사이트 검색"
        onMouseDown={(e) => {
          // 목록/여백 클릭으로 입력이 블러되어 키보드 조작이 끊기는 것을 방지
          if (e.target !== inputRef.current) e.preventDefault();
        }}
      >
        <InputRow>
          <FiSearch aria-hidden="true" />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={
              items.length > 0 ? `search-option-${safeActiveIndex}` : undefined
            }
            aria-autocomplete="list"
            placeholder="사용자, 포스트 검색 (초성 검색 지원)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <KeyHint>esc</KeyHint>
        </InputRow>
        {error && entries.length > 0 && (
          <PartialErrorNote role="alert">
            일부 검색 데이터를 불러오지 못해 결과가 불완전할 수 있습니다.
          </PartialErrorNote>
        )}
        {loading && <StatusMessage>검색 데이터를 불러오는 중…</StatusMessage>}
        {!loading && error && entries.length === 0 && (
          <StatusMessage role="alert">
            검색 데이터를 불러오지 못했습니다.
          </StatusMessage>
        )}
        {!loading && !(error && entries.length === 0) && items.length === 0 && (
          <StatusMessage>
            {isQueryEmpty
              ? '이름, 아이디, 포스트 제목으로 검색해 보세요.'
              : `'${deferredQuery}'에 대한 결과가 없습니다.`}
          </StatusMessage>
        )}
        <ResultList
          id="search-results"
          role="listbox"
          aria-label="검색 결과"
          ref={listRef}
        >
          {isQueryEmpty && items.length > 0 && (
            <GroupLabel role="presentation">최근 항목</GroupLabel>
          )}
          {items.map((item, index) => (
            <ResultItem
              key={item.entry.id}
              id={`search-option-${index}`}
              role="option"
              aria-selected={index === safeActiveIndex}
              $active={index === safeActiveIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(item.entry)}
            >
              <ItemThumb entry={item.entry} />
              <ItemText>
                <ItemTitle>
                  <Highlight
                    text={item.entry.title}
                    ranges={item.titleRanges}
                  />
                </ItemTitle>
                {item.entry.subtitle && (
                  <ItemSubtitle>
                    <Highlight
                      text={item.entry.subtitle}
                      ranges={item.subtitleRanges}
                    />
                  </ItemSubtitle>
                )}
              </ItemText>
              <TypeBadge>
                {item.entry.type === 'user' ? 'User' : 'Post'}
                {item.entry.action?.href && <FiExternalLink aria-hidden />}
              </TypeBadge>
            </ResultItem>
          ))}
        </ResultList>
        <FooterHints aria-hidden="true">
          <span>↑↓ 이동</span>
          <span>↵ 열기</span>
          <span>esc 닫기</span>
        </FooterHints>
      </Dialog>
    </Backdrop>,
    document.body
  );
}
