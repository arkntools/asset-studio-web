export const useLastValue = <T>(value: Ref<T>) => {
  const lastValue = shallowRef<T>();
  watch(
    value,
    (_, oldVal) => {
      lastValue.value = oldVal;
    },
    { flush: 'sync' },
  );
  return lastValue;
};
