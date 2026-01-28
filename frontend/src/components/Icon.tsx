/**
 * Reusable Icon component that wraps FontAwesomeIcon.
 * Provides consistent styling and handles the hideIcons prop.
 */

import { memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition, SizeProp } from '@fortawesome/fontawesome-svg-core';

interface IconProps {
  icon: IconDefinition | undefined;
  className?: string;
  size?: SizeProp;
  fixedWidth?: boolean;
}

export const Icon = memo(function Icon({
  icon,
  className,
  size,
  fixedWidth = true,
}: IconProps): JSX.Element | null {
  if (!icon) {
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      size={size}
      fixedWidth={fixedWidth}
    />
  );
});
