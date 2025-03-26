"use client";
import { SearchBar } from '@/components/MovieSearch/SearchBar';
import { MoodChipsSection } from '@/components/MovieSearch/MoodChipsSection';
import MovieGrid from '@/components/MovieSearch/MovieGrid';
import { Navbar } from '@/components/MovieSearch/Navbar';
import { toast, Toaster} from 'react-hot-toast'
import { useState } from 'react';
import axios from 'axios';
import { LoadingState } from '@/components/LoadingState';
import Config from '@/config';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { SearchHistory } from '@/components/SearchHistory';

export default function Home() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [filters, selectedFilters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e:any) {
    e.preventDefault();
    try {
      setIsLoading(true);

      const response = await axios.get(`${Config.API_URL}/api/recommendations`, {
        params: {
          query: searchValue,
          resetContext: true
        },
      })
  
      console.log("Found results ==> ", response);
      //set found movies to localStorage
      localStorage.setItem('recommededMovies', JSON.stringify(response.data.results));
      localStorage.setItem('searchValue', searchValue);
      setIsLoading(false);
      router.push('/results');
    } catch (error) {
      alert("Something went wrong. Please try again.");
      console.log(error);
      setIsLoading(false);
    }

  }


  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 relative">
      <Toaster />
      {
        isLoading && <LoadingState isLoading={isLoading} />
      }
      <Navbar />
      <MovieGrid />
      
      <div className="relative z-10 container mx-auto px-4 pt-32 pb-16 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-violet-900 mb-8 text-center">
          What kind of movie are you looking for?
        </h1>
        
        <SearchBar handleSubmit={handleSubmit} searchValue={searchValue} setSearchValue={setSearchValue} toast={toast} />
        <MoodChipsSection />
      </div>

      <SearchHistory />
    </main>
  );
}