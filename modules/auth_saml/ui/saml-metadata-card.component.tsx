'use client';
import { useState } from 'react';
import { Card } from '@kuraykaraaslan/common/ui/card.component';
import { Button } from '@kuraykaraaslan/common/ui/button.component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faDownload, faExternalLink } from '@fortawesome/free-solid-svg-icons';
import type { SamlMetadata } from '@kuraykaraaslan/auth_saml/server/auth_saml.types';

type Props = {
  tenantId: string;
  metadata: SamlMetadata | null;
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2 bg-surface-secondary rounded-lg px-3 py-2 border border-border">
        <span className="flex-1 font-mono text-xs text-text-primary truncate">{value}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 text-text-disabled hover:text-text-primary transition-colors"
          title="Copy"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SamlMetadataCard({ tenantId, metadata }: Props) {
  const [xmlCopied, setXmlCopied] = useState(false);

  const downloadXml = () => {
    if (!metadata?.xml) return;
    const blob = new Blob([metadata.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saml-sp-metadata-${tenantId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyXml = () => {
    if (!metadata?.xml) return;
    navigator.clipboard.writeText(metadata.xml).then(() => {
      setXmlCopied(true);
      setTimeout(() => setXmlCopied(false), 2000);
    });
  };

  if (!metadata) {
    return (
      <Card title="SP Metadata" subtitle="Loading...">
        <div className="py-8 text-center text-text-secondary text-sm">Loading metadata…</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <Card
        title="Service Provider Info"
        subtitle="Provide these values to your Identity Provider during SAML app setup"
      >
        <div className="space-y-4">
          <CopyField label="Entity ID (Audience URI)" value={metadata.entityId} />
          <CopyField label="ACS URL (Reply URL)" value={metadata.acsUrl} />
          <CopyField label="Metadata URL" value={metadata.metadataUrl} />

          <div className="flex items-center gap-2 pt-2">
            <a href={metadata.metadataUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm" iconLeft={<FontAwesomeIcon icon={faExternalLink} />}>
                Open Metadata URL
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <Card title="SP Metadata XML" subtitle="Download or copy the full SP metadata XML for your IdP">
        <div className="space-y-3">
          <pre className="bg-surface-secondary border border-border rounded-lg p-3 text-xs font-mono overflow-auto max-h-64 whitespace-pre-wrap break-all">
            {metadata.xml}
          </pre>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyXml}
              iconLeft={<FontAwesomeIcon icon={xmlCopied ? faCheck : faCopy} />}
            >
              {xmlCopied ? 'Copied!' : 'Copy XML'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadXml}
              iconLeft={<FontAwesomeIcon icon={faDownload} />}
            >
              Download XML
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
