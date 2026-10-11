export function buildHeadingUrl(id, location = window.location) {
  return `${location.origin}${location.pathname}#${encodeURIComponent(id)}`;
}

export async function copyHeadingLink(id) {
  try {
    await navigator.clipboard.writeText(buildHeadingUrl(id));
    return true;
  } catch (error) {
    console.error('Failed to copy heading link:', error);
    return false;
  }
}
