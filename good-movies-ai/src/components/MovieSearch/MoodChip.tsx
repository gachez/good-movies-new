'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MoodChipProps {
  label: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MoodChip = ({ label, isSelected, onClick, className }: MoodChipProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
        isSelected
          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
          : 'bg-white text-violet-700 hover:bg-violet-50',
        'shadow-sm',
        className
      )}
    >
      {label}
    </motion.button>
  );
};