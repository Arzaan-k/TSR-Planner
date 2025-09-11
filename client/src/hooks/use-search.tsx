import { useState, useEffect } from "react";

export function useSearch(delay: number = 200) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchQuery, delay]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
  };
}
