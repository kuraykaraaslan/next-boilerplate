/** Static seed data for `store.seed.ts` (category spec templates, laptop rich
 *  fields, and the RAM × Storage variation option matrix). */

export type SpecDef = { key: string; label: string; type: string; unit?: string; options?: string[]; isRequired?: boolean; isFilterable?: boolean; sortOrder: number };

export const elecSpecDefs: SpecDef[] = [
  { key: 'ram',         label: 'RAM',          type: 'NUMBER',  unit: 'GB',   isRequired: true, isFilterable: true, sortOrder: 1 },
  { key: 'storage',     label: 'Storage',      type: 'NUMBER',  unit: 'GB',   isFilterable: true, sortOrder: 2 },
  { key: 'screen',      label: 'Screen Size',  type: 'NUMBER',  unit: 'inch', isFilterable: true, sortOrder: 3 },
  { key: 'color',       label: 'Color',        type: 'SELECT',  options: ['Black', 'Silver', 'Red'], isFilterable: true, sortOrder: 4 },
  { key: 'touchscreen', label: 'Touchscreen',  type: 'BOOLEAN', isFilterable: false, sortOrder: 5 },
];

export const accSpecDefs: SpecDef[] = [
  { key: 'color',        label: 'Color',        type: 'SELECT', options: ['Black', 'White'], isFilterable: true, sortOrder: 1 },
  { key: 'connectivity', label: 'Connectivity', type: 'SELECT', options: ['USB', 'Bluetooth', 'Wireless'], isFilterable: true, sortOrder: 2 },
];

export const LAPTOP_DETAILS = [
  'The **Test Laptop** is a seeded demo product that exercises the full catalog feature set.',
  '',
  '## Highlights',
  '- 15.6" Full-HD (1920×1080) IPS display',
  '- Configurable memory (8–32 GB) and SSD storage (256 GB – 1 TB)',
  '- Backlit keyboard, all-day battery, Wi-Fi 6E',
  '',
  'Pick a RAM + storage combination — pricing updates per variant.',
].join('\n');

export const LAPTOP_SEO = {
  title: 'Test Laptop — 15.6" Performance Notebook',
  description: 'A configurable 15.6" demo laptop with up to 32 GB RAM and a 1 TB SSD. Fast, light, built for everyday work and play.',
  keywords: ['laptop', 'notebook', '16GB RAM', 'SSD', 'demo'],
};

export const LAPTOP_DIMENSIONS = { length: 35.8, width: 24.7, height: 1.8, unit: 'cm' };

export const ramOpts = [{ label: '8 GB', value: '8', delta: 0 }, { label: '16 GB', value: '16', delta: 150 }, { label: '32 GB', value: '32', delta: 400 }];
export const storageOpts = [{ label: '256 GB', value: '256', delta: 0 }, { label: '512 GB', value: '512', delta: 120 }, { label: '1 TB', value: '1024', delta: 300 }];
