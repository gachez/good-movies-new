'use client';

import { motion } from 'framer-motion';
import { Clock, MessageSquare, X, ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { useState } from 'react';

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  hasConversation?: boolean;
}

// Example data - in a real app, this would come from a database
const exampleHistory: SearchHistoryItem[] = [];

export const SearchHistory = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 md:hidden bg-violet-600 text-white p-3 rounded-full shadow-lg"
      >
        {isOpen ? <X /> : <Clock />}
      </button>

      {/* Desktop toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-violet-600 text-white p-2 rounded-l-lg shadow-lg"
      >
        {isOpen ? <ChevronRight /> : <ChevronLeft />}
      </button>

      <motion.div
        initial={false}
        animate={{
          x: isOpen ? '0%' : '100%',
          width: isOpen ? 'auto' : '0'
        }}
        className={`fixed right-0 top-0 h-full z-30 bg-white shadow-2xl
                   md:top-20 md:pt-0 pt-16
                   ${isOpen ? 'w-full md:w-96' : 'w-0'}`}
      >
        <div className="h-full overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-violet-900 mb-6">Search History</h2>
          
          <div className="space-y-4">
            {exampleHistory.length > 0 ? (
              exampleHistory.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedItem(item.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors
                            ${selectedItem === item.id
                              ? 'bg-violet-100 border-2 border-violet-300'
                              : 'bg-gray-50 hover:bg-violet-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-violet-900 font-medium mb-1">{item.query}</p>
                      <div className="flex items-center gap-2 text-sm text-violet-600">
                        <Clock className="w-4 h-4" />
                        <span>{item.timestamp}</span>
                        {item.hasConversation && (
                          <>
                            <span>•</span>
                            <MessageSquare className="w-4 h-4" />
                            <span>Has conversation</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center py-12 px-4"
              >
                <div className="bg-violet-100 p-6 rounded-full mb-6">
                  <History className="w-12 h-12 text-violet-600" />
                </div>
                <h3 className="text-xl font-semibold text-violet-900 mb-2">
                  No Search History Yet
                </h3>
                <p className="text-violet-600 mb-6">
                  Start searching for movies and your history will appear here
                </p>
                <div className="bg-violet-50 p-4 rounded-lg">
                  <p className="text-sm text-violet-700 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Try searching for "Movies like Inception"
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};