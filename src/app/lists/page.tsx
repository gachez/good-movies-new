"use client";

import {
  Film,
  Heart,
  Info,
  List,
  Plus,
  Share2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
  CheckCircle,
  ThumbsUp,
  StarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/MovieSearch/Navbar";
import { MovieStorage } from "@/utils/movieStorage";
import { Movie, MovieListItem } from "@/types/movie";
import { MovieList } from "@/types/movie"; // Make sure MovieList is exported from your types

const getPosterUrl = (path: string) =>
  `https://image.tmdb.org/t/p/original${path}`;

export default function MovieLists() {
  // Load all lists as MovieList objects
  const [lists, setLists] = useState<MovieList[]>(() =>
    MovieStorage.getMovieLists()
  );
  const [selectedList, setSelectedList] = useState<MovieList | null>(
    lists[0] || null
  );
  const [newListName, setNewListName] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDetails, setShowDetails] = useState<Movie | null>(null);

  // Movies in the selected list (retrieved from storage for consistency)
  const [listMovies, setListMovies] = useState<MovieListItem[]>(() =>
    selectedList ? MovieStorage.getMoviesInList(selectedList.name) : []
  );

  // Update movies when list selection changes
  useEffect(() => {
    if (selectedList) {
      setListMovies(MovieStorage.getMoviesInList(selectedList.name));
    }
  }, [selectedList]);

  // Utility: refresh the lists from storage
  const refreshLists = () => {
    const updated = MovieStorage.getMovieLists();
    setLists(updated);
    if (!selectedList && updated.length > 0) {
      setSelectedList(updated[0]);
    } else if (selectedList) {
      // Update selectedList reference in case it was modified
      const sel = updated.find((l) => l.name === selectedList.name);
      setSelectedList(sel || null);
    }
  };

  // Create a new list without adding a dummy movie.
  const handleAddList = () => {
    const trimmed = newListName.trim();
    if (trimmed) {
      const currentLists = MovieStorage.getMovieLists();
      // Only add if it doesn't already exist
      if (!currentLists.find((l) => l.name === trimmed)) {
        const newList: MovieList = {
          id: Date.now(),
          name: trimmed,
          description: "",
          movies: [],
        };
        currentLists.push(newList);
        MovieStorage.saveMovieLists(currentLists);
        refreshLists();
        // Optionally set the new list as selected
        setSelectedList(newList);
      }
      setNewListName("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddList();
    }
  };

  const handleRemoveFromList = (movieId: number) => {
    if (selectedList) {
      MovieStorage.removeFromList(movieId, selectedList.name);
      setListMovies(MovieStorage.getMoviesInList(selectedList.name));
    }
  };

  const handleClearList = () => {
    if (selectedList) {
      MovieStorage.clearList(selectedList.name);
      setListMovies([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Navbar />
      <div className="container mt-12 mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <List className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
                My Lists
              </h1>
              <p className="mt-2 text-sm md:text-base text-gray-600">
                Organize and manage your movie collections
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div
            className={`
              fixed md:relative inset-0 z-30 md:z-auto
              md:col-span-3 
              transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
          >
            {/* Overlay for mobile */}
            <div
              className="absolute inset-0 bg-black/20 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <Card className="relative h-full md:h-auto p-4 max-w-[250px] md:max-w-none">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Your Lists
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Create new list..."
                    className="mb-3"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddList}
                    className="mb-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {lists.map((list) => (
                    <Button
                      key={list.id}
                      variant={selectedList?.name === list.name ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        setSelectedList(list);
                        setListMovies(MovieStorage.getMoviesInList(list.name));
                        setIsSidebarOpen(false);
                      }}
                    >
                      <List className="h-4 w-4" />
                      {list.name}
                    </Button>
                  ))}
                </ScrollArea>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-1 md:col-span-9">
            <Card className="p-4 md:p-6">
              <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                    {selectedList?.name || "No List Selected"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {listMovies.length} movies
                  </p>
                </div>
                <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 border-purple-500 text-purple-500 hover:bg-purple-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Share List
                  </Button>
                  <Button className="gap-2 bg-purple-500 hover:bg-purple-400 text-white">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden md:inline">
                      Get Recommendations Based on List
                    </span>
                    <span className="inline md:hidden">
                      Get Recommendations
                    </span>
                  </Button>
                </div>
              </div>

              {/* Movies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {listMovies.map((movie) => (
                  <Card
                    key={movie.id}
                    className="group overflow-hidden transition-all hover:ring-2 hover:ring-purple-500"
                  >
                    <div className="relative h-[200px] md:h-[300px] w-full">
                      {MovieStorage.getMovieState(movie.id).rating && (
                        <div className="absolute top-2 left-2 flex items-center bg-green-500 px-2 py-1 rounded-md text-sm">
                          <StarIcon className="w-4 h-4 text-white mr-1" />
                          <span className="font-medium text-white">
                            You rated this {MovieStorage.getMovieState(movie.id).rating}/5
                          </span>
                        </div>
                      )}
                      <img
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveFromList(movie.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-3 md:p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-lg md:text-xl font-semibold text-gray-800 line-clamp-1">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-1 md:gap-2">
                          <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                          <span className="text-sm font-medium">
                            {movie.vote_average.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                        <Film className="h-4 w-4" />
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                        <span className="text-gray-300">•</span>
                        <span>{movie.genres.slice(0, 2).join(", ")}</span>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-purple-500 text-purple-500 hover:bg-purple-50"
                        onClick={() => setShowDetails(movie)}
                      >
                        <Info className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Movie Details Modal */}
      <Dialog
        open={!!showDetails}
        onOpenChange={(open) => !open && setShowDetails(null)}
      >
        <DialogContent className="bg-white text-gray-800 border-gray-300 max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          {showDetails && (
            <div className="flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-bold flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="line-clamp-2">
                    {showDetails.title}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      ({new Date(showDetails.release_date).getFullYear()})
                    </span>
                  </span>
                  <div className="flex items-center bg-yellow-200 px-2 py-1 rounded text-sm w-fit">
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
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent">
                    <div className="flex flex-wrap gap-1">
                      {showDetails.genres.map((genre, idx) => (
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
                        {showDetails.highlightedThemes.map((theme, idx) => (
                          <Badge
                            key={idx}
                            className="bg-indigo-100 text-indigo-800 border-indigo-200"
                          >
                            {theme}
                          </Badge>
                        ))}
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

                <div className="flex flex-col md:flex-row justify-between gap-2 mt-2">
                  <Button className="bg-purple-500 hover:bg-purple-400 text-white px-3 w-full md:w-auto">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-xs">Seen</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-purple-500 text-purple-500 hover:bg-purple-100 px-3 w-full md:w-auto"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    <span className="text-xs">List</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="border border-purple-500 text-purple-500 hover:bg-purple-100 px-3 w-full md:w-auto"
                  >
                    <ThumbsUp className="h-5 w-5 mr-1" />
                    <span className="text-xs">More</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
