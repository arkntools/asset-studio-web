import { refDebounced } from '@vueuse/core';
import type { Ref } from 'vue';

export interface UseRefDebouncedConditionalOptions<T> {
  source: Ref<T>;
  delay: number;
  condition: (value: T) => boolean;
}

export const useRefDebouncedConditional = <T>({ source, delay, condition }: UseRefDebouncedConditionalOptions<T>) => {
  const sourceDebounced = refDebounced(source, delay);
  const result = computed<T>(() => (condition(source.value) ? sourceDebounced.value : source.value));
  return result;
};
