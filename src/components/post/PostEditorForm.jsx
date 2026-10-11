import { savePost, toSaveError } from '@apis/postApi';
import PostArticle from '@components/post/PostArticle';
import usePostDraft, { readDraft } from '@hooks/usePostDraft';
import useUnsavedChangesWarning from '@hooks/useUnsavedChangesWarning';
import { useQueryClient } from '@tanstack/react-query';
import { applyFormat } from '@utils/markdownFormat';
import React, {
  useDeferredValue,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const TOOLBAR = [
  { kind: 'bold', label: '굵게', text: 'B' },
  { kind: 'italic', label: '기울임', text: 'I' },
  { kind: 'link', label: '링크', text: '링크' },
  { kind: 'code', label: '코드', text: '</>' },
  { kind: 'image', label: '이미지 URL', text: '이미지' },
];

const FORM_MESSAGES = {
  validation: '입력값을 확인해 주세요.',
  unauthorized:
    '로그인이 만료되었습니다. 작성 중인 내용은 이 브라우저에 임시 저장되어 있습니다.',
  forbidden: '이 글을 수정할 권한이 없습니다.',
  notFound: '글을 찾을 수 없습니다. 삭제되었거나 수정 권한이 없습니다.',
  network: '네트워크 오류로 저장하지 못했습니다. 다시 시도해 주세요.',
  unknown: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

const PARTIAL_HIDE_MESSAGE =
  '글은 공개 상태로 저장됐지만 숨김 처리에 실패했습니다. "숨김으로 저장"을 다시 눌러 주세요.';

const Page = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 20px 120px;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 12px;

  /* Direct children only, so FieldError (also a span) keeps its own color and spacing. */
  > span,
  > label > span {
    display: block;
    margin-bottom: 4px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.secondary};
  }

  input {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    font: inherit;
    outline: none;
  }
`;

// && raises specificity above the `input { font: inherit }` rule in Field, which would reset these.
const TitleInput = styled.input`
  && {
    font-size: 1.75rem;
    font-weight: 700;
  }
`;

// A span, not a p: it sits inside <label>, which only allows phrasing content.
const FieldError = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: #d93025;
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #f6f8fa;
  font-size: 0.9rem;
`;

const Tabs = styled.div`
  display: none;
  gap: 8px;
  margin: 12px 0;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    display: flex;
  }
`;

const Panes = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 16px;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.section`
  min-width: 0;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    display: ${({ $active }) => ($active ? 'block' : 'none')};
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
`;

const ToolButton = styled.button`
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: #fff;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
`;

const BodyInput = styled.textarea`
  width: 100%;
  min-height: 60vh;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
`;

const Footer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 255, 255, 0.95);

  span {
    margin-right: auto;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.secondary};
  }
`;

const ActionButton = styled.button`
  padding: 8px 20px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: ${({ $primary, theme }) =>
    $primary ? theme.colors.primary : '#fff'};
  color: ${({ $primary, theme }) => ($primary ? '#fff' : theme.colors.primary)};
  font: inherit;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

// toSafeHttpUrl resolves relative strings against the page origin, but POST /images needs the url as typed.
function isAbsoluteHttpUrl(value) {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = '제목을 입력해 주세요.';
  if (!values.content.trim()) errors.content = '본문을 입력해 주세요.';
  if (values.thumbnailUrl.trim() && !isAbsoluteHttpUrl(values.thumbnailUrl)) {
    errors.thumbnailUrl = 'http 또는 https 주소를 입력해 주세요.';
  }
  return errors;
}

