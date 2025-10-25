interface ImportMetaEnv {
  readonly VITE_AUTO_LOAD_AB?: string;
  readonly VITE_REPO_DEV_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
