<template>
  <VueMonacoEditor :value="value || ''" :options="options" :language="language" @mount="handleMount" />
</template>

<script setup lang="ts">
import '@/setup/monacoEditor';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { isJSON } from 'es-toolkit';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api';

const props = defineProps<{
  value: string;
  isJson?: boolean;
}>();

const language = computed(() => (props.isJson || isJSON(props.value) ? 'json' : undefined));

const options: editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  wordWrap: 'on',
  unicodeHighlight: {
    ambiguousCharacters: false,
    includeComments: false,
    includeStrings: false,
    invisibleCharacters: false,
    nonBasicASCII: false,
  },
  largeFileOptimizations: false,
  foldingMaximumRegions: 65000,
  tabSize: 2,
};

let editorInstance: editor.IStandaloneCodeEditor | undefined;

const handleMount = (editor: editor.IStandaloneCodeEditor) => {
  editorInstance = editor;
};

watch(
  () => props.value,
  () => {
    editorInstance?.setScrollTop(0);
  },
);
</script>
