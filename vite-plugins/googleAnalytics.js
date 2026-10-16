// GA4 measurement IDs look like G-XXXXXXXXXX. The ID is pasted into an inline
// script, so anything outside this shape is rejected instead of escaped.
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

// Adds the Google tag only to builds that are given a measurement ID, so local
// dev and CI builds never report page views to the production property.
export default function googleAnalytics(measurementId) {
  if (measurementId && !MEASUREMENT_ID.test(measurementId)) {
    throw new Error(
      `VITE_GA_MEASUREMENT_ID must look like G-XXXXXXXXXX, got "${measurementId}"`
    );
  }

  return {
    name: 'google-analytics',
    transformIndexHtml() {
      if (!measurementId) return [];

      return [
        {
          tag: 'script',
          attrs: {
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
          },
          injectTo: 'head-prepend',
        },
        {
          tag: 'script',
          children: [
            'window.dataLayer = window.dataLayer || [];',
            'function gtag(){dataLayer.push(arguments);}',
            "gtag('js', new Date());",
            `gtag('config', '${measurementId}');`,
          ].join('\n'),
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
