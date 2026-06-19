// Opt out of the inherited root loading boundary (app/loading.tsx) for the
// public tenant catch-all: returning null means no loading screen is shown for
// these pages.
export default function PublicLoading() {
  return null;
}
