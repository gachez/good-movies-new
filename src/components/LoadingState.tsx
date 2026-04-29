'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, List, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FilmRabbitLoader } from '@/components/FilmRabbitLoader';

const movieQuotes = [
  "Here's looking at you, kid. - Casablanca",
  "I'll be back. - The Terminator",
  "May the Force be with you. - Star Wars",
  "Life is like a box of chocolates. - Forrest Gump",
  "Elementary, my dear Watson. - Sherlock Holmes",
  "There's no place like home. - The Wizard of Oz",
  "To infinity and beyond! - Toy Story",
  "Why so serious? - The Dark Knight",
  "I see dead people. - The Sixth Sense",
  "You're gonna need a bigger boat. - Jaws"
];

const aiTips = [
  {
    icon: ThumbsUp,
    text: "Like movies you enjoy to help me understand your taste"
  },
  {
    icon: ThumbsDown,
    text: "Dislike movies that don't match your preferences"
  },
  {
    icon: List,
    text: "Create lists to group your favorite films so I can understand your taste"
  },
  {
    icon: Sparkles,
    text: "The more you interact with me, the better my recommendations become"
  }
];

interface LoadingStateProps {
  isLoading: boolean;
}

export const LoadingState = ({ isLoading }: LoadingStateProps) => {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    // Typing animation
    let currentText = '';
    const quote = movieQuotes[currentQuote];
    let charIndex = 0;

    const typingInterval = setInterval(() => {
      if (charIndex < quote.length) {
        currentText += quote[charIndex];
        setDisplayedText(currentText);
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
        
        // Wait before starting next quote
        setTimeout(() => {
          setIsTyping(true);
          setCurrentQuote((prev) => (prev + 1) % movieQuotes.length);
        }, 2000);
      }
    }, 50);

    // Rotate through AI tips
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % aiTips.length);
    }, 3000);

    return () => {
      clearInterval(typingInterval);
      clearInterval(tipInterval);
    };
  }, [currentQuote, isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080b]/92 text-white backdrop-blur-md"
        >
          <div className="mx-auto max-w-3xl px-6 text-center">
            <FilmRabbitLoader
              size="lg"
              title="FilmRabbit is searching..."
              message="The more you interact, the better the rabbit gets at finding your perfect movies."
              className="mb-8"
            />

            <div className="mb-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {aiTips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: currentTip === index ? 1 : 0.5,
                    y: 0,
                    scale: currentTip === index ? 1.05 : 1
                  }}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30"
                >
                  <tip.icon className="h-6 w-6 shrink-0 text-cyan-300" />
                  <p className="text-left font-medium text-cyan-50/80">{tip.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              animate={{
                opacity: isTyping ? 1 : 0.7,
              }}
              className="mx-auto max-w-lg rounded-md border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-2xl shadow-black/30"
            >
              <p className="text-lg font-medium text-cyan-50">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-cyan-300"
                  >
                    |
                  </motion.span>
                )}
              </p>
            </motion.div>

            <div className="mt-8 flex justify-center space-x-2">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="h-3 w-3 rounded-full bg-cyan-300"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
