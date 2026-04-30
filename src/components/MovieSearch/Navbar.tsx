'use client';

import { Film, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

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
            <BrandLogo size={32} />
            <span className="text-2xl font-bold text-white hidden lg:block">FlickBuddy AI</span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/discover" 
              className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors"
            >
              <Film className="h-5 w-5" />
              <span>Explore</span>
            </Link>
            
            <Link 
              href="/search" 
              className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
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
