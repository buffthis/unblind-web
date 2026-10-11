const WRAPS = {
  bold: { marker: '**', placeholder: '굵은 글씨' },
  italic: { marker: '_', placeholder: '기울인 글씨' },
  code: { marker: '`', placeholder: '코드' },
};

const URL_PLACEHOLDER = 'https://';

function replaceRange(text, start, end, insert) {
  return text.slice(0, start) + insert + text.slice(end);
}

function wrap(text, start, end, kind) {
  const selected = text.slice(start, end);
  if (kind === 'code' && selected.includes('\n')) {
    const insert = `\`\`\`\n${selected}\n\`\`\``;
    return {
      text: replaceRange(text, start, end, insert),
      selectionStart: start + 4,
      selectionEnd: start + 4 + selected.length,
    };
  }
  const { marker, placeholder } = WRAPS[kind];
  const inner = selected || placeholder;
  return {
    text: replaceRange(text, start, end, `${marker}${inner}${marker}`),
    selectionStart: start + marker.length,
    selectionEnd: start + marker.length + inner.length,
  };
}

function linkLike(text, start, end, prefix, placeholder) {
  const label = text.slice(start, end) || placeholder;
  const head = `${prefix}[${label}](`;
  return {
    text: replaceRange(text, start, end, `${head}${URL_PLACEHOLDER})`),
    selectionStart: start + head.length,
    selectionEnd: start + head.length + URL_PLACEHOLDER.length,
  };
}

export function applyFormat(text, start, end, kind) {
  if (kind === 'link') return linkLike(text, start, end, '', '링크 텍스트');
  if (kind === 'image') return linkLike(text, start, end, '!', '이미지 설명');
  return wrap(text, start, end, kind);
}
