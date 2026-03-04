import { usePageMeta, type PageMetaOptions } from '../hooks/usePageMeta';

export function PageMeta(props: PageMetaOptions): null {
  usePageMeta(props);
  return null;
}
