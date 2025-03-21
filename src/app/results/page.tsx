"use client"

import { useState, useRef } from "react"
import { X, Star, Plus, Eye, MoreHorizontal, Share2, ChevronDown, MessageSquare, Send, Compass, Sparkles, Rabbit, Film, List, User, CheckCircle, ThumbsDown, ThumbsUp, Info, CheckIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import KnivesOut from "../../../public/assets/knives-out.jpg"
import Inception from "../../../public/assets/inception.jpg"
import SilenceOfTheLambs from "../../../public/assets/silence.jpeg"
import Image from "next/image"
import Link from "next/link"

export default function SearchResults() {
  const [searchQuery, setSearchQuery] = useState("I want a thriller that keeps you guessing until the very end. Something with unexpected twists and great acting.")
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [rabbitHoleMode, setRabbitHoleMode] = useState(false)
  const [showDetails, setShowDetails] = useState<any>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const scrollContainerRef = useRef<any>(null)
  const messageInputRef = useRef<any>(null)

  const handleScrollSnap = () => {
    if (scrollContainerRef.current) {
      const container:any = scrollContainerRef.current;
      const scrollPosition = container.scrollTop;
      const cardHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / cardHeight);
      setCurrentCardIndex(newIndex);
    }
  }

  const showMovieDetails = (movie:any) => {
    setShowDetails(movie);
  }

  const scrollToNextCard = () => {
    if (scrollContainerRef.current && currentCardIndex < movies.length - 1) {
      const newIndex = currentCardIndex + 1;
      scrollContainerRef.current.scrollTo({
        top: newIndex * scrollContainerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
  }

  const scrollToPrevCard = () => {
    if (scrollContainerRef.current && currentCardIndex > 0) {
      const newIndex = currentCardIndex - 1;
      scrollContainerRef.current.scrollTo({
        top: newIndex * scrollContainerRef.current.clientHeight,
        behavior: 'smooth'
      });
    }
  }

  const focusMessageInput = () => {
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }

  const handleMessageSubmit = (e:any) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    
    setSearchQuery(newMessage)
    setNewMessage("")
    setIsTyping(false)
  }

  const toggleRabbitHoleMode = () => {
    setRabbitHoleMode(!rabbitHoleMode)
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-100 to-indigo-100 pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm text-gray-800 p-4 sticky top-0 z-20 shadow-md">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Rabbit className="h-6 w-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800 hidden lg:block">GoodMovies AI</span>
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
              <p className="text-sm text-gray-800 line-clamp-1">{searchQuery}</p>
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
        {movies.map((movie, index) => (
          <div key={movie.id} className="h-full snap-start snap-always">
            <MovieCard 
              movie={movie} 
              onInfoClick={() => showMovieDetails(movie)}
            />
          </div>
        ))}
      </div>

      {/* Movie Details Modal */}
      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
        <DialogContent className="bg-white text-gray-800 border-gray-300 max-w-3xl max-h-[90vh] overflow-y-auto">
          {showDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                  <span>{showDetails.title} <span className="text-sm font-normal text-gray-500">({showDetails.year})</span></span>
                  <div className="flex items-center bg-yellow-200 px-2 py-1 rounded text-sm">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-medium text-yellow-600">{showDetails.rating}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-md">
                <Image
                  src={showDetails.poster}
                  alt={showDetails.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent flex items-end p-4">
                  <div className="flex flex-wrap gap-1">
                    {showDetails.genres.map((genre:any, idx:any) => (
                      <span key={idx} className="text-xs bg-purple-200 text-gray-800 px-2 py-1 rounded-full">
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">{showDetails.description}</p>
              
              {showDetails.directors && (
                <div className="mb-2">
                  <span className="text-gray-800 font-medium">Directors: </span>
                  <span className="text-gray-600">{showDetails.directors.join(", ")}</span>
                </div>
              )}
              
              {showDetails.cast && (
                <div className="mb-4">
                  <span className="text-gray-800 font-medium">Cast: </span>
                  <span className="text-gray-600">{showDetails.cast.join(", ")}</span>
                </div>
              )}
              
              {showDetails.streamingOn && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-800 mb-2">Available on:</h3>
                  <div className="flex gap-2">
                    {showDetails.streamingOn.map((platform:any, idx:any) => (
                      <Badge key={idx} variant="outline" className="border-gray-400 text-gray-800">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button className="flex-1 bg-purple-500 hover:bg-purple-400 text-white">
                  <CheckCircle className="h-4 w-4 mr-2" /> Seen
                </Button>
                <Button variant="outline" className="flex-1 border border-purple-500 text-purple-500 hover:bg-purple-100">
                  <Plus className="h-4 w-4 mr-2" /> List
                </Button>
                <Button variant="outline" className="flex-1 border border-purple-500 text-purple-500 hover:bg-purple-100">
                  <ThumbsUp className="h-4 w-4 mr-2" /> More like this
                </Button>
              </div>
            </>
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
                className={`${rabbitHoleMode 
                  ? "bg-purple-500 hover:bg-purple-600 text-white" 
                  : "border-gray-400 text-purple-600 hover:bg-gray-200"} rounded-full p-2 h-auto flex-shrink-0 cursor-pointer`}
                title="Rabbit Hole Mode - Deep dive into advanced recommendations"
              >
                <Rabbit size={18} />
              </Button>
              
              <div className="relative flex-grow bg-gray-50 rounded-xl border border-gray-300 overflow-hidden">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value)
                    setIsTyping(true)
                  }}
                  rows={1}
                  className="w-full px-4 py-2 bg-transparent text-gray-800 placeholder-gray-500 resize-none focus:outline-none"
                  placeholder={rabbitHoleMode 
                    ? "Go deeper..." 
                    : "Refine your search..."}
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
  )
}

// Movie Card Component
function MovieCard({ movie, onInfoClick }:any) {
  return (
    <div className="h-full p-4 flex flex-col justify-center items-center">
      <Card className="mx-auto bg-white shadow-xl border border-gray-300 overflow-hidden max-w-md w-full">
        <div className="relative aspect-[2/3] w-full">
          <Image
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-200 via-transparent to-transparent"></div>
          
          {/* Movie info overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-bold text-gray-800">{movie.title}</h2>
              <div className="flex items-center bg-yellow-200 px-2 py-1 rounded text-sm">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="font-medium text-yellow-600">{movie.rating}</span>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <span>{movie.year}</span>
              <span className="mx-2">•</span>
              <span>{movie.runtime}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {movie.genres.map((genre:any, index:any) => (
                <span key={index} className="text-xs bg-purple-200 text-gray-800 px-2 py-0.5 rounded-full">
                  {genre}
                </span>
              ))}
            </div>
            
            <div className="flex gap-2 flex-wrap justify-center">
              <Button 
                className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9"
                onClick={onInfoClick}
              >
                <Info className="h-4 w-4 mr-1" /> More Info
              </Button>
              <Button 
                className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9"
                onClick={onInfoClick}
              >
                <CheckIcon className="h-4 w-4 mr-1" /> Seen
              </Button>
            
              <Button 
                className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9"
                onClick={onInfoClick}
              >
                <PlusIcon className="h-4 w-4 mr-1" /> List
              </Button>

              <Button 
                className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9"
                onClick={onInfoClick}
              >
                <ThumbsDown className="h-4 w-4 mr-1" /> Not Interested
              </Button>

              <Button 
                className="bg-purple-500 hover:bg-purple-400 text-white text-sm h-9"
                onClick={onInfoClick}
              >
                <ThumbsUp className="h-4 w-4 mr-1" /> More Like This
              </Button>
            </div>
          </div>
        </div>
        
      </Card>
    </div>
  )
}

const movies: any[] = [
  {
    id: 1,
    title: "Knives Out",
    year: 2019,
    rating: 7.9,
    runtime: "131m",
    genres: ["Comedy", "Crime", "Mystery"],
    description:
      "When renowned crime novelist Harlan Thrombey is found dead at his estate, the inquisitive Detective Benoit Blanc is mysteriously enlisted to investigate. From Harlan's dysfunctional family to his devoted staff, Blanc sifts through a web of red herrings and self-serving lies to uncover the truth behind Harlan's untimely death.",
    poster: KnivesOut,
    directors: ["Rian Johnson"],
    cast: ["Daniel Craig", "Chris Evans", "Ana de Armas", "Jamie Lee Curtis", "Michael Shannon"],
    streamingOn: ["Netflix", "Prime Video"],
  },
  {
    id: 2,
    title: "Inception",
    year: 2010,
    rating: 8.8,
    runtime: "148m",
    genres: ["Action", "Sci-Fi", "Thriller"],
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster. As the team goes deeper into the layers of dreams, the boundaries between reality and dreams become increasingly blurred.",
    poster: Inception,
    directors: ["Christopher Nolan"],
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page", "Tom Hardy", "Ken Watanabe"],
    streamingOn: ["HBO Max", "Prime Video"],
  },
  {
    id: 3,
    title: "The Silence of the Lambs",
    year: 1991,
    rating: 8.6,
    runtime: "118m",
    genres: ["Crime", "Drama", "Thriller"],
    description:
      "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer, a madman who skins his victims. The psychological cat-and-mouse game between the rookie agent and the brilliant psychiatrist creates one of cinema's most memorable duos.",
    poster: SilenceOfTheLambs,
    directors: ["Jonathan Demme"],
    cast: ["Jodie Foster", "Anthony Hopkins", "Scott Glenn", "Ted Levine"],
    streamingOn: ["Prime Video", "Hulu"],
  },
]
