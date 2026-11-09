export const SERIES_COLORS = ['slate', 'sage', 'sand'];

export function moveSeriesPost(posts, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= posts.length) return posts;
  const result = [...posts];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

export function seriesError(error) {
  const status = error?.response?.status;
  if (status === 409)
    return '다른 곳에서 시리즈가 변경되었습니다. 내용을 다시 불러온 뒤 저장해 주세요.';
  if (status === 403) return '본인의 시리즈와 글만 수정할 수 있습니다.';
  if (status === 404) return '시리즈를 찾을 수 없습니다.';
  if (status === 400) {
    if (error.response.data?.errors)
      return '시리즈 이름과 선택한 글을 확인해 주세요.';
    return (
      error.response.data?.detail || '시리즈 이름과 선택한 글을 확인해 주세요.'
    );
  }
  return '서버에 저장하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요.';
}
