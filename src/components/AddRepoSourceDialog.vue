<template>
  <el-dialog v-model="dialogVisible" title="Add repository source" :width="500" @closed="handleClose">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" hide-required-asterisk>
      <el-form-item label="Display name" prop="name">
        <el-input v-model="form.name" autocomplete="off" required />
      </el-form-item>
      <el-form-item label="URL or NPM package name" prop="url">
        <el-input v-model="form.url" autocomplete="off" required @keyup.enter="handleAdd" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleAdd">Add</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormRules } from 'element-plus';
import { useRepository } from '@/store/repository';
import type { RepositorySource } from '@/store/repository';

const repoManager = useRepository();

const formRef = useTemplateRef('formRef');

const dialogVisible = ref(false);

const form = reactive({
  name: '',
  url: '',
});

const getUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `https://unpkg.com/${url}`);

const rules: FormRules<typeof form> = {
  name: [
    {
      trigger: 'blur',
      validator: (rule, value, callback) => {
        value = value.trim();
        callback(
          !value
            ? new Error('name is required')
            : !repoManager.checkNewSourceName(value)
              ? new Error('name already exists')
              : undefined,
        );
      },
    },
  ],
  url: [
    {
      trigger: 'blur',
      validator: (rule, value, callback) => {
        value = value.trim();
        callback(
          !value
            ? new Error('value is required')
            : !repoManager.checkNewSourceUrl(getUrl(value))
              ? new Error('value already exists')
              : undefined,
        );
      },
    },
  ],
};

let resolvers: PromiseWithResolvers<RepositorySource> | undefined;

const cleanUp = () => {
  resolvers = undefined;
  formRef.value?.resetFields();
};

const open = () => {
  dialogVisible.value = true;
  resolvers = Promise.withResolvers();
  return resolvers.promise;
};

const handleAdd = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  const url = getUrl(form.url.trim());
  resolvers?.resolve({ name: form.name.trim(), url });
  dialogVisible.value = false;
};

const handleClose = () => {
  resolvers?.reject();
  cleanUp();
};

defineExpose({
  open,
});
</script>
