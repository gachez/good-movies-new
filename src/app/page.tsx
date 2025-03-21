"use client";
import { SearchBar } from '@/components/MovieSearch/SearchBar';
import { MoodChipsSection } from '@/components/MovieSearch/MoodChipsSection';
import MovieGrid from '@/components/MovieSearch/MovieGrid';
import { Navbar } from '@/components/MovieSearch/Navbar';
import { toast, Toaster} from 'react-hot-toast'
import { useState } from 'react';

export default function Home() {
  const [searchValue, setSearchValue] = useState("");
  const [filters, selectedFilters] = useState([]);
  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 relative">
      <Toaster />
      <Navbar />
      <MovieGrid />
      
      <div className="relative z-10 container mx-auto px-4 pt-32 pb-16 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-violet-900 mb-8 text-center">
          What kind of movie are you looking for?
        </h1>
        
        <SearchBar searchValue={searchValue} toast={toast} />
        <MoodChipsSection />
      </div>
    </main>
  );
}