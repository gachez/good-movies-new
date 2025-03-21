'use client';

import { Film, List, User, Rabbit } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Rabbit className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white hidden lg:block">GoodMovies AI</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/explore" 
              className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors"
            >
              <Film className="h-5 w-5" />
              <span>Explore</span>
            </Link>
            
            <Link 
              href="/lists" 
              className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors"
            >
              <List className="h-5 w-5" />
              <span>Lists</span>
            </Link>
            
            <Link 
              href="/profile" 
              className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};