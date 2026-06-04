import { uniq } from 'es-toolkit';
import natsortModule from 'natsort';

const natsort: typeof natsortModule = (natsortModule as any).default || natsortModule;

export const useNatsort = (listGetter: () => string[]) => {
  const natsortFn = natsort();

  const sortIndexMap = computed(() =>
    Object.fromEntries(
      uniq(listGetter())
        .sort(natsortFn)
        .map((v, i) => [v, i]),
    ),
  );

  const getSortIndex = (v: string) => sortIndexMap.value[v] ?? -1;

  return getSortIndex;
};
