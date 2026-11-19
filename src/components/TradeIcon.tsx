import React from 'react';
import {
  Hammer,
  Ruler,
  Wind,
  Zap,
  Wrench,
  Flame,
  Home as RoofIcon,
  Server,
  HardHat,
  Layers,
} from 'lucide-react';
import { TradeId } from '../lib/trades';

interface TradeIconProps {
  trade?: TradeId | string;
  className?: string;
}

export function TradeIcon({ trade, className = 'h-4 w-4' }: TradeIconProps) {
  switch (trade) {
    case 'mason':
      return <Layers className={className} />;
    case 'carpenter':
      return <Hammer className={className} />;
    case 'framer':
      return <Ruler className={className} />;
    case 'hvac':
      return <Wind className={className} />;
    case 'electrician':
      return <Zap className={className} />;
    case 'plumber':
      return <Wrench className={className} />;
    case 'welder':
      return <Flame className={className} />;
    case 'roofer':
      return <RoofIcon className={className} />;
    case 'it':
      return <Server className={className} />;
    default:
      return <HardHat className={className} />;
  }
}
