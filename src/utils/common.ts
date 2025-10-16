import { IS_MAC } from '@/const';

export const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

export const hasSelection = () => {
  const s = window.getSelection();
  return Boolean(s && s.rangeCount > 0 && !s.isCollapsed);
};

export const openUrl = (url: string) => {
  window.open(url, '_blank');
};

export const getKeysFromMouseEvent = (event: Event) => {
  const { metaKey, ctrlKey, shiftKey, altKey } = event as MouseEvent;
  const modKey = IS_MAC ? metaKey : ctrlKey;
  return { modKey, metaKey, ctrlKey, shiftKey, altKey };
};
