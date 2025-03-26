export interface MovieList {
  id: number;
  name: string;
  description: string;
  movies: MovieListItem[];
}

import { Movie, MovieState, MovieListItem } from '@/types/movie';

export const MovieStorage = {
  // Helper: Get all movie lists from storage as an array of MovieList objects.
  getMovieLists: (): MovieList[] => {
    const lists = localStorage.getItem('movieLists');
    const parsedLists = lists ? JSON.parse(lists) : [];
    return Array.isArray(parsedLists) ? parsedLists : [];
  },

  // Helper: Save an array of MovieList objects to storage.
  saveMovieLists: (lists: MovieList[]) => {
    localStorage.setItem('movieLists', JSON.stringify(lists));
  },

  // Get movie state
  getMovieState: (movieId: number): MovieState => {
    const states = localStorage.getItem('movieStates');
    if (states) {
      const parsed = JSON.parse(states);
      return (
        parsed[movieId] || {
          isLiked: false,
          isDisliked: false,
          isSeen: false,
          lists: [],
          lastModified: new Date().toISOString()
        }
      );
    }
    return {
      isLiked: false,
      isDisliked: false,
      isSeen: false,
      lists: [],
      lastModified: new Date().toISOString()
    };
  },

  // Save movie state
  saveMovieState: (movieId: number, state: Partial<MovieState>) => {
    const states = localStorage.getItem('movieStates');
    const currentStates = states ? JSON.parse(states) : {};
    
    currentStates[movieId] = {
      ...MovieStorage.getMovieState(movieId),
      ...state,
      lastModified: new Date().toISOString()
    };
    
    localStorage.setItem('movieStates', JSON.stringify(currentStates));
  },

  // Add movie to list (by list name)
  addToList: (movie: Movie, listName: string) => {
    if (!movie || !listName) {
      return;
    }

    let lists = MovieStorage.getMovieLists() || [];
    // Try to find an existing list with the same name
    let list = lists.find(l => l.name === listName);
    
    // If list doesn't exist, create it
    if (!list) {
      list = {
        id: Date.now(), // or another unique id generator
        name: listName,
        description: '', // default description; update as needed
        movies: []
      };
      lists.push(list);
    }

    const movieListItem: MovieListItem = {
      ...movie,
      added_at: new Date().toISOString()
    };

    // Check if the movie already exists in the list; update or add accordingly
    const existingIndex = list.movies?.findIndex((m: MovieListItem) => m.id === movie.id) ?? -1;

    if (existingIndex === -1) {
      list.movies = list.movies || [];
      list.movies.push(movieListItem);
    } else {
      list.movies[existingIndex] = movieListItem;
    }

    // Save the updated lists
    MovieStorage.saveMovieLists(lists);

    // Update movie state to include the list name
    const currentState = MovieStorage.getMovieState(movie.id);
    if (!currentState.lists?.includes(listName)) {
      MovieStorage.saveMovieState(movie.id, {
        lists: [...(currentState.lists || []), listName]
      });
    }
  },

  // Remove movie from list (by list name)
  removeFromList: (movieId: number, listName: string) => {
    let lists = MovieStorage.getMovieLists();
    const listIndex = lists.findIndex(l => l.name === listName);
    if (listIndex !== -1) {
      lists[listIndex].movies = lists[listIndex].movies.filter((m: MovieListItem) => m.id !== movieId);
      MovieStorage.saveMovieLists(lists);

      // Update movie state: remove the list name
      const currentState = MovieStorage.getMovieState(movieId);
      MovieStorage.saveMovieState(movieId, {
        lists: currentState.lists.filter(l => l !== listName)
      });
    }
  },

  // Get all movies in a list by list name
  getMoviesInList: (listName: string): MovieListItem[] => {
    const lists = MovieStorage.getMovieLists();
    const list = lists.find(l => l.name === listName);
    return list ? list.movies : [];
  },

  // Get all list names
  getAllLists: (): string[] => {
    const lists = MovieStorage.getMovieLists();
    return lists.map(l => l.name);
  },

  // Clear a list (remove all movies) by list name
  clearList: (listName: string) => {
    let lists = MovieStorage.getMovieLists();
    const listIndex = lists.findIndex(l => l.name === listName);
    if (listIndex !== -1) {
      // Update states for all movies in the list
      lists[listIndex].movies.forEach((movie: MovieListItem) => {
        const state = MovieStorage.getMovieState(movie.id);
        MovieStorage.saveMovieState(movie.id, {
          lists: state.lists.filter(l => l !== listName)
        });
      });
      // Clear the list
      lists[listIndex].movies = [];
      MovieStorage.saveMovieLists(lists);
    }
  },

  // Delete a list entirely by list name
  deleteList: (listName: string) => {
    let lists = MovieStorage.getMovieLists();
    const list = lists.find(l => l.name === listName);
    if (list) {
      // Update states for all movies in the list
      list.movies.forEach((movie: MovieListItem) => {
        const state = MovieStorage.getMovieState(movie.id);
        MovieStorage.saveMovieState(movie.id, {
          lists: state.lists.filter(l => l !== listName)
        });
      });
      // Remove the list from the array
      lists = lists.filter(l => l.name !== listName);
      MovieStorage.saveMovieLists(lists);
    }
  }
};
