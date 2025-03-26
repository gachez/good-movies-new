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
import axios from "axios";
import Config from "@/config";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/LoadingState";
import { ListSelectionModal } from "@/components/ListSelectionModal";
import toast, { Toaster } from "react-hot-toast";
import { MovieStorage } from "@/utils/movieStorage";

export default function SearchResults() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(
    "I want a movie about software development not necessarily a documentary but a movie with themes of coding and startups"
  );
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [rabbitHoleMode, setRabbitHoleMode] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [moviesFound, setMoviesFound] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSearchQuery(newMessage);
    setNewMessage("");
    setIsTyping(false);
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${Config.API_URL}/api/recommendations`,
        {
          params: { query: newMessage },
        }
      );
      // Save results to localStorage
      localStorage.setItem(
        "recommededMovies",
        JSON.stringify(response.data.results)
      );
      localStorage.setItem("searchValue", newMessage);
      setIsLoading(false);
      setMoviesFound(response.data.results);
    } catch (error) {
      alert("Something went wrong. Please try again.");
      console.log(error);
      setIsLoading(false);
    }
  }

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
      {isLoading && <LoadingState isLoading={isLoading} />}
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
      <Dialog
        open={!!showDetails}
        onOpenChange={(open) => !open && setShowDetails(null)}
      >
        <DialogContent className="bg-white text-gray-800 border-gray-300 max-w-3xl max-h-[90vh] overflow-y-auto">
          {showDetails && (
            <div className="flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>
                    {showDetails.title}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      ({new Date(showDetails.release_date).getFullYear()})
                    </span>
                  </span>
                  <div className="flex items-center bg-yellow-200 px-2 py-1 rounded text-sm">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-medium text-yellow-600">
                      {showDetails.vote_average.toFixed(1)}
                    </span>
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
                      {showDetails.genres.map((genre: string, idx: any) => (
                        <span
                          key={idx}
                          className="text-xs bg-purple-200 text-gray-800 px-2 py-1 rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 mb-6">{showDetails.overview}</p>
                {showDetails.matchReason && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="text-sm font-medium text-gray-800 mb-2">
                      Why we recommend this:
                    </h3>
                    <p className="text-sm text-gray-700">
                      {showDetails.matchReason}
                    </p>
                  </div>
                )}
                {showDetails.highlightedThemes &&
                  showDetails.highlightedThemes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-800 mb-2">
                        Key Themes:
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        {showDetails.highlightedThemes.map(
                          (theme: string, idx: any) => (
                            <Badge
                              key={idx}
                              className="bg-indigo-100 text-indigo-800 border-indigo-200"
                            >
                              {theme}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                <div className="flex flex-col space-y-2 mb-4">
                  <div>
                    <span className="text-gray-800 font-medium">
                      Release Date:{" "}
                    </span>
                    <span className="text-gray-600">
                      {new Date(showDetails.release_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-800 font-medium">
                      Popularity:{" "}
                    </span>
                    <span className="text-gray-600">
                      {showDetails.popularity.toFixed(1)}
                    </span>
                  </div>
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
                  rows={2}
                  className="w-full px-4 py-2 bg-transparent text-gray-800 placeholder-gray-500 resize-none focus:outline-none"
                  placeholder={
                    rabbitHoleMode ? "Go deeper..." : "Ask a question..."
                  }
                />
                <Button
                  onClick={handleSubmit}
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
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState<boolean>(false);
  const [showDislikeAnimation, setShowDislikeAnimation] =
    useState<boolean>(false);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load persisted state for this movie
  const [movieState, setMovieState] = useState(() =>
    MovieStorage.getMovieState(movie.id)
  );

  // When a movie is liked (via double tap or "More like this") we save it in the "Liked 👍" list.
  const handleLikeAnimation = () => {
    setShowLikeAnimation(true);
    // Save the liked state and add movie to the "Liked 👍" list.
    MovieStorage.saveMovieState(movie.id, {
      isLiked: true,
      isDisliked: false,
    });
    MovieStorage.addToList(movie, "Liked 👍");
    setMovieState((prev: any) => ({
      ...prev,
      isLiked: true,
      isDisliked: false,
    }));
    toast.success("You like this! 🎉");
    setTimeout(() => setShowLikeAnimation(false), 2000);
  };

  // When a movie is disliked we add it to the "Not my taste 👎" list.
  const handleDislikeAnimation = () => {
    setShowDislikeAnimation(true);
    MovieStorage.saveMovieState(movie.id, {
      isLiked: false,
      isDisliked: true,
    });
    MovieStorage.addToList(movie, "Not my taste 👎");
    setMovieState((prev: any) => ({
      ...prev,
      isLiked: false,
      isDisliked: true,
    }));
    toast.success("Cool, not for you! 😐");
    setTimeout(() => setShowDislikeAnimation(false), 2000);
  };

  const handleSeenClick = () => {
    setShowRatingModal(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent propagation if a button or action element was clicked.
    if ((e.target as HTMLElement).closest("button, .action-button")) {
      return;
    }
    if (clickTimeout) {
      // Double tap detected
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      handleLikeAnimation();
    } else {
      // Set a timeout to detect single tap (which shows details)
      const timeout = setTimeout(() => {
        onInfoClick();
        setClickTimeout(null);
      }, 250);
      setClickTimeout(timeout);
    }
  };

  // Cleanup timeout when component unmounts.
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  return (
    <div className="h-full p-4 flex flex-col justify-center items-center">
      <Toaster />
      {showRatingModal && (
        <RatingModal
          movie={movie}
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          onRate={(rating) => {
            MovieStorage.saveMovieState(movie.id, { isSeen: true });
            setMovieState((prev: any) => ({ ...prev, isSeen: true }));
            MovieStorage.saveMovieState(movie.id, { rating });
            setMovieState((prev: any) => ({ ...prev, rating }));

            toast.success("Added to your Watched list!");
          }}
        />
      )}
      {showListModal && (
        <ListSelectionModal
          movie={movie}
          open={showListModal}
          onOpenChange={setShowListModal}
          // ListSelectionModal should fetch available lists from localStorage
          onListSelected={(listName) => {
            MovieStorage.addToList(movie, listName);
            setMovieState((prev: any) => ({
              ...prev,
              lists: [...prev.lists, listName],
            }));

            toast.success(`Added to your ${listName} list!`);
          }}
        />
      )}
      <Card
        className="mx-auto bg-transparent shadow-xl border border-gray-300 overflow-hidden max-w-md w-full hover:shadow-2xl transition-shadow duration-300 relative"
        onClick={handleCardClick}
      >
        <div className="relative aspect-[2/3] w-full h-full">
          {showLikeAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50 animate-like-popup">
              <span className="text-orange-500" style={{ fontSize: "6rem" }}>
                👍
              </span>
            </div>
          )}
          {showDislikeAnimation && (
            <div className="absolute inset-0 flex items-center justify-center z-50 animate-like-popup">
              <span className="text-red-500" style={{ fontSize: "6rem" }}>
                👎
              </span>
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
          {/* Movie info overlay */}
          <div className="absolute bottom-24 left-0 right-0 p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-bold text-white line-clamp-2">
                {movie.title}
              </h2>
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
                <span className="text-xs text-white">
                  +{movie.genres.length - 3} more
                </span>
              )}
            </div>
            {movie.matchReason && (
              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-md mb-3 text-sm">
                <p className="font-medium text-gray-800 mb-1">
                  Why we recommend:
                </p>
                <p className="text-gray-700 line-clamp-2">
                  {movie.matchReason}
                </p>
              </div>
            )}
            {movie.highlightedThemes && movie.highlightedThemes.length > 0 && (
              <div className="mb-3">
                <p className="font-medium text-white text-sm mb-1">
                  Key Themes:
                </p>
                <div className="flex flex-wrap gap-1">
                  {movie.highlightedThemes
                    .slice(0, 3)
                    .map((theme: any, idx: any) => (
                      <span
                        key={idx}
                        className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full"
                      >
                        {theme}
                      </span>
                    ))}
                  {movie.highlightedThemes.length > 3 && (
                    <span className="text-xs text-white">
                      +{movie.highlightedThemes.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="absolute top-2 left-2 flex items-center bg-green-500 px-2 py-1 rounded-md text-sm">
            <span className="mr-1">
              <StarIcon className="w-4 h-4 text-white" />
            </span>
            <span className="font-medium text-white">
              {(movie.relevanceScore * 100).toFixed(1)}% Match
            </span>
          </div>
          {/* Action buttons */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm py-2">
            <div className="flex justify-between px-2">
              <div
                className={`action-button flex flex-col items-center justify-center p-1 cursor-pointer ${
                  movieState.isSeen ? "bg-green-500/20 rounded-lg" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeenClick();
                }}
              >
                <span
                  className={`${
                    movieState.isSeen ? "text-green-400" : "text-green-500"
                  }`}
                  style={{ fontSize: "2.5rem" }}
                >
                  ✓
                </span>
                <span className="text-xs text-white">Seen</span>
              </div>
              <div
                className="action-button flex flex-col items-center justify-center p-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowListModal(true);
                }}
              >
                <span
                  className="text-lg text-blue-500"
                  style={{ fontSize: "2.5rem" }}
                >
                  +
                </span>
                <span className="text-xs text-white">Add to list</span>
              </div>
              <div
                className={`action-button flex flex-col items-center justify-center p-1 cursor-pointer ${
                  movieState.isDisliked ? "bg-red-500/20 rounded-lg" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDislikeAnimation();
                }}
              >
                <span
                  className={`${
                    movieState.isDisliked ? "text-red-400" : "text-red-500"
                  }`}
                  style={{ fontSize: "2.5rem" }}
                >
                  👎
                </span>
                <span className="text-xs text-white">Not for me</span>
              </div>
              <div
                className={`action-button flex flex-col items-center justify-center p-1 cursor-pointer ${
                  movieState.isLiked ? "bg-orange-500/20 rounded-lg" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeAnimation();
                }}
              >
                <span
                  className={`${
                    movieState.isLiked ? "text-orange-400" : "text-orange-500"
                  }`}
                  style={{ fontSize: "2.5rem" }}
                >
                  👍
                </span>
                <span className="text-xs text-white">More like this</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
