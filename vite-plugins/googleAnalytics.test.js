/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import googleAnalytics from './googleAnalytics';

const transform = (measurementId) =>
  googleAnalytics(measurementId).transformIndexHtml();

describe('googleAnalytics 플러그인', () => {
  it('측정 ID가 없으면 아무 태그도 넣지 않는다', () => {
    // 로컬 개발과 CI 빌드는 ID 없이 돌아서, 그 트래픽이 운영 통계에 섞이지 않는다.
    expect(transform(undefined)).toEqual([]);
    expect(transform('')).toEqual([]);
  });

  it('측정 ID가 있으면 gtag.js 로더와 설정 스크립트를 head 맨 앞에 넣는다', () => {
    const [loader, setup] = transform('G-MR8ZZZV7BP');

    expect(loader).toEqual({
      tag: 'script',
      attrs: {
        async: true,
        src: 'https://www.googletagmanager.com/gtag/js?id=G-MR8ZZZV7BP',
      },
      injectTo: 'head-prepend',
    });
    expect(setup.tag).toBe('script');
    expect(setup.injectTo).toBe('head-prepend');
    expect(setup.children).toContain("gtag('config', 'G-MR8ZZZV7BP');");
  });

  it('측정 ID 형식이 아니면 빌드를 멈춘다', () => {
    // ID는 인라인 스크립트에 그대로 들어가므로, 따옴표 같은 문자가 섞이면 스크립트가 깨진다.
    expect(() => transform("G-1');alert(1);//")).toThrow(
      /VITE_GA_MEASUREMENT_ID/
    );
    expect(() => transform('UA-12345-1')).toThrow(/VITE_GA_MEASUREMENT_ID/);
  });
});
