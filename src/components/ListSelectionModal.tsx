import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { MovieStorage } from "@/utils/movieStorage";
import { MovieList } from "@/types/movie";

interface ListSelectionModalProps {
  movie: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListSelected: (listId: string) => void;
}

export function ListSelectionModal({
  movie,
  open,
  onOpenChange,
  onListSelected,
}: ListSelectionModalProps) {
  // Fetch lists from localStorage via MovieStorage
  const [lists, setLists] = useState<MovieList[]>([]);
  const [selectedList, setSelectedList] = useState<number | null>(null);

  useEffect(() => {
    const fetchedLists = MovieStorage.getMovieLists();
    setLists(fetchedLists);
  }, [open]);

  const handleAddToList = () => {
    if (selectedList !== null) {
      const selected = lists.find((list) => list.id === selectedList);
      if (selected) {
        // Pass the list's name (or you can change to list.id if preferred)
        onListSelected(selected.name);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add "{movie.title}" to a list</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {lists.map((list) => (
            <div
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedList === list.id 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{list.name}</h3>
                  <p className="text-sm text-gray-500">{list.description}</p>
                </div>
                {selectedList === list.id && (
                  <Check className="h-5 w-5 text-purple-500" />
                )}
              </div>
            </div>
          ))}

          <Button 
            variant="outline" 
            className="w-full border-dashed border-gray-300 text-gray-600 hover:text-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New List
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-purple-500 hover:bg-purple-600 text-white"
            onClick={handleAddToList}
            disabled={selectedList === null}
          >
            Add to List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
