import {
  savePost,
  toSaveError,
  uploadDataFile,
  uploadImage,
} from '@apis/postApi';
import PostArticle from '@components/post/PostArticle';
import usePostDraft, { readDraft } from '@hooks/usePostDraft';
import useUnsavedChangesWarning from '@hooks/useUnsavedChangesWarning';
import { LAYOUT } from '@styles/constants';
import { useQueryClient } from '@tanstack/react-query';
import { dataFileBlock, dataFileMarker, isDataFile } from '@utils/dataFiles';
import { imageMarkdown, pickImageFiles, uploadMarker } from '@utils/imageFiles';
import { applyFormat } from '@utils/markdownFormat';
import { DEFAULT_TOC_MAX_LEVEL } from '@utils/postToc';
import { tagLimitError } from '@utils/tags';
import { joinThumbnail, splitThumbnail } from '@utils/thumbnail';
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

// The save bar is fixed to the bottom edge at this height, and the panes stop above it.
const FOOTER_HEIGHT = 62;
const PANES_GAP = 12;

const Page = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 20px ${FOOTER_HEIGHT + PANES_GAP}px;
`;

const Field = styled.label`
  display: block;
  margin-bottom: 12px;

  span {
    display: block;
    margin-bottom: 4px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.secondary};
  }

  input,
  select {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    font: inherit;
    outline: none;
  }
`;

const CheckField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.secondary};
  cursor: pointer;

  input {
    margin: 0;
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
// && outranks Field's `span` rule, which would otherwise turn the error gray.
const FieldError = styled.span`
  && {
    display: block;
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: #d93025;
  }
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

// One box as tall as the space between the site header and the save bar. The editor and
// the preview each scroll inside it, so reading one side does not scroll the page away
// from the other. The page ends with just room for the save bar (see Page), so scrolled
// to the end the box sits right under the header.
const Panes = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  grid-template-rows: minmax(0, 1fr);
  height: calc(
    100vh - ${LAYOUT.HEADER_HEIGHT + 2 * PANES_GAP + FOOTER_HEIGHT}px
  );
  margin-top: 16px;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.section`
  min-width: 0;
  min-height: 0;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    display: ${({ $active }) => ($active ? 'block' : 'none')};
  }
`;

// Pane switches between block and none below the desktop width, so the flex display is
// repeated in that query to keep a hidden editor hidden.
const EditorPane = styled(Pane)`
  display: flex;
  flex-direction: column;

  @media (max-width: calc(${({ theme }) => theme.breakpoints.desktop} - 1px)) {
    display: ${({ $active }) => ($active ? 'flex' : 'none')};
  }
`;

// The body field takes the height the toolbar leaves, so the textarea can fill it.
const BodyField = styled(Field)`
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  min-height: 0;
`;

const PreviewPane = styled(Pane)`
  overflow-y: auto;
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
  flex: 1 1 0%;
  width: 100%;
  min-height: 0;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 15px;
  line-height: 1.7;
  resize: none;
`;

const Footer = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: ${FOOTER_HEIGHT}px;
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
  const tagError = tagLimitError(values.tags);
  if (tagError) errors.tags = tagError;
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

// Why an upload failed, in words the writer can act on. The server says so itself for a
// file it refuses (errors.file); the rest is read from the status. A 413 comes from the
// server in front of the API, as an HTML page with no reason in it.
function uploadErrorReason(error) {
  const message = error?.response?.data?.errors?.file;
  if (typeof message === 'string' && message) return message;
  const status = error?.response?.status;
  if (status === 413) return '서버가 받을 수 있는 크기를 넘었습니다.';
  if (status) return `서버 오류(HTTP ${status}). 잠시 후 다시 시도해 주세요.`;
  if (error?.code === 'ECONNABORTED') {
    return '시간이 초과되었습니다. 파일이 크면 오래 걸릴 수 있습니다.';
  }
  return '서버에 연결하지 못했습니다.';
}

