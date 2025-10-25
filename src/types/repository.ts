import type { RepositoryItem } from '@arkntools/as-web-repo';

export type RepoRawDataHandler = NonNullable<RepositoryItem['dataHandler']>;

export type RepoDataHandler = (data: unknown) => unknown;

export type RepoBatchDataHandler = (data: unknown, index: number) => unknown;
