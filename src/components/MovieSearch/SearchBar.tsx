'use client';

import { Search, Rabbit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';



const searchExamples = [
  "A mind-bending sci-fi like Inception but with more emotional depth",
  "Something similar to The Grand Budapest Hotel but darker",
  "A coming-of-age story set in the 90s with great soundtrack",
  "Movies about time travel that don't take themselves too seriously",
  "A thriller that keeps you guessing until the very end like Memento",
];

export const SearchBar = (props:any) => {
  const router = useRouter();
  const [isRabbitHole, setIsRabbitHole] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-2xl"
    >
      <div className="relative">
        <Search className="absolute left-4 top-6 text-violet-600 h-5 w-5" />
        <textarea
          rows={3}
          placeholder={searchExamples[currentExample]}
          value={props.searchValue}
          onChange={(e) => props.setSearchValue(e.target.value)}
          onFocus={() => {
            const nextExample = (currentExample + 1) % searchExamples.length;
            setCurrentExample(nextExample);
          }}
          className="w-full pl-12 pr-6 py-4 pb-6 rounded-2xl bg-white shadow-lg 
                     text-violet-900 placeholder-violet-400 resize-none
                     focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        {/* Submit Button */}
        <button
          onClick={props.handleSubmit}
          className="absolute right-40 bottom-4 px-4 py-1.5 rounded-full transition-all
                     bg-violet-500 text-white text-sm hover:bg-violet-600 shadow-lg cursor-pointer"
          title="Submit search input"
        >
          Submit
        </button>
        {/* Rabbit Hole Button */}
        <button
          onClick={() => setIsRabbitHole(!isRabbitHole)}
          style={{cursor:'pointer'}}
          className={`absolute right-4 bottom-4 px-4 py-1.5 rounded-full transition-all
                    flex items-center space-x-2
                    ${isRabbitHole 
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg scale-105' 
                      : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
          title="Rabbit Hole Mode - Enable deep, interconnected searching"
        >
          <Rabbit className="h-4 w-4" />
          <span className="text-sm font-medium">Rabbit Hole</span>
        </button>
      </div>
      
      {isRabbitHole && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-12 left-0 right-0 text-sm text-violet-800 bg-violet-100 
                     py-2 px-4 rounded-lg shadow-lg text-center font-medium"
        >
          🐰 Rabbit Hole Mode: Unlocked - Discovering hidden connections and rare gems
        </motion.div>
      )}
    </motion.div>
  );
};
