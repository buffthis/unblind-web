// Only real image files are uploaded; other clipboard or drag items fall through to the browser.
export function pickImageFiles(dataTransfer) {
  return Array.from(dataTransfer?.files ?? []).filter((file) =>
    file.type.startsWith('image/')
  );
}

// The file name without its extension makes a usable default description.
export function altTextFromFile(file) {
  const name = file.name?.replace(/\.[^.]+$/, '').trim();
  return name || '이미지';
}

// A marker that stays in the text while the upload runs, so typing around it is safe.
export function uploadMarker(id, file) {
  return `![${altTextFromFile(file)} 업로드 중 #${id}]()`;
}

export function imageMarkdown(image, file) {
  return `![${image.altText || altTextFromFile(file)}](${image.url})`;
}
