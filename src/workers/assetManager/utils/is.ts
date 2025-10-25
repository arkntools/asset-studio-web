import { isArrayBuffer, isTypedArray } from 'es-toolkit';

export const isData = (data: unknown) => isArrayBuffer(data) || isTypedArray(data) || data instanceof DataView;
