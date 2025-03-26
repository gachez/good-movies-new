"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Star,
  Plus,
  Eye,
  MoreHorizontal,
  Share2,
  ChevronDown,
  MessageSquare,
  Send,
  Compass,
  Sparkles,
  Rabbit,
  Film,
  List,
  User,
  CheckCircle,
  ThumbsDown,
  ThumbsUp,
  Info,
  CheckIcon,
  PlusIcon,
  StarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import RatingModal from "./rating-modal";

export default function SearchResults() {
  const [searchQuery, setSearchQuery] = useState(
    "I want a movie about software development not necessarily a documentary but a movie with themes of coding and startups"
  );
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [rabbitHoleMode, setRabbitHoleMode] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [moviesFound, setMoviesFound] = useState<any>([]);
  const scrollContainerRef = useRef<any>(null);
  const messageInputRef = useRef<any>(null);

  useEffect(() => {
    const searchValue = localStorage.getItem("searchValue") as string;
    const recommendedMovies = localStorage.getItem(
      "recommededMovies"
    ) as string;

    setMoviesFound(JSON.parse(recommendedMovies));
    setSearchQuery(searchValue);
  }, []);

  const handleScrollSnap = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollPosition = container.scrollTop;
      const cardHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / cardHeight);
      setCurrentCardIndex(newIndex);
    }
  };

  const showMovieDetails = (movie: any) => {
    setShowDetails(movie);
  };

  const scrollToNextCard = () => {
    if (
      scrollContainerRef.current &&
      currentCardIndex < moviesFound.length - 1
    ) {
      const newIndex = currentCardIndex + 1;
      scrollContainerRef.current.scrollTo({
        top: newIndex * scrollContainerRef.current.clientHeight,
        behavior: "smooth",
      });
    }
  };

  const scrollToPrevCard = () => {
    if (scrollContainerRef.current && currentCardIndex > 0) {
      const newIndex = currentCardIndex - 1;
      scrollContainerRef.current.scrollTo({
        top: newIndex * scrollContainerRef.current.clientHeight,
        behavior: "smooth",
      });
    }
  };

  const focusMessageInput = () => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleMessageSubmit = (e: any) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSearchQuery(newMessage);
    setNewMessage("");
    setIsTyping(false);
  };

  const toggleRabbitHoleMode = () => {
    setRabbitHoleMode(!rabbitHoleMode);
  };

  // Generate poster URL from path
  const getPosterUrl = (path: any) => {
    return path
      ? `https://image.tmdb.org/t/p/w500${path}`
      : "/api/placeholder/500/750";
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-100 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm text-gray-800 p-4 sticky top-0 z-20 shadow-md">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Rabbit className="h-6 w-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800 hidden lg:block">
                FilmRabbit AI
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link
                href="/explore"
                className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Film className="h-5 w-5" />
                <span className="hidden md:inline">Explore</span>
              </Link>

              <Link
                href="/lists"
                className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <List className="h-5 w-5" />
                <span className="hidden md:inline">Lists</span>
              </Link>

              <Link
                href="/profile"
                className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline">Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Current Search Query Display */}
      <div className="bg-gray-100 backdrop-blur-sm text-gray-800 py-2 px-4 sticky top-16 z-10">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center">
              <MessageSquare size={12} className="text-purple-600" />
            </div>
            <div className="flex-grow">
              <p className="text-xs text-gray-600">Your request:</p>
              <p className="text-sm text-gray-800 line-clamp-1">
                {searchQuery}
              </p>
            </div>
            {rabbitHoleMode && (
              <Badge className="bg-purple-200 text-gray-800 border-purple-300">
                <Sparkles size={12} className="mr-1" /> Rabbit Hole
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Movie Cards Vertical Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="h-[calc(100vh-13rem)] overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScrollSnap}
      >
        {moviesFound.map((movie: any, index: number) => (
          <div key={index} className="h-full snap-start snap-always">
            <MovieCard
              movie={movie}
              onInfoClick={() => showMovieDetails(movie)}
              posterUrl={getPosterUrl(movie.poster_path)}
            />
          </div>
        ))}
      </div>

      {/* Movie Details Modal */}
      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
  <DialogContent className="bg-white text-gray-800 border-gray-300 max-w-3xl max-h-[90vh] overflow-y-auto">
    {showDetails && (
      <div className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span>{showDetails.title} <span className="text-sm font-normal text-gray-500">({new Date(showDetails.release_date).getFullYear()})</span></span>
            <div className="flex items-center bg-yellow-200 px-2 py-1 rounded text-sm">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-medium text-yellow-600">{showDetails.vote_average.toFixed(1)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col mb-4">
          <div className="w-full aspect-video mb-4 overflow-hidden rounded-md relative">
            <img
              src={getPosterUrl(showDetails.poster_path)}
              alt={showDetails.title}
              width={500}
              height={750}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
              <div className="flex flex-wrap gap-1">
                {showDetails.genres.map((genre:string, idx:any) => (
                  <span key={idx} className="text-xs bg-purple-200 text-gray-800 px-2 py-1 rounded-full">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">{showDetails.overview}</p>
          
          {showDetails.matchReason && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Why we recommend this:</h3>
              <p className="text-sm text-gray-700">{showDetails.matchReason}</p>
            </div>
          )}
          
          {showDetails.highlightedThemes && showDetails.highlightedThemes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Key Themes:</h3>
              <div className="flex gap-2 flex-wrap">
                {showDetails.highlightedThemes.map((theme:string, idx:any) => (
                  <Badge key={idx} className="bg-indigo-100 text-indigo-800 border-indigo-200">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2 mb-4">
            <div>
              <span className="text-gray-800 font-medium">Release Date: </span>
              <span className="text-gray-600">{new Date(showDetails.release_date).toLocaleDateString()}</span>
            </div>
            
            <div>
              <span className="text-gray-800 font-medium">Popularity: </span>
              <span className="text-gray-600">{showDetails.popularity.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex justify-between gap-2 mt-2">
            <Button className="bg-purple-500 hover:bg-purple-400 text-white px-3">
              <CheckCircle className="h-5 w-5 mr-1" /> 
              <span className="text-xs">Seen</span>
            </Button>
            <Button variant="outline" className="border border-purple-500 text-purple-500 hover:bg-purple-100 px-3">
              <Plus className="h-5 w-5 mr-1" /> 
              <span className="text-xs">List</span>
            </Button>
            <Button variant="outline" className="border border-purple-500 text-purple-500 hover:bg-purple-100 px-3">
              <ThumbsUp className="h-5 w-5 mr-1" /> 
              <span className="text-xs">More</span>
            </Button>
          </div>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

      {/* Fixed Chat Input at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md p-3 shadow-lg z-30">
        <div className="container mx-auto max-w-3xl">
          <form onSubmit={handleMessageSubmit} className="relative">
            <div className="flex gap-2 items-end">
              <Button
                type="button"
                onClick={toggleRabbitHoleMode}
                variant={rabbitHoleMode ? "default" : "outline"}
                className={`${
                  rabbitHoleMode
                    ? "bg-purple-500 hover:bg-purple-600 text-white"
                    : "border-gray-400 text-purple-600 hover:bg-gray-200"
                } rounded-full p-2 h-auto flex-shrink-0 cursor-pointer`}
                title="Rabbit Hole Mode - Deep dive into advanced recommendations"
              >
                <Rabbit size={18} />
              </Button>

              <div className="relative flex-grow bg-gray-50 rounded-xl border border-gray-300 overflow-hidden">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setIsTyping(true);
                  }}
                  rows={1}
                  className="w-full px-4 py-2 bg-transparent text-gray-800 placeholder-gray-500 resize-none focus:outline-none"
                  placeholder={
                    rabbitHoleMode ? "Go deeper..." : "Refine your search..."
                  }
                />

                <Button
                  type="submit"
                  className="absolute right-2 bottom-2 bg-purple-500 hover:bg-purple-400 text-white rounded-full p-2 h-auto"
                  disabled={!newMessage.trim()}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function MovieCard({ movie, onInfoClick, posterUrl }: any) {
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState<boolean>(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleLikeAnimation = () => {
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Stop event propagation for buttons to work independently
    if ((e.target as HTMLElement).closest('button, .action-button')) {
      return;
    }

    if (clickTimeout) {
      // Double click detected
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      handleLikeAnimation();
    } else {
      // Set timeout for single click
      const timeout = setTimeout(() => {
        onInfoClick();
        setClickTimeout(null);
      }, 250); // Wait 250ms to detect if it's a double click
      setClickTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  return (
    <div className="h-full p-4 flex flex-col justify-center items-center">
      {showRatingModal && 
        <RatingModal movie={movie} open={showRatingModal} onOpenChange={setShowRatingModal} />
      }
      <Card 
        className="mx-auto bg-transparent shadow-xl border border-gray-300 overflow-hidden max-w-md w-full hover:shadow-2xl transition-shadow duration-300 relative"
        onClick={handleCardClick}
      >
        <div className="relative aspect-[2/3] w-full h-full">
          {showLikeAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50 animate-like-popup">
              <span className="text-orange-500" style={{ fontSize: '6rem' }}>👍</span>
            </div>
          )}

          <img
            src={posterUrl}
            alt={movie.title}
            width={500}
            height={750}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

          {/* Movie info overlay at top/middle */}
          <div className="absolute bottom-24 left-0 right-0 p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-bold text-white line-clamp-2">{movie.title}</h2>
              <div className="flex items-center bg-yellow-200 px-2 py-1 rounded-md text-sm">
                <span className="mr-1">⭐</span>
                <span className="font-medium text-yellow-600">
                  {movie.vote_average.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center text-sm text-white mb-2">
              <span>{new Date(movie.release_date).getFullYear()}</span>
              <span className="mx-2">•</span>
              <span>Popularity: {movie.popularity.toFixed(1)}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {movie.genres &&
                movie.genres.slice(0, 3).map((genre: any, index: number) => (
                  <span
                    key={index}
                    className="text-xs bg-purple-200 text-gray-800 px-2 py-0.5 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              {movie.genres && movie.genres.length > 3 && (
                <span className="text-xs text-white">+{movie.genres.length - 3} more</span>
              )}
            </div>

            {/* Match Reason Section */}
            {movie.matchReason && (
              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-md mb-3 text-sm">
                <p className="font-medium text-gray-800 mb-1">Why we recommend:</p>
                <p className="text-gray-700 line-clamp-2">
                  {movie.matchReason}
                </p>
              </div>
            )}

            {/* Highlighted Themes Section */}
            {movie.highlightedThemes && movie.highlightedThemes.length > 0 && (
              <div className="mb-3">
                <p className="font-medium text-white text-sm mb-1">
                  Key Themes:
                </p>
                <div className="flex flex-wrap gap-1">
                  {movie.highlightedThemes.slice(0, 3).map((theme: any, idx: any) => (
                    <span
                      key={idx}
                      className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full"
                    >
                      {theme}
                    </span>
                  ))}
                  {movie.highlightedThemes.length > 3 && (
                    <span className="text-xs text-white">+{movie.highlightedThemes.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-2 left-2 flex items-center bg-green-500 px-2 py-1 rounded-md text-sm">
                <span className="mr-1"><StarIcon className="w-4 h-4 text-white" /></span>
                <span className="font-medium text-white">
                  {movie.relevanceScore.toFixed(1) * 100}% Match
                </span>
              </div>

          {/* Update action buttons to prevent event propagation */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm py-2">
            <div className="flex justify-between px-2">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatingModal(true);
                }} 
                className="action-button flex flex-col items-center justify-center p-1 cursor-pointer"
              >
                <span className="text-green-500" style={{fontSize: '2.5rem'}}>✓</span>
                <span className="text-xs text-white">Seen</span>
              </div>
              
              <div 
                className="action-button flex flex-col items-center justify-center p-1 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-lg text-blue-500" style={{fontSize: '2.5rem'}}>+</span>
                <span className="text-xs text-white">Add to list</span>
              </div>
              
              <div 
                className="action-button flex flex-col items-center justify-center p-1 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-lg text-orange-500" style={{fontSize: '2.5rem'}}>👎</span>
                <span className="text-xs text-white">Not for me</span>
              </div>
              
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeAnimation();
                }}
                className="action-button flex flex-col items-center justify-center p-1 cursor-pointer"
              >
                <span className="text-lg text-orange-500" style={{fontSize: '2.5rem'}}>👍</span>
                <span className="text-xs text-white">More like this</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
// Sample data from the new format
// const movies = [
//   {
//     "adult": false,
//     "backdrop_path": "/tuTjxEHUQWqbFkuoSY3RWu7lSob.jpg",
//     "genre_ids": [35, 18, 878, 53],
//     "id": 1178556,
//     "original_language": "nl",
//     "original_title": "Ik ben geen robot",
//     "overview": "A music producer spirals into an existential crisis after repeatedly failing a CAPTCHA test-leading her to question whether she might actually be a robot.",
//     "popularity": 22.389,
//     "poster_path": "/tlkpqKiJ2IRV4d0pjhso29AzESj.jpg",
//     "release_date": "2025-03-20",
//     "title": "I'm Not a Robot",
//     "video": false,
//     "vote_average": 8,
//     "vote_count": 1,
//     "relevanceScore": 5.91,
//     "genres": ["Comedy", "Drama", "Science Fiction", "Thriller"],
//     "matchReason": "The theme of questioning one's own identity in a technological and digital age aligns well with elements of innovation and coding. While not directly about software development or startups, it carries a tech-oriented existential theme that ties into the user's interests.",
//     "highlightedThemes": ["technology", "existential tech crisis"],
//     "hasContentAnalysis": true
//   },
//   {
//     "adult": false,
//     "backdrop_path": "/uzobkEgGCfVzmXyXKH6Nbrby4Rm.jpg",
//     "genre_ids": [35, 18],
//     "id": 188222,
//     "original_language": "en",
//     "original_title": "Entourage",
//     "overview": "Movie star Vincent Chase, together with his boys, Eric, Turtle and Johnny, are back…and back in business with super agent-turned-studio head Ari Gold. Some of their ambitions have changed, but the bond between them remains strong as they navigate the capricious and often cutthroat world of Hollywood.",
//     "popularity": 5.84,
//     "poster_path": "/28dqsx1jCxhR05DfH35ui13ywNZ.jpg",
//     "release_date": "2015-06-03",
//     "title": "Entourage",
//     "video": false,
//     "vote_average": 6.2,
//     "vote_count": 1027,
//     "relevanceScore": 3.4930000000000003,
//     "genres": ["Comedy", "Drama"],
//     "matchReason": "While 'Entourage' revolves around ambition and navigating a competitive world, it focuses on the entertainment industry rather than startups or technology. It has minimal relevance to coding or software development.",
//     "highlightedThemes": ["entrepreneurship", "ambition"],
//     "hasContentAnalysis": true
//   },
//   {
//     "adult": false,
//     "backdrop_path": "/gXboplsdDKprKA46IptKwDgY6Nr.jpg",
//     "genre_ids": [18, 35],
//     "id": 194662,
//     "original_language": "en",
//     "original_title": "Birdman or (The Unexpected Virtue of Ignorance)",
//     "overview": "A fading actor best known for his portrayal of a popular superhero attempts to mount a comeback by appearing in a Broadway play. As opening night approaches, his attempts to become more altruistic, rebuild his career, and reconnect with friends and family prove more difficult than expected.",
//     "popularity": 6.106,
//     "poster_path": "/rHUg2AuIuLSIYMYFgavVwqt1jtc.jpg",
//     "release_date": "2014-10-17",
//     "title": "Birdman or (The Unexpected Virtue of Ignorance)",
//     "video": false,
//     "vote_average": 7.459,
//     "vote_count": 12942,
//     "relevanceScore": 3.161885,
//     "genres": ["Drama", "Comedy"],
//     "matchReason": "Although innovation and creative struggles are depicted in 'Birdman,' the focus is on the arts and personal redemption rather than technology or software development.",
//     "highlightedThemes": ["ambition", "creative struggle"],
//     "hasContentAnalysis": true
//   },
//   {
//     "adult": false,
//     "backdrop_path": "/43aKOAWBaQYYef9EmtwL7N1zNIc.jpg",
//     "genre_ids": [35, 18],
//     "id": 1000866,
//     "original_language": "fr",
//     "original_title": "En fanfare",
//     "overview": "Diagnosed with leukemia, a successful orchestra conductor learns that he is adopted, and his younger brother is in a village marching band. The conductor decides to help them win a regional contest.",
//     "popularity": 5.833,
//     "poster_path": "/yRj1mh4vMkPHloXm8rKsqBEPiIf.jpg",
//     "release_date": "2024-11-27",
//     "title": "Marching Band",
//     "video": false,
//     "vote_average": 7.5,
//     "vote_count": 221,
//     "relevanceScore": 2.675,
//     "genres": ["Comedy", "Drama"],
//     "matchReason": "This film focuses on music and personal connections rather than technology or startups, making it less relevant to the search for software development themes.",
//     "highlightedThemes": ["personal growth", "mentorship"]
//   }
// ];
