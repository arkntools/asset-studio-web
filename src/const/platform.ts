const platform: string = (window.navigator as any)?.userAgentData?.platform || window.navigator.platform;
const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];

export const IS_MAC = macosPlatforms.includes(platform);
