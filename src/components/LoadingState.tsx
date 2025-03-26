'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Rabbit, ThumbsUp, ThumbsDown, List, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    text: "Create lists to group your favorite films this wll help me understand your taste"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-violet-50/80 backdrop-blur-sm"
        >
          <div className="max-w-3xl mx-auto px-6 text-center">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-block mb-8 text-violet-600"
            >
              <Rabbit className="w-16 h-16" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl md:text-3xl font-bold text-violet-900 mb-4"
            >
              Please wait while I search...
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg text-violet-700 mb-8"
            >
              The more you interact, the better I become at finding your perfect movies
            </motion.p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {aiTips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: currentTip === index ? 1 : 0.5,
                    y: 0,
                    scale: currentTip === index ? 1.05 : 1
                  }}
                  className="bg-white p-4 rounded-xl shadow-md flex items-center gap-3"
                >
                  <tip.icon className="w-6 h-6 text-violet-600" />
                  <p className="text-left text-violet-800 font-medium">{tip.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              animate={{
                opacity: isTyping ? 1 : 0.7,
              }}
              className="bg-white p-6 rounded-xl shadow-xl max-w-lg mx-auto"
            >
              <p className="text-lg text-violet-800 font-medium">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
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
                  className="w-3 h-3 rounded-full bg-violet-600"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};