"use client"

import { useState } from "react"
import { List, Plus, Share2, ArrowUpDown, Trash, Info, Film, Rabbit, User, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"
import Link from "next/link"

// Dummy data for custom lists and movies
const initialLists = [
  { id: 1, name: "Watched & Liked", movies: [
      { id: 101, title: "Inception", poster: "/assets/inception.jpg", description: "A mind-bending thriller about dream invasion." },
      { id: 102, title: "Knives Out", poster: "/assets/knives-out.jpg", description: "A modern whodunit with plenty of twists." },
    ] 
  },
  { id: 2, name: "Watched & Disliked", movies: [
      { id: 103, title: "The Silence of the Lambs", poster: "/assets/silence.jpeg", description: "A chilling crime thriller featuring a cannibalistic killer." },
    ] 
  },
  { id: 3, name: "Watch Later", movies: [] },
]

export default function ListsScreen() {
  const [lists, setLists] = useState(initialLists)
  const [selectedListId, setSelectedListId] = useState(initialLists[0].id)
  const [newMovieTitle, setNewMovieTitle] = useState("")
  const [newMoviePoster, setNewMoviePoster] = useState("")
  const [infoMovie, setInfoMovie] = useState<any>(null)
  const [newListName, setNewListName] = useState("")

  const selectedList:any = lists.find(list => list.id === selectedListId)

  // Add a new movie to the selected list
  const handleAddMovie = () => {
    if (!newMovieTitle.trim() || !newMoviePoster.trim()) return
    const newMovie = { 
      id: Date.now(), 
      title: newMovieTitle, 
      poster: newMoviePoster,
      description: "No description available."
    }
    setLists(lists.map(list => 
      list.id === selectedListId ? { ...list, movies: [...list.movies, newMovie] } : list
    ))
    setNewMovieTitle("")
    setNewMoviePoster("")
  }

  // Remove a movie from the selected list
  const handleRemoveMovie = (movieId:any) => {
    setLists(lists.map(list => 
      list.id === selectedListId ? { ...list, movies: list.movies.filter(movie => movie.id !== movieId) } : list
    ))
  }

  // Dummy function for reordering movies (for demonstration, simply reverses the movies array)
  const handleReorderMovies = () => {
    setLists(lists.map(list => 
      list.id === selectedListId ? { ...list, movies: [...list.movies].reverse() } : list
    ))
  }

  // Dummy functions for generating recommendations and sharing
  const generateRecommendations = () => {
    alert(`Generating recommendations based on the "${selectedList.name}" list.`)
  }

  const shareList = () => {
    alert(`Sharing the "${selectedList.name}" list on social media.`)
  }

  // Add a new custom list
  const handleAddList = () => {
    if (!newListName.trim()) return
    const newList = { id: Date.now(), name: newListName, movies: [] }
    setLists([...lists, newList])
    setNewListName("")
    setSelectedListId(newList.id)
  }

  // Delete a custom list (with confirmation)
  const handleDeleteList = (listId:any) => {
    if (window.confirm("Are you sure you want to delete this list?")) {
      const updatedLists = lists.filter(list => list.id !== listId)
      setLists(updatedLists)
      // If the deleted list is currently selected, switch to the first list (if any)
      if (selectedListId === listId && updatedLists.length) {
        setSelectedListId(updatedLists[0].id)
      }
    }
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

      <div className="container mx-auto px-4 py-6">
        {/* On mobile, use dropdown for list selection */}
        <div className="mb-4 md:hidden">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Your Lists</h2>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none"
          >
            {lists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input 
              type="text"
              placeholder="New List Name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none"
            />
            <Button onClick={handleAddList} className="bg-purple-500 hover:bg-purple-400 text-white">
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar for medium+ screens */}
          <aside className="hidden md:block">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Lists</h2>
            <ul className="space-y-2">
              {lists.map(list => (
                <li key={list.id} className="flex items-center justify-between">
                  <Button 
                    variant={selectedListId === list.id ? "default" : "outline"}
                    className="w-1/2 text-left border border-purple-500 text-purple-600 hover:bg-purple-100"
                    onClick={() => setSelectedListId(list.id)}
                  >
                    {list.name}
                  </Button>
                  <Button 
                    onClick={() => handleDeleteList(list.id)}
                    className="bg-red-500 hover:bg-red-400 text-white p-1 ml-2"
                  >
                    <Trash size={16} />
                  </Button>
                </li>
              ))}
            </ul>
            {/* Add new list input */}
            <div className="mt-4 w-1/2 flex gap-2">
              <input 
                type="text"
                placeholder="New List Name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none"
              />
              <Button onClick={handleAddList} className="bg-purple-500 hover:bg-purple-400 text-white">
                <Plus size={16} />
              </Button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="md:w-3/4">
            <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">{selectedList?.name || "No List Selected"}</h2>
              <div className="flex gap-2">
                <Button onClick={generateRecommendations} className="bg-purple-500 hover:bg-purple-400 text-white">
                  <SparklesIcon className="mr-1" /> Generate Recommendations
                </Button>
                <Button onClick={shareList} className="bg-purple-500 hover:bg-purple-400 text-white">
                  <Share2 className="mr-1" /> Share
                </Button>
              </div>
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {selectedList && selectedList.movies.map((movie:any) => (
                <Card key={movie.id} className="bg-white shadow-md border border-gray-300">
                  <div className="relative h-64">
                    <Image 
                      src={movie.poster} 
                      alt={movie.title} 
                      className="w-full h-full object-cover"
                      layout="fill"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <h3 className="text-lg font-medium text-gray-800">{movie.title}</h3>
                    <div className="flex justify-between">
                      <div className="flex gap-2">
                        <Button onClick={() => handleRemoveMovie(movie.id)} className="bg-red-500 hover:bg-red-400 text-white p-1">
                          <Trash size={16} />
                        </Button>
                        <Button onClick={handleReorderMovies} className="bg-purple-500 hover:bg-purple-400 text-white p-1">
                          <ArrowUpDown size={16} />
                        </Button>
                      </div>
                      <Button onClick={() => setInfoMovie(movie)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-1">
                        <Info size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

          </main>
        </div>
      </div>

      {/* Movie Information Modal */}
      <Dialog open={!!infoMovie} onOpenChange={(open) => !open && setInfoMovie(null)}>
        <DialogContent className="bg-white text-gray-800 border border-gray-300 max-w-md mx-auto">
          {infoMovie && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{infoMovie.title}</DialogTitle>
              </DialogHeader>
              <div className="relative h-64 mb-4">
                <Image 
                  src={infoMovie.poster} 
                  alt={infoMovie.title} 
                  className="w-full h-full object-cover"
                  layout="fill"
                />
              </div>
              <p className="mb-4">{infoMovie.description}</p>
              <Button onClick={() => setInfoMovie(null)} className="bg-purple-500 hover:bg-purple-400 text-white w-full">
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
