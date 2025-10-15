import { Semaphore } from 'es-toolkit';

export class AbortError extends Error {
  constructor() {
    super('abort');
  }
}

export class PromisePool<T, R> {
  private readonly lock: Semaphore;
  private readonly promises: Promise<{ task: T; aborted?: boolean; error?: unknown; result?: Awaited<R> }>[] = [];
  private id = 0;
  private abortController = new AbortController();

  constructor(
    concurrency: number,
    private readonly handler: (task: T, signal: AbortSignal) => Promise<R>,
    private readonly errHandler?: (err: unknown, task: T) => void,
    private readonly abortHandler?: (task: T) => void,
  ) {
    this.lock = new Semaphore(concurrency);
  }

  new() {
    this.id++;
    if (this.promises.length) {
      this.abortController.abort(new AbortError());
      this.abortController = new AbortController();
    }
    this.promises.length = 0;
    return this;
  }

  addTasks(tasks: T[]) {
    const { id } = this;
    this.promises.push(
      ...tasks.map(async task => {
        await this.lock.acquire();
        try {
          if (this.id !== id) return { task, aborted: true };
          return { task, result: await this.handler(task, this.abortController.signal) };
        } catch (e) {
          if (e instanceof AbortError) {
            try {
              this.abortHandler?.(task);
            } catch (error) {
              console.error(error);
            }
            return { task, aborted: true };
          }
          try {
            this.errHandler?.(e, task);
          } catch (error) {
            console.error(error);
          }
          return { task, error: e };
        } finally {
          this.lock.release();
        }
      }),
    );
  }

  wait() {
    return Promise.all(this.promises);
  }

  getIsOutdatedGetter() {
    const { id } = this;
    return () => this.id !== id;
  }
}
