// Minimal ambient declaration for the (untyped) `language-tags` package.
// Only the surface we use: `tags(tag).valid()`.
declare module 'language-tags' {
  interface LanguageTag {
    valid(): boolean;
    format(): string;
    language(): unknown;
    region(): unknown;
  }
  function tags(tag: string): LanguageTag;
  export = tags;
}
