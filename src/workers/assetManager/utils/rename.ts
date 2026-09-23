import type { AssetExportItem } from '../loaders';

export class RenameProcessor {
  private readonly duplicateMap = new Map<string, number>();

  process(list: AssetExportItem[], prePath?: string) {
    prePath = prePath?.trim();
    return list.map(item => {
      const name = prePath ? `${prePath}/${item.name}` : item.name;
      const curTimes = this.duplicateMap.get(name) || 0;
      if (!curTimes) {
        this.duplicateMap.set(name, 1);
        return { ...item, name };
      }
      const newName = this.rename(name, curTimes);
      this.duplicateMap.set(newName, curTimes + 1);
      return { ...item, name: newName };
    });
  }

  private rename(name: string, num: number) {
    const parts = name.split('.');
    if (parts.length === 1) return `${name} (${num})`;
    const ext = parts.pop();
    const baseName = parts.join('.');
    return `${baseName} (${num}).${ext}`;
  }
}
