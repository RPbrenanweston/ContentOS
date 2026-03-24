// @crumb asset-card
// UI | Asset display | Inline editing | Status workflow
// why: Visual card for derived assets with edit-in-place, approve, publish, and delete workflows
// in:[asset, callbacks for update/approve/delete/publish] out:[renders card + triggers callbacks] err:[missing asset.id, null status]
// hazard: Body text edited inline without length validation—could exceed downstream storage limits silently
// hazard: Edit state toggle not cleared on error—user sees stale form after failed update API call
// edge:./content/status-badge.tsx -> CALLS [renders status badge for asset.status]
// edge:./publish-panel.tsx -> CALLS [PUBLISH button opens publish panel]
// edge:../analytics/lineage-table.tsx -> RELATES [asset displays in lineage rows]
// edge:../../domain/derived-asset.ts -> READS [DerivedAsset type]
// prompt: Add maxlength validation on textarea. Clear editing state only after onUpdate success. Bind edit error callback.

'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/content/status-badge';
import type { DerivedAsset } from '@/domain';

interface AssetCardProps {
  asset: DerivedAsset;
  onUpdate: (id: string, body: string) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish?: (id: string) => void;
}

export function AssetCard({ asset, onUpdate, onApprove, onDelete, onPublish }: AssetCardProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(asset.body);

  const handleSave = () => {
    onUpdate(asset.id, body);
    setEditing(false);
  };

  const handleCancel = () => {
    setBody(asset.body);
    setEditing(false);
  };

  return (
    <div className="border border-border bg-surface">
      {/* Card Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-button text-[10px] text-primary border border-primary px-1">
            {asset.assetType.toUpperCase().replace('_', ' ')}
          </span>
          {asset.platformHint && (
            <span className="font-button text-[10px] text-muted">
              {asset.platformHint.toUpperCase()}
            </span>
          )}
          <StatusBadge status={asset.status} />
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="font-button text-[10px] text-muted hover:text-foreground px-1"
            >
              EDIT
            </button>
          )}
          {asset.status === 'draft' && (
            <button
              onClick={() => onApprove(asset.id)}
              className="font-button text-[10px] text-primary hover:bg-primary hover:text-background px-1"
            >
              APPROVE
            </button>
          )}
          {asset.status === 'approved' && onPublish && (
            <button
              onClick={() => onPublish(asset.id)}
              className="font-button text-[10px] text-primary border border-primary px-1 hover:bg-primary hover:text-background"
            >
              PUBLISH
            </button>
          )}
          <button
            onClick={() => onDelete(asset.id)}
            className="font-button text-[10px] text-accent hover:bg-accent hover:text-background px-1"
          >
            DEL
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3">
        {asset.title && (
          <div className="font-body text-foreground text-sm font-medium mb-2">
            {asset.title}
          </div>
        )}
        {editing ? (
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-background border border-border text-foreground text-sm p-2 min-h-[120px] resize-y font-body focus:outline-none focus:border-primary"
            />
            <div className="flex gap-1 mt-2">
              <button
                onClick={handleSave}
                className="font-button text-[10px] border border-primary text-primary px-2 py-1 hover:bg-primary hover:text-background"
              >
                SAVE
              </button>
              <button
                onClick={handleCancel}
                className="font-button text-[10px] border border-border text-muted px-2 py-1 hover:bg-surface"
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm whitespace-pre-wrap">{asset.body}</p>
        )}
      </div>

      {/* Card Footer — Lineage */}
      {asset.sourceSegmentIds.length > 0 && (
        <div className="px-3 py-1 border-t border-border">
          <span className="font-small text-muted">
            FROM {asset.sourceSegmentIds.length} SEGMENT{asset.sourceSegmentIds.length !== 1 ? 'S' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
