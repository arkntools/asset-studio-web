import type { MaybePromise, RepositoryItem, ResourceItem } from '@arkntools/as-web-repo';
import { computedAsync, useLocalStorage } from '@vueuse/core';
import { isNotNil, keyBy, pull, retry } from 'es-toolkit';
import { defineStore } from 'pinia';
import { useRepoAvailable } from '@/hooks/useRepoAvailable';
import { IdbKV } from '@/utils/idbKV';
import { PromisePool } from '@/utils/promisePool';

export interface RepositorySource {
  name: string;
  url: string;
}

const loadRepo = async (source: string): Promise<RepositoryItem[]> => {
  const url = source.match(/^https?:\/\//) ? source : `https://unpkg.com/${source}`;
  return (await import(/* @vite-ignore */ url)).default;
};

export const useRepository = defineStore('repository', () => {
  const { available } = useRepoAvailable();

  const resVerCache = new IdbKV<string>('as-web-repo-res-ver-cache');
  const resListCache = new IdbKV<ResourceItem[]>('as-web-repo-res-list-cache');
  const resCache = new IdbKV<File>('as-web-repo-res-cache');
  const resCacheHash = new IdbKV<string>('as-web-repo-res-cache-hash');

  const sourceList = useLocalStorage<RepositorySource[]>('repo-source-list', [], { writeDefaults: false });
  const sourceNameSet = computed(() => new Set(sourceList.value.map(source => source.name)));
  const sourceUrlSet = computed(() => new Set(sourceList.value.map(source => source.url)));

  const loadingSource = ref('');
  const curSource = useLocalStorage('repo-cur-source', '', { writeDefaults: false });
  const curRepoList = shallowRef<RepositoryItem[]>([]);
  const curRepoMap = computed(() => keyBy(curRepoList.value, repo => repo.id));
  const curRepoId = useLocalStorage(() => `repo-cur-repo-id-${curSource.value}`, '', {
    writeDefaults: false,
    flush: 'sync',
  });
  const curRepo = computed<RepositoryItem | undefined>(() => curRepoMap.value[curRepoId.value]);
  const resListLoading = ref(false);
  const resProgressMap = reactive(new Map<string | number, number>());

  const selectingSource = computed(() => loadingSource.value || curSource.value);
  const showRepoPanel = computed(() => available.value && Boolean(selectingSource.value));
  const isLoading = computed(() => Boolean(loadingSource.value) || resListLoading.value);

  let curResVer: string | null = null;

  const clear = () => {
    loadingSource.value = '';
    curSource.value = '';
    curRepoList.value = [];
    curResVer = null;
    resProgressMap.clear();
  };

  const clearCache = () => {
    resVerCache.clear();
    resListCache.clear();
    resCache.clear();
    resCacheHash.clear();
  };

  const curResList = computedAsync<ResourceItem[]>(
    async onCancel => {
      const source = curSource.value;
      const repo = curRepo.value;

      if (!source || !repo) return [];

      const abortController = new AbortController();
      onCancel(() => abortController.abort());

      let error: any;

      const cacheKey = `${source},${repo.id}`;
      const [cacheResVer, cacheResList, resVer] = await Promise.all([
        resVerCache.get(cacheKey),
        resListCache.get(cacheKey),
        retry(() => repo.getResourceVersion(), {
          retries: 3,
          signal: abortController.signal,
        }).catch(e => {
          error = e;
          return '';
        }),
      ]);

      console.log('[Repository] cache res ver:', cacheResVer);
      console.log('[Repository] res ver:', resVer);

      if (abortController.signal.aborted) return [];
      if (error) throw error;

      if (cacheResVer === resVer && cacheResList) {
        console.log('[Repository] use cache res list, length:', cacheResList.length);
        curResVer = resVer;
        return cacheResList;
      }

      const resList = await repo.getResourceList(resVer);
      console.log('[Repository] fetch res list, length:', resList.length);

      if (!abortController.signal.aborted) curResVer = resVer;
      await Promise.all([resVerCache.set(cacheKey, resVer), resListCache.set(cacheKey, resList)]);

      return resList;
    },
    [],
    {
      lazy: true,
      evaluating: resListLoading,
      onError: e => ElMessage({ message: String(e), type: 'error' }),
    },
  );

  const applySource = async (source: string) => {
    try {
      loadingSource.value = source;
      const repo = await retry(() => loadRepo(source), { retries: 3 });
      if (loadingSource.value !== source) return;
      curSource.value = source;
      curRepoList.value = repo;
      if (!(curRepoId.value in curRepoMap.value)) {
        curRepoId.value = repo[0]?.id || '';
      }
      curResVer = null;
      resProgressMap.clear();
      console.log('[Repository] apply:', source);
    } catch (e) {
      if (loadingSource.value !== source) return;
      ElMessage({ message: `Load repo ${source} failed: ${e}`, type: 'error' });
    } finally {
      if (loadingSource.value === source) {
        loadingSource.value = '';
      }
    }
  };

  const getResource = async (
    {
      item,
      onSuccess,
    }: {
      item: ResourceItem;
      onSuccess?: (file: File) => MaybePromise<void>;
    },
    signal?: AbortSignal,
  ) => {
    if (!curSource.value || !curRepo.value || !curResVer) throw new Error('Repository not initialized');
    const cacheKey = [curSource.value, curRepo.value.id, item.id].join(',');
    console.log('[Repository] get res:', cacheKey);
    const cacheHash = await resCacheHash.get(cacheKey);
    if (cacheHash === item.hash) {
      console.log('[Repository] hit cache:', cacheHash);
      const file = await resCache.get(cacheKey);
      if (file && file instanceof File) {
        resProgressMap.set(item.id, 1);
        await onSuccess?.(file)?.catch(e => {
          ElMessage({ message: String(e), type: 'error' });
        });
        return file;
      }
    }
    console.log('[Repository] miss cache, start fetch');
    resProgressMap.set(item.id, 0);
    const blob = await curRepo.value.getResource({
      version: curResVer,
      item,
      options: {
        onprogress: ({ loaded, total }) => {
          resProgressMap.set(item.id, loaded / total);
        },
      },
      signal,
    });
    const file = new File([blob], item.name);
    Promise.all([resCache.set(cacheKey, file), resCacheHash.set(cacheKey, item.hash)]).then(() => {
      console.log('[Repository] add cache:', cacheKey);
    });
    onSuccess?.(file);
    return file;
  };

  const handleGetResourceError = (error: unknown, { item }: { item: ResourceItem }) => {
    console.error(error);
    resProgressMap.delete(item.id);
    ElMessage({ message: `Get resource "${item.name}" failed: ${error}`, type: 'error' });
  };

  const handleGetResourceAbort = ({ item }: { item: ResourceItem }) => {
    console.warn('[Repository] get resource aborted:', item.name);
    resProgressMap.delete(item.id);
  };

  const getResourcesPool = new PromisePool(8, getResource, handleGetResourceError, handleGetResourceAbort);

  const getResources = async ({
    items,
    onSuccess,
    useGlobalPool = true,
  }: {
    items: ResourceItem[];
    onSuccess?: (file: File) => void;
    useGlobalPool?: boolean;
  }) => {
    const pool = useGlobalPool
      ? getResourcesPool.new()
      : new PromisePool(8, getResource, handleGetResourceError, handleGetResourceAbort);
    const isOutdated = pool.getIsOutdatedGetter();
    pool.addTasks(items.map(item => ({ item, onSuccess })));
    const results = await pool.wait();
    if (isOutdated()) return null;
    return results.map(r => r.result).filter(isNotNil);
  };

  const checkNewSourceName = (name: string) => !sourceNameSet.value.has(name) && name !== 'Disabled';
  const checkNewSourceUrl = (url: string) => !sourceUrlSet.value.has(url);
  const addSource = (source: RepositorySource) => {
    sourceList.value.push(source);
  };
  const removeSource = (source: RepositorySource) => {
    if (selectingSource.value === source.url) clear();
    pull(sourceList.value, [source]);
    localStorage.removeItem(`repo-cur-repo-id-${source.url}`);
  };
  const selectSource = (source?: RepositorySource) => {
    if (!source) {
      clear();
      return;
    }

    applySource(source.url);
  };

  if (curSource.value) {
    applySource(curSource.value);
  }

  return {
    showRepoPanel: readonly(showRepoPanel),
    isLoading: readonly(isLoading),
    selectingSource: readonly(selectingSource),
    sourceList: readonly(sourceList),
    source: readonly(curSource),
    repo: curRepo,
    repoId: curRepoId,
    repoList: readonly(curRepoList),
    resList: curResList,
    resProgressMap: readonly(resProgressMap),
    getResource,
    getResources,
    checkNewSourceName,
    checkNewSourceUrl,
    addSource,
    removeSource,
    selectSource,
    clearCache,
  };
});
