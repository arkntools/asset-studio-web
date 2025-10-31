const platform: string = (window.navigator as any).userAgentData?.platform || window.navigator.platform || '';

export const IS_MAC = /^mac/i.test(platform);
