import React, { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, Upload, Check, AlertCircle } from 'lucide-react';
import { optimizePartyImageFile } from '../../core/utils/imageOptimizer';

export interface PartyAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showTooltip?: boolean;
  /** When true or when callbacks provided, shows upload/change/remove options on hover */
  editable?: boolean;
  onPhotoChange?: (newPhotoUrl: string) => void | Promise<void>;
  onPhotoRemove?: () => void | Promise<void>;
  actionPlacement?: 'top' | 'bottom';
}

// 12 curated, high-contrast, professional corporate pastel & vibrant palettes
const AVATAR_PALETTES = [
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300' },
];

/**
 * Deterministic hash algorithm to guarantee the identical avatar appearance on every render.
 */
function getDeterministicPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

/**
 * Extracts deterministic 2-letter initials from personal or business names:
 * "Rahul Sharma" -> "RS"
 * "Apex Logistics Private Limited" -> "AL"
 * "Gupta" -> "GU"
 */
export function getPartyInitials(name: string): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const single = parts[0];
    return single.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const PartyAvatar: React.FC<PartyAvatarProps> = ({
  name,
  photoUrl,
  size = 'md',
  className = '',
  showTooltip = false,
  editable = false,
  onPhotoChange,
  onPhotoRemove,
  actionPlacement = 'bottom',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getPartyInitials(name);
  const palette = getDeterministicPalette(name);

  const sizeClasses = {
    xs: 'size-5 text-[9px]',
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-xs',
    lg: 'size-10 text-sm',
    xl: 'size-14 text-lg',
    '2xl': 'size-20 text-2xl',
  }[size];

  const iconSizes = {
    xs: 'size-2.5',
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
    xl: 'size-5',
    '2xl': 'size-6',
  }[size];

  const canEdit = editable || Boolean(onPhotoChange) || Boolean(onPhotoRemove);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    e.target.value = '';
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const optimizedUrl = await optimizePartyImageFile(file, {
        maxDimension: size === '2xl' || size === 'xl' ? 384 : 256,
        maxSizeBytes: 5 * 1024 * 1024,
      });
      if (onPhotoChange) {
        await onPhotoChange(optimizedUrl);
        setStatusMessage({ type: 'success', text: 'Image updated' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to process image' });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onPhotoRemove) {
      setIsProcessing(true);
      setStatusMessage(null);
      try {
        await onPhotoRemove();
        setStatusMessage({ type: 'success', text: 'Image removed' });
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Failed to remove image' });
        setTimeout(() => setStatusMessage(null), 4000);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${sizeClasses} ${className}`}
      title={statusMessage?.text || (showTooltip ? name : undefined)}
      onClick={(e) => {
        // Prevent clicking the avatar container from triggering unexpected parent row actions when editable
        if (canEdit) {
          e.stopPropagation();
        }
      }}
    >
      {/* Hidden file input when editable */}
      {canEdit && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="hidden"
          aria-label={`Upload photo for ${name}`}
        />
      )}

      {/* Main Avatar Content */}
      {photoUrl ? (
        <div className="relative size-full rounded-full overflow-hidden border border-slate-200/80 shadow-2xs bg-slate-100">
          <img
            src={photoUrl}
            alt={name}
            className="size-full object-cover rounded-full"
            onError={(e) => {
              // Hide broken image fallback to deterministic initials
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div
          className={`size-full flex items-center justify-center rounded-full font-bold font-sans border shadow-2xs ${palette.bg} ${palette.text} ${palette.border}`}
          aria-label={`Party: ${name}`}
        >
          {initials}
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 rounded-full bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-white z-20 shadow-xs">
          <Loader2 className={`${iconSizes} animate-spin text-indigo-400`} />
        </div>
      )}

      {/* Circular In-Avatar Hover Action Overlay when Editable */}
      {canEdit && !isProcessing && (
        <div
          className="absolute inset-0 rounded-full bg-slate-950/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1 z-10 cursor-pointer shadow-sm ring-2 ring-indigo-500/40"
          onClick={handleUploadClick}
          title={photoUrl ? 'Change or remove avatar image' : 'Upload avatar image'}
        >
          {/* Change / Upload Icon Button */}
          <button
            type="button"
            onClick={handleUploadClick}
            className="text-white hover:text-indigo-200 transition-colors p-1 rounded-full hover:bg-white/20"
            title={photoUrl ? 'Change Image' : 'Upload Image'}
            aria-label={photoUrl ? 'Change Image' : 'Upload Image'}
          >
            {photoUrl ? (
              <Camera className={iconSizes} />
            ) : (
              <Upload className={iconSizes} />
            )}
          </button>

          {/* Remove Icon Button if photoUrl exists and onPhotoRemove is available */}
          {photoUrl && onPhotoRemove && (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="text-rose-300 hover:text-rose-100 transition-colors p-1 rounded-full hover:bg-rose-600/40"
              title="Remove Image"
              aria-label="Remove Image"
            >
              <Trash2 className={iconSizes} />
            </button>
          )}
        </div>
      )}

      {/* Explicit Interactive Hover Action Popover Menu */}
      {canEdit && !isProcessing && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-40 ${
            actionPlacement === 'top'
              ? 'bottom-full mb-1.5'
              : 'top-full mt-1.5'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-lg p-1 shadow-xl flex items-center gap-1 text-[11px] whitespace-nowrap text-white animate-in fade-in zoom-in-95 duration-150">
            {/* Explicit Change Image Action */}
            <button
              type="button"
              onClick={handleUploadClick}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-indigo-600 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title={photoUrl ? 'Upload a new photo for this counterparty' : 'Upload an avatar photo'}
            >
              {photoUrl ? <Camera className="w-3 h-3 text-indigo-300" /> : <Upload className="w-3 h-3 text-indigo-300" />}
              <span>{photoUrl ? 'Change Image' : 'Upload Photo'}</span>
            </button>

            {/* Explicit Remove Image Action */}
            {photoUrl && onPhotoRemove && (
              <button
                type="button"
                onClick={handleRemoveClick}
                className="px-2 py-1 rounded-md bg-rose-950/80 hover:bg-rose-600 text-rose-200 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer border border-rose-800/60"
                title="Remove photo and revert to initial letters avatar"
              >
                <Trash2 className="w-3 h-3 text-rose-300" />
                <span>Remove Image</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] py-0.5 px-2 rounded-md shadow-lg z-50 pointer-events-none flex items-center gap-1 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border border-emerald-700'
              : 'bg-rose-900 text-rose-100 border border-rose-700'
          } ${
            actionPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-3 h-3 text-emerald-300" />
          ) : (
            <AlertCircle className="w-3 h-3 text-rose-300" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};
