import { useEffect } from 'react';

export interface PageMetaOptions {
  title: string;
  description: string;
  canonical: string;
}

const BASE_TITLE = 'monkeysnow \u2014 ski resort snow forecasts';
const BASE_DESCRIPTION = 'Real-time snow forecasts for ski resorts worldwide. Powder, dry snow, wet snow and rain estimates using Kuchera ratios and multi-model weather data.';
const BASE_URL = 'https://monkeysnow.com/';

function setMetaContent(selector: string, content: string): void {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

function setLinkHref(rel: string, href: string): void {
  const el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (el) el.href = href;
}

export function usePageMeta({ title, description, canonical }: PageMetaOptions): void {
  useEffect(() => {
    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setLinkHref('canonical', canonical);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:url"]', canonical);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);

    return () => {
      document.title = BASE_TITLE;
      setMetaContent('meta[name="description"]', BASE_DESCRIPTION);
      setLinkHref('canonical', BASE_URL);
      setMetaContent('meta[property="og:title"]', BASE_TITLE);
      setMetaContent('meta[property="og:description"]', BASE_DESCRIPTION);
      setMetaContent('meta[property="og:url"]', BASE_URL);
      setMetaContent('meta[name="twitter:title"]', BASE_TITLE);
      setMetaContent('meta[name="twitter:description"]', BASE_DESCRIPTION);
    };
  }, [title, description, canonical]);
}
