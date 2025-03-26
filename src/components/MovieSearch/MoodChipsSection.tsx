'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MoodChip } from './MoodChip';

const categories = [
  {
    title: 'Moods',
    items: [
      'Feel-good', 'Dark', 'Intense', 'Thought-provoking', 'Emotional',
      'Uplifting', 'Relaxing', 'Exciting', 'Nostalgic', 'Inspiring',
      'Mysterious', 'Funny', 'Heartwarming', 'Suspenseful', 'Romantic'
    ]
  },
  {
    title: 'Specific Vibes',
    items: [
      'Mind-bending', 'Visually stunning', 'Plot twists', 'Strong female lead',
      'Based on true story', 'Award-winning', 'Cult classic', 'Hidden gem',
      'Critically acclaimed', 'Underrated', 'Atmospheric', 'Character-driven',
      'Fast-paced', 'Slow burn', 'Philosophical'
    ]
  },
  {
    title: 'Time Periods',
    items: [
      '80s nostalgia', '90s classics', 'Modern masterpieces', 'Retro',
      'Period drama', 'Futuristic', 'Classical era', 'Medieval',
      'Contemporary', 'Timeless'
    ]
  }
];

export const MoodChipsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-6xl mt-8">
      {categories.map((category, categoryIndex) => (
        <div key={category.title} className="mb-6">
          <h3 className="text-lg font-semibold text-violet-900 mb-3 px-4">
            {category.title}
          </h3>
          
          <div className="relative group">
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto pb-4 scrollbar-hide gap-3 px-4"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {category.items.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MoodChip label={item} />
                </motion.div>
              ))}
            </div>
            
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm
                       p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                       hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5 text-violet-600" />
            </button>
            
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm
                       p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                       hover:bg-white"
            >
              <ChevronRight className="w-5 h-5 text-violet-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};