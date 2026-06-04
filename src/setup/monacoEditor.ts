// @ts-ignore
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import { loader } from '@guolao/vue-monaco-editor';
// @ts-ignore
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }
    return new EditorWorker();
  },
};

loader.config({ monaco });
