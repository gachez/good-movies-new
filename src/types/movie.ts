export interface Movie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  overview: string;
  release_date: string;
  poster_path: string;
  backdrop_path: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  video: boolean;
  genre_ids: number[];
  genres: string[];
  relevanceScore: number;
  matchReason?: string;
  highlightedThemes?: string[];
  hasContentAnalysis?: boolean;
}

export interface MovieState {
  isLiked: boolean;
  isDisliked: boolean;
  isSeen: boolean;
  lists: string[];
  rating?: number;
  lastModified: string;
}

export interface MovieListItem extends Movie {
  added_at: string;
}

export interface MovieList {
  id: number;
  name: string;
  description: string;
  movies: MovieListItem[];
}