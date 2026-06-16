/**
 * Dependency-free, deterministic data generator for realistic seed data.
 * Seeded by a string so re-runs produce identical data (stable fixtures) — a
 * real generator, not random noise. Covers the fields seeders actually need
 * (names, emails, companies, lorem, prices, dates, picks) with light locale
 * awareness for multi-country datasets.
 */

const FIRST_NAMES: Record<string, string[]> = {
  en: ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth'],
  tr: ['Ahmet', 'Ayşe', 'Mehmet', 'Fatma', 'Mustafa', 'Emine', 'Ali', 'Hatice', 'Hüseyin', 'Zeynep'],
  de: ['Lukas', 'Mia', 'Leon', 'Emma', 'Felix', 'Hannah', 'Paul', 'Sofia', 'Jonas', 'Lena'],
  fr: ['Gabriel', 'Emma', 'Louis', 'Jade', 'Raphaël', 'Louise', 'Arthur', 'Alice', 'Hugo', 'Chloé'],
}
const LAST_NAMES: Record<string, string[]> = {
  en: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'],
  tr: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk'],
  de: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker'],
  fr: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand'],
}
const COMPANY_SUFFIX: Record<string, string> = { en: 'Inc.', tr: 'A.Ş.', de: 'GmbH', fr: 'SARL' }
const LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' +
  'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi').split(' ')

export class SeedFaker {
  private state: number

  constructor(seed: string, private locale: string = 'en') {
    // xfnv1a hash → 32-bit seed for a small mulberry32 PRNG.
    let h = 2166136261 >>> 0
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
    this.state = h >>> 0
  }

  /** Deterministic float in [0,1). */
  private next(): number {
    this.state |= 0; this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min }
  pick<T>(arr: readonly T[]): T { return arr[this.int(0, arr.length - 1)] }
  bool(p = 0.5): boolean { return this.next() < p }
  private loc<T>(map: Record<string, T[]>): T[] { return map[this.locale] ?? map.en }

  firstName(): string { return this.pick(this.loc(FIRST_NAMES)) }
  lastName(): string { return this.pick(this.loc(LAST_NAMES)) }
  fullName(): string { return `${this.firstName()} ${this.lastName()}` }
  company(): string { return `${this.pick(this.loc(LAST_NAMES))} ${this.pick(['Tech', 'Trading', 'Digital', 'Group', 'Labs'])} ${COMPANY_SUFFIX[this.locale] ?? 'Inc.'}` }

  email(name?: string): string {
    const base = (name ?? this.fullName()).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')
    return `${base}.${this.int(1, 999)}@example.com`
  }

  slug(words = 2): string { return Array.from({ length: words }, () => this.pick(LOREM)).join('-') + '-' + this.int(100, 999) }
  words(n = 5): string { return Array.from({ length: n }, () => this.pick(LOREM)).join(' ') }
  sentence(n = 8): string { const s = this.words(n); return s.charAt(0).toUpperCase() + s.slice(1) + '.' }
  paragraph(sentences = 3): string { return Array.from({ length: sentences }, () => this.sentence(this.int(6, 12))).join(' ') }

  /** Price in major units, 2dp, within a band. */
  price(min = 5, max = 500): number { return Math.round((this.next() * (max - min) + min) * 100) / 100 }
  phone(): string { return `+${this.int(1, 99)}${this.int(1000000000, 9999999999)}` }
  /** A past date within the last `days` days. */
  pastDate(days = 365): Date { return new Date(Date.now() - this.int(0, days) * 86_400_000) }
}