// Takes a marker out of the text, along with the newlines that were added around it so the
// chart block could stand on lines of its own, as long as both are still there.
function removeMarker(content, marker, lead, tail) {
  const wrapped = lead + marker + tail;
  return content.includes(wrapped)
    ? content.replace(wrapped, lead && tail ? '\n' : '')
    : content.replace(marker, '');
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
  const fileInputRef = useRef(null);
  const dataFileInputRef = useRef(null);
  const uploadSeq = useRef(0);
  // Uploads still running; saving then would store their placeholder markers.
  const [uploading, setUploading] = useState(0);
  const pendingSelection = useRef(null);

  // After a create succeeds, later saves must PATCH this id instead of creating again.
  const [postId, setPostId] = useState(initialPostId);
  // The thumbnail already registered on the server; savePost skips re-registering a matching url.
  const [thumbnailBaseline, setThumbnailBaseline] =
    useState(initialThumbnailUrl);
  const [values, setValues] = useState({
    tocMaxLevel: DEFAULT_TOC_MAX_LEVEL,
    ...initialValues,
  });
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

  // Each image gets a marker at the caret right away; the marker is swapped for the final
  // markdown (or removed) when its upload settles, so typing during the upload is safe.
  const uploadImages = (files) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? values.content.length;
    const end = textarea?.selectionEnd ?? start;
    const items = files.map((file) => {
      uploadSeq.current += 1;
      return { file, marker: uploadMarker(uploadSeq.current, file) };
    });
    const inserted = items.map((item) => item.marker).join('\n');
    pendingSelection.current = {
      start: start + inserted.length,
      end: start + inserted.length,
    };
    setValues((prev) => ({
      ...prev,
      content:
        prev.content.slice(0, start) + inserted + prev.content.slice(end),
    }));
    setDirty(true);
    setFormError(null);
    setUploading((count) => count + items.length);

    items.forEach(async ({ file, marker }) => {
      let replacement = '';
      try {
        replacement = imageMarkdown(await uploadImage(file), file);
      } catch (error) {
        setFormError(
          `이미지를 올리지 못했습니다: ${file.name}. ${uploadErrorReason(error)}`
        );
      }
      setValues((prev) => ({
        ...prev,
        content: prev.content.replace(marker, replacement),
      }));
      setUploading((count) => count - 1);
    });
  };

  // A chart's data file goes up the same way, but it comes out as a chart block that reads
  // the file, which needs lines of its own: a newline goes before the marker when the caret
  // is inside a line, and one after it when text follows on that line.
  const uploadDataFiles = (files) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? values.content.length;
    const end = textarea?.selectionEnd ?? start;
    const items = files.map((file) => {
      uploadSeq.current += 1;
      return { file, marker: dataFileMarker(uploadSeq.current, file) };
    });
    const before = values.content.slice(0, start);
    const after = values.content.slice(end);
    const lead = before === '' || before.endsWith('\n') ? '' : '\n';
    const tail = after === '' || after.startsWith('\n') ? '' : '\n';
    const inserted = lead + items.map((item) => item.marker).join('\n') + tail;
    pendingSelection.current = {
      start: start + inserted.length,
      end: start + inserted.length,
    };
    setValues((prev) => ({
      ...prev,
      content:
        prev.content.slice(0, start) + inserted + prev.content.slice(end),
    }));
    setDirty(true);
    setFormError(null);
    setUploading((count) => count + items.length);

    items.forEach(async ({ file, marker }) => {
      let block = null;
      try {
        block = dataFileBlock((await uploadDataFile(file)).url);
      } catch (error) {
        setFormError(
          `데이터 파일을 올리지 못했습니다: ${file.name}. ${uploadErrorReason(error)}`
        );
      }
      setValues((prev) => ({
        ...prev,
        // A failed upload takes the lines it opened with it, when they are still there.
        content:
          block === null
            ? removeMarker(prev.content, marker, lead, tail)
            : prev.content.replace(marker, block),
      }));
      setUploading((count) => count - 1);
    });
  };

  const handleDataFilePick = (event) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    const files = picked.filter(isDataFile);
    const refused = picked.filter((file) => !isDataFile(file));
    if (refused.length > 0) {
      setFormError(
        `JSON 파일만 올릴 수 있습니다: ${refused.map((file) => file.name).join(', ')}`
      );
    }
    if (files.length > 0) uploadDataFiles(files);
  };

  const handlePaste = (event) => {
    const files = pickImageFiles(event.clipboardData);
    if (files.length === 0) return;
    event.preventDefault();
    uploadImages(files);
  };

  const handleDrop = (event) => {
    const files = pickImageFiles(event.dataTransfer);
    if (files.length === 0) return;
    event.preventDefault();
    uploadImages(files);
  };

  const handleFilePick = (event) => {
    const files = pickImageFiles(event.target);
    event.target.value = '';
    if (files.length > 0) uploadImages(files);
  };

  const restoreDraft = () => {
    const draftValues = { ...pendingDraft };
    delete draftValues.savedAt;
    setValues({
      tocMaxLevel: DEFAULT_TOC_MAX_LEVEL,
      ...initialValues,
      ...draftValues,
    });
    setPendingDraft(null);
    setDirty(true);
  };

  const discardDraft = () => {
    clear();
    setPendingDraft(null);
  };

  const handleSave = async (hidden) => {
    if (uploading > 0) {
      setFormError('파일을 올리는 중입니다. 끝난 뒤 저장해 주세요.');
      return;
    }
    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // client.js hard-redirects on 401, so the draft has to be on disk before the request.
    // The save buttons are disabled while an older draft awaits a decision, so flush is safe here.
    flush();
    setSaving(true);
    setFormError(null);

    // The border switch is stored on the thumbnail address, not as a field of its own.
    const { thumbnailBorder, ...rest } = values;
    const typed = splitThumbnail(values.thumbnailUrl.trim());
    const storedThumbnail = joinThumbnail(
      typed.src,
      Boolean(thumbnailBorder) || typed.border
    );

    let saved;
    try {
      saved = await savePost({
        postId,
        values: { ...rest, thumbnailUrl: storedThumbnail },
        hidden,
        initialThumbnailUrl: thumbnailBaseline,
      });
    } catch (error) {
      const { kind, fieldErrors: serverErrors } = toSaveError(error);
      setFieldErrors(toFieldErrors(serverErrors));
      setFormError(FORM_MESSAGES[kind]);
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
        saved.thumbnail?.url ?? (storedThumbnail || undefined)
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
        <span>태그</span>
        <input
          value={values.tags}
          onChange={update('tags')}
          placeholder="쉼표로 구분 (예: GPU, Kubernetes)"
        />
        {fieldErrors.tags && <FieldError>{fieldErrors.tags}</FieldError>}
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
      <CheckField>
        <input
          type="checkbox"
          checked={Boolean(values.thumbnailBorder)}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              thumbnailBorder: event.target.checked,
            }))
          }
        />
        썸네일 테두리
      </CheckField>
      <Field>
        <span>목차 표시 계층</span>
        <select value={values.tocMaxLevel} onChange={update('tocMaxLevel')}>
          <option value="1">h1까지</option>
          <option value="2">h2까지</option>
          <option value="3">h3까지</option>
        </select>
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
        <EditorPane $active={tab === 'write'}>
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
            <ToolButton
              type="button"
              aria-label="이미지 파일 올리기"
              onClick={() => fileInputRef.current?.click()}
            >
              이미지 올리기
            </ToolButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              data-testid="image-file-input"
              onChange={handleFilePick}
            />
            <ToolButton
              type="button"
              aria-label="차트 데이터 파일 올리기"
              onClick={() => dataFileInputRef.current?.click()}
            >
              데이터 파일
            </ToolButton>
            <input
              ref={dataFileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              hidden
              data-testid="data-file-input"
              onChange={handleDataFilePick}
            />
          </Toolbar>
          <BodyField as="div">
            <label htmlFor="post-body">
              <span>본문</span>
            </label>
            <BodyInput
              id="post-body"
              ref={textareaRef}
              value={values.content}
              onChange={update('content')}
              onPaste={handlePaste}
              onDrop={handleDrop}
              placeholder="마크다운으로 작성합니다. 이미지는 붙여넣거나 끌어다 놓을 수 있습니다."
            />
            {fieldErrors.content && (
              <FieldError>{fieldErrors.content}</FieldError>
            )}
          </BodyField>
        </EditorPane>
        <PreviewPane $active={tab === 'preview'} aria-label="미리보기">
          <PostArticle content={previewContent} />
        </PreviewPane>
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
