<template>
  <el-input
    v-model="inputValue"
    class="search-input"
    :class="{ 'is-error': isError }"
    placeholder="Search"
    :prefix-icon="IElSearch"
    clearable
  >
    <template #suffix>
      <el-icon class="icon-btn" :class="{ 'is-active': isRegex }" title="Regex" @click="isRegex = !isRegex">
        <RegexIcon />
      </el-icon>
      <el-icon
        class="icon-btn"
        :class="{ 'is-active': isCaseSensitive }"
        title="Case-sensitive"
        @click="isCaseSensitive = !isCaseSensitive"
      >
        <LetterCaseIcon />
      </el-icon>
    </template>
  </el-input>
</template>

<script setup lang="ts">
import IElSearch from '~icons/ep/search';
import LetterCaseIcon from '@/assets/letter-case.svg?component';
import RegexIcon from '@/assets/regex.svg?component';
import { useRefDebouncedConditional } from '@/hooks/useRef';

const isError = ref(false);
const isRegex = ref(false);
const isCaseSensitive = ref(false);
const inputValue = ref('');

const search = ref<string | RegExp>('');
const inputValueDebounced = useRefDebouncedConditional({
  source: inputValue,
  delay: 200,
  condition: Boolean,
});

watchEffect(() => {
  const val = inputValueDebounced.value;
  const reg = isRegex.value;
  const cs = isCaseSensitive.value;

  if (!reg || !val) {
    search.value = cs ? val : val.toLowerCase();
    isError.value = false;
    return;
  }

  try {
    search.value = new RegExp(val, cs ? undefined : 'i');
    isError.value = false;
  } catch {
    isError.value = true;
  }
});

const clear = () => {
  inputValue.value = '';
};

const doSearch = <T,>(list: T[], valueGetter: (item: T) => string[]) => {
  const searchRaw = search.value;
  if (!searchRaw) return list;
  if (searchRaw instanceof RegExp) {
    return list.filter(item => valueGetter(item).some(value => searchRaw.test(value)));
  }
  const searchText = isCaseSensitive.value ? searchRaw : searchRaw.toLowerCase();
  return list.filter(item => valueGetter(item).some(value => value.includes(searchText)));
};

defineExpose({
  search,
  clear,
  doSearch,
});
</script>

<style lang="scss" scoped>
.search-input {
  --el-border-radius-base: 0;

  &.is-error {
    --el-input-border-color: var(--el-color-danger);
    --el-input-hover-border-color: var(--el-color-danger);
    --el-input-clear-hover-color: var(--el-color-danger);
    --el-input-focus-border-color: var(--el-color-danger);
  }

  :deep(.el-input__suffix-inner) {
    flex-direction: row-reverse;

    .el-icon {
      position: relative;

      &::before {
        content: '';
        display: block;
        position: absolute;
        inset: -4px;
      }

      &:hover {
        color: var(--el-color-primary-light-3);
      }

      &:active {
        color: var(--el-color-primary-light-5);
      }
    }
  }
}

.icon-btn {
  margin-left: 8px;
  cursor: pointer;

  &.is-active {
    color: var(--el-color-primary);
  }
}
</style>