// POST /images reports a bad url under `url`, but the form field is thumbnailUrl.
function toFieldErrors(serverErrors) {
  const { url, ...rest } = serverErrors;
  if (url == null) return rest;
  return { ...rest, thumbnailUrl: rest.thumbnailUrl ?? url };
}

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PostEditorForm({
  postId: initialPostId,
  initialValues,
  initialThumbnailUrl,
  draftStorageKey,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const textareaRef = useRef(null);
  const pendingSelection = useRef(null);

  // After a create succeeds, later saves must PATCH this id instead of creating again.
  const [postId, setPostId] = useState(initialPostId);
  // The thumbnail already registered on the server; savePost skips re-registering a matching url.
  const [thumbnailBaseline, setThumbnailBaseline] =
    useState(initialThumbnailUrl);
  const [values, setValues] = useState(initialValues);
  const [pendingDraft, setPendingDraft] = useState(() =>
    readDraft(draftStorageKey)
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [tab, setTab] = useState('write');

  const previewContent = useDeferredValue(values.content);
  const { savedAt, flush, clear } = usePostDraft(
    draftStorageKey,
    values,
    dirty && pendingDraft == null
  );
  useUnsavedChangesWarning(dirty);

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (!selection || !textareaRef.current) return;
    pendingSelection.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(selection.start, selection.end);
  }, [values.content]);

  const update = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setDirty(true);
  };

  const handleFormat = (kind) => {
    const textarea = textareaRef.current;
    const result = applyFormat(
      values.content,
      textarea.selectionStart,
      textarea.selectionEnd,
      kind
    );
    pendingSelection.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    setValues((prev) => ({ ...prev, content: result.text }));
    setDirty(true);
  };

  const restoreDraft = () => {
    const draftValues = { ...pendingDraft };
    delete draftValues.savedAt;
    setValues({ ...initialValues, ...draftValues });
    setPendingDraft(null);
    setDirty(true);
  };

  const discardDraft = () => {
    clear();
    setPendingDraft(null);
  };

  const handleSave = async (hidden) => {
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // client.js hard-redirects on 401, so the draft has to be on disk before the request.
    // The save buttons are disabled while an older draft awaits a decision, so flush is safe here.
    flush();
    setSaving(true);
    setFormError(null);

    let saved;
    try {
      saved = await savePost({
        postId,
        values: { ...values, thumbnailUrl: values.thumbnailUrl.trim() },
        hidden,
        initialThumbnailUrl: thumbnailBaseline,
      });
    } catch (error) {
      const { kind, fieldErrors: serverErrors } = toSaveError(error);
      setFieldErrors(toFieldErrors(serverErrors));
      if (error.createdPost) {
        setPostId(error.createdPost.id);
        setThumbnailBaseline(error.createdPost.thumbnail?.url);
        setFormError(PARTIAL_HIDE_MESSAGE);
      } else {
        setFormError(FORM_MESSAGES[kind]);
      }
      setSaving(false);
      return;
    }

    // The post exists now. Whatever fails below must not read as a failed save, and a retry must PATCH it.
    setPostId(saved.id);
    try {
      clear();
      setDirty(false);
      // Hidden saves keep the form mounted in edit mode, so the baseline must follow the save.
      setThumbnailBaseline(
        saved.thumbnail?.url ?? (values.thumbnailUrl.trim() || undefined)
      );
      await Promise.all(
        [['post'], ['posts'], ['user'], ['post-edit']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      );
      if (hidden) {
        navigate(`/posts/${saved.id}/edit`, {
          replace: true,
          state: { notice: '숨김으로 저장했습니다.' },
        });
      } else {
        navigate(`/posts/${saved.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      {pendingDraft && (
        <Banner role="status">
          <span>
            {`임시 저장된 글이 있습니다${
              pendingDraft.savedAt
                ? ` (${formatTime(new Date(pendingDraft.savedAt))})`
                : ''
            }.`}
          </span>
          <span>임시 저장된 글을 불러오거나 버린 뒤 저장할 수 있습니다.</span>
          <ActionButton type="button" onClick={restoreDraft}>
            불러오기
          </ActionButton>
          <ActionButton type="button" onClick={discardDraft}>
            버리기
          </ActionButton>
        </Banner>
      )}

      <Field>
        <span>제목</span>
        <TitleInput value={values.title} onChange={update('title')} />
        {fieldErrors.title && <FieldError>{fieldErrors.title}</FieldError>}
      </Field>
      <Field>
        <span>부제목</span>
        <input value={values.subtitle} onChange={update('subtitle')} />
        {fieldErrors.subtitle && (
          <FieldError>{fieldErrors.subtitle}</FieldError>
        )}
      </Field>
      <Field>
        <span>썸네일 이미지 URL</span>
        <input
          value={values.thumbnailUrl}
          onChange={update('thumbnailUrl')}
          placeholder="https://"
        />
        {fieldErrors.thumbnailUrl && (
          <FieldError>{fieldErrors.thumbnailUrl}</FieldError>
        )}
      </Field>

      <Tabs role="tablist">
        <ActionButton
          type="button"
          role="tab"
          aria-selected={tab === 'write'}
          $primary={tab === 'write'}
          onClick={() => setTab('write')}
        >
          작성
        </ActionButton>
        <ActionButton
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          $primary={tab === 'preview'}
          onClick={() => setTab('preview')}
        >
          미리보기
        </ActionButton>
      </Tabs>

      <Panes>
        <Pane $active={tab === 'write'}>
          <Toolbar>
            {TOOLBAR.map((tool) => (
              <ToolButton
                key={tool.kind}
                type="button"
                aria-label={tool.label}
                onClick={() => handleFormat(tool.kind)}
              >
                {tool.text}
              </ToolButton>
            ))}
          </Toolbar>
          <Field as="div">
            <label htmlFor="post-body">
              <span>본문</span>
            </label>
            <BodyInput
              id="post-body"
              ref={textareaRef}
              value={values.content}
              onChange={update('content')}
              placeholder="마크다운으로 작성합니다."
            />
            {fieldErrors.content && (
              <FieldError>{fieldErrors.content}</FieldError>
            )}
          </Field>
        </Pane>
        <Pane $active={tab === 'preview'} aria-label="미리보기">
          <PostArticle content={previewContent} />
        </Pane>
      </Panes>

      <Footer>
        <span role="status">
          {formError || (savedAt ? `임시 저장됨 ${formatTime(savedAt)}` : '')}
        </span>
        <ActionButton
          type="button"
          disabled={saving || pendingDraft != null}
          onClick={() => handleSave(true)}
        >
          숨김으로 저장
        </ActionButton>
        <ActionButton
          type="button"
          $primary
          disabled={saving || pendingDraft != null}
          onClick={() => handleSave(false)}
        >
          발행
        </ActionButton>
      </Footer>
    </Page>
  );
}
