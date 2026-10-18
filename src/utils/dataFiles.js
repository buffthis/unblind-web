// A JSON file is told by its name or its type, since a browser may leave the type empty.
export function isDataFile(file) {
  return /\.json$/i.test(file.name ?? '') || file.type === 'application/json';
}

// A marker that stays in the text, as plain words rather than a code block, while the
// upload runs, so typing around it is safe and the preview shows no syntax error.
export function dataFileMarker(id, file) {
  return `[데이터 파일 업로드 중: ${file.name} #${id}]`;
}

// The chart block that reads the uploaded file.
export function dataFileBlock(url) {
  return `\`\`\`chart\ndata: ${url}\n\`\`\``;
}
