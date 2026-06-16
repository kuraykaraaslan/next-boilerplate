// Shared shapes for the `dynamic_page` demo-data seed, split across
// `dynamic_page.seed.*` modules and consumed by `dynamic_page.seed.ts`.

export type BlockDef = {
  type: string;
  label: string;
  category: string;
  description?: string;
  schema: object;
  defaultProps: object;
  template: string;
  script?: string;
  isSystem: boolean;
};

export type SectionDef = {
  id: string;
  type: string;
  order: number;
  props: Record<string, unknown>;
  hidden?: boolean;
  label?: string;
  className?: string;
};

// Data-driven blocks carry a server handler + collection allowlist on top of
// the base BlockDef fields.
export type DataBlockDef = BlockDef & {
  serverHandler: string;
  allowedCollections: string[];
};
