"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Movie {
  id: number
  title: string
  year: number
  rating: number
  runtime: string
  genres: string[]
  description: string
  poster: string
}

interface RatingModalProps {
  movie: Movie
  open: boolean
  onOpenChange: (open: boolean) => void
  onRate: (rating: number) => void
}

export default function RatingModal({ movie, open, onOpenChange, onRate }: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null)

  const handleRatingSubmit = () => {
    if (selectedRating === null) return;
    
    // Call the onRate callback with the selected rating
    onRate(selectedRating);
    
    // Log the rating action
    console.log(`Rated ${movie.title} with ${selectedRating} stars`);
    
    // Close the modal
    onOpenChange(false);
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">How was "{movie.title}"?</DialogTitle>
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="flex flex-col items-center p-4">

          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  selectedRating === rating
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-400 hover:bg-purple-100"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={selectedRating === null}
              onClick={handleRatingSubmit}
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

