//#region src/docs.d.ts
interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{
    key: string;
    description: string;
  }>;
  api: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  examples?: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}
declare const docs: {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors: string[];
  keyboard: {
    key: string;
    description: string;
  }[];
  api: {
    name: string;
    type: string;
    description: string;
  }[];
  examples: {
    name: string;
    description: string;
    path: string;
  }[];
};
//#endregion
export { PluginDocs, docs };
//# sourceMappingURL=docs.d.ts.map