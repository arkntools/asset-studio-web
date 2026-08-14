import 'monaco-editor/features/register.all';
import 'monaco-editor/languages/features/json/register';
import { loader } from '@guolao/vue-monaco-editor';
import * as monaco from 'monaco-editor/editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker?worker';

(globalThis as any).MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }
    return new EditorWorker();
  },
};

loader.config({ monaco });
