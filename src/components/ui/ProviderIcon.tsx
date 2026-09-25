import React from 'react';
import { resolveProvider, ProviderDefinition } from '../../core/providers/registry';

export interface ProviderIconProps {
  provider?: string | null;
  method?: string | null;
  size?: 'sm' | 'md' | 'lg' | number;
  showLabel?: boolean;
  className?: string;
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({
  provider,
  method,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const def: ProviderDefinition = resolveProvider(provider, method);

  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 16
      : size === 'lg'
      ? 24
      : 20;

  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle ${className}`}
      title={`${def.displayName} (${def.category.toUpperCase()})`}
    >
      <span className="shrink-0 flex items-center justify-center">
        {def.renderIcon({ size: numericSize })}
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-700 truncate">
          {def.shortName}
        </span>
      )}
    </span>
  );
};
