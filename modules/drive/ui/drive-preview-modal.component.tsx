'use client';
import { useEffect, useState } from 'react';
import api from '@kuraykaraaslan/common/server/axios';
import { Modal } from '@kuraykaraaslan/common/ui/modal.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { Spinner } from '@kuraykaraaslan/common/ui/spinner.component';
import { AlertBanner } from '@kuraykaraaslan/common/ui/alert-banner.component';
import type { DriveNode, PreviewResponse } from '@kuraykaraaslan/drive/ui/drive.types';
import { extractMessage } from '@kuraykaraaslan/drive/ui/drive.types';

/** Inline preview for a Drive file: image / PDF / text / audio / video, with a
 *  plugin-rendered fallback and download for everything else. */
export function DrivePreviewModal({
  apiBase,
  node,
  onClose,
}: {
  apiBase: string;
  node: DriveNode | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!node) {
      setData(null);
      setText('');
      setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`${apiBase}/${node.driveFileId}/preview`);
        if (cancelled) return;
        const payload = res.data as PreviewResponse;
        setData(payload);
        if (payload.kind === 'text' && !payload.plugin) {
          const t = await fetch(payload.url).then((r) => r.text());
          if (!cancelled) setText(t.slice(0, 100_000));
        }
      } catch (err) {
        if (!cancelled) setError(extractMessage(err, 'Failed to load preview.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [node, apiBase]);

  return (
    <Modal open={!!node} onClose={onClose} title={node?.name ?? 'Preview'} size="lg">
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <AlertBanner variant="error" message={error} />}

      {!loading && data && (
        <div className="space-y-3">
          {data.plugin?.iframeUrl ? (
            <iframe src={data.plugin.iframeUrl} className="w-full h-[60vh] rounded-lg border border-border" title={data.name} />
          ) : data.plugin?.html ? (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.plugin.html }} />
          ) : data.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.url} alt={data.name} className="max-h-[60vh] mx-auto rounded-lg" />
          ) : data.kind === 'pdf' ? (
            <iframe src={data.url} className="w-full h-[70vh] rounded-lg border border-border" title={data.name} />
          ) : data.kind === 'video' ? (
            <video src={data.url} controls className="max-h-[60vh] w-full rounded-lg" />
          ) : data.kind === 'audio' ? (
            <audio src={data.url} controls className="w-full" />
          ) : data.kind === 'text' ? (
            <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-surface-base p-3 text-xs">{text}</pre>
          ) : (
            <p className="text-text-secondary text-sm py-6 text-center">
              No inline preview available for this file type.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <a href={data.url} target="_blank" rel="noreferrer" download={data.name}>
              <Button>Download</Button>
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
