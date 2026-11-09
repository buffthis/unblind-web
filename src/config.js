export const SITE_URL = 'https://unblind.kr';
export const SITE_NAME = 'Unblind';
// The editor stays closed until the backend enforces post ownership in production.
export const POST_EDITOR_ENABLED =
  import.meta.env.VITE_POST_EDITOR_ENABLED === 'true';
// Enable after the series API contract is deployed. The design preview works
// independently in development without sending requests or storing sample data.
export const SERIES_ENABLED = import.meta.env.VITE_SERIES_ENABLED === 'true';
