import Logger from '@kuraykaraaslan/logger';
import { listExternalContributions, type ExternalContribution } from '@kuraykaraaslan/common/server/external-extensions';
import { expandMimeGroups } from '@kuraykaraaslan/storage/server/storage.mime-groups';
import type { DriveLifecycleEvent, DrivePluginDescriptor } from './drive.plugin-types';

// Extension points Drive hosts. Satellite modules contribute into these; the
// generic bridge resolves a tenant's installed+approved sandboxed plugins.
const PREVIEW_POINT = 'drive:preview';
const ACTION_POINT = 'drive:action';
const SOURCE_POINT = 'drive:source';
const LIFECYCLE_POINT = 'drive:lifecycle';

function label(c: ExternalContribution): string {
  const l = c.metadata?.['label'];
  return typeof l === 'string' ? l : c.key;
}

/**
 * Does a contribution claim a MIME type? Matching is purely metadata-driven
 * (`mimeTypes` and/or `mimeGroups`) so the host can filter without entering the
 * isolate. A contribution that declares neither is treated as a wildcard.
 */
function claimsMime(c: ExternalContribution, mimeType: string): boolean {
  const md = c.metadata ?? {};
  const types = Array.isArray(md['mimeTypes']) ? (md['mimeTypes'] as string[]) : [];
  const groups = Array.isArray(md['mimeGroups']) ? (md['mimeGroups'] as string[]) : [];
  if (!types.length && !groups.length) return true;
  const allowed = new Set<string>([...types.map((t) => t.toLowerCase()), ...expandMimeGroups(groups)]);
  return allowed.has(mimeType.toLowerCase());
}

/**
 * Resolve a custom preview for a file from the first matching `drive:preview`
 * plugin. Returns null when no plugin claims the type (caller falls back to the
 * built-in image/PDF/text renderers). Failures are swallowed — a broken plugin
 * must never break preview.
 */
export async function previewWithPlugin(
  tenantId: string,
  mimeType: string,
  presignedUrl: string,
): Promise<{ key: string; html?: string; iframeUrl?: string } | null> {
  const contribs = await listExternalContributions(tenantId, PREVIEW_POINT).catch(() => []);
  const match = contribs.find((c) => claimsMime(c, mimeType));
  if (!match) return null;
  try {
    const out = (await match.invoke('render', { presignedUrl, mimeType })) as { html?: string; iframeUrl?: string };
    return { key: match.key, html: out?.html, iframeUrl: out?.iframeUrl };
  } catch (e) {
    Logger.warn(`[Drive] preview plugin '${match.key}' failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** List `drive:action` plugins applicable to a file's content type. */
export async function listActions(tenantId: string, mimeType: string | null): Promise<DrivePluginDescriptor[]> {
  const contribs = await listExternalContributions(tenantId, ACTION_POINT).catch(() => []);
  return contribs
    .filter((c) => (mimeType ? claimsMime(c, mimeType) : true))
    .map((c) => ({ key: c.key, label: label(c), metadata: c.metadata ?? {} }));
}

/** Run a `drive:action` plugin against a file in the isolate. */
export async function runAction(
  tenantId: string,
  actionKey: string,
  input: { driveFileId: string; presignedUrl: string; mimeType: string | null },
): Promise<{ resultUrl?: string; message?: string } | null> {
  const contribs = await listExternalContributions(tenantId, ACTION_POINT).catch(() => []);
  const match = contribs.find((c) => c.key === actionKey);
  if (!match) return null;
  const out = (await match.invoke('run', input)) as { resultUrl?: string; message?: string };
  return out ?? {};
}

/** List mounted `drive:source` external backends for the tenant. */
export async function listSources(tenantId: string): Promise<DrivePluginDescriptor[]> {
  const contribs = await listExternalContributions(tenantId, SOURCE_POINT).catch(() => []);
  return contribs.map((c) => ({ key: c.key, label: label(c), metadata: c.metadata ?? {} }));
}

/**
 * Broadcast a lifecycle event to every `drive:lifecycle` hook. Fire-and-forget:
 * never awaited by the core flow and never throws into it.
 */
export function runLifecycleHooks(tenantId: string, event: DriveLifecycleEvent, payload: unknown): void {
  listExternalContributions(tenantId, LIFECYCLE_POINT)
    .then((contribs) =>
      Promise.all(
        contribs.map((c) =>
          c.invoke(event, payload).catch((e) =>
            Logger.warn(`[Drive] lifecycle hook '${c.key}' (${event}) failed: ${e instanceof Error ? e.message : String(e)}`),
          ),
        ),
      ),
    )
    .catch(() => {});
}
