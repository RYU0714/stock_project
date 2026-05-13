"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { fetchSearch } from "@/lib/api";
import type { SearchResult } from "@/types/stock";

export function CompanySearch({ initialTicker }: { initialTicker: string }) {
  const router = useRouter();
  const [tickerInput, setTickerInput] = useState(initialTicker);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const query = tickerInput.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      fetchSearch(query)
        .then((result) => {
          if (!isMounted) return;
          setSearchResults(result.results);
          setShowSearchResults(true);
        })
        .finally(() => {
          if (isMounted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [tickerInput]);

  function goToTicker(symbol: string) {
    const cleaned = symbol.trim().toUpperCase();
    if (!cleaned) return;
    setTickerInput(cleaned);
    setShowSearchResults(false);
    router.push(`/stock/${cleaned}/company`);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    goToTicker(tickerInput);
  }

  return (
    <form className="search company-search" onSubmit={submitSearch}>
      <input
        aria-label="Ticker"
        value={tickerInput}
        onBlur={() => window.setTimeout(() => setShowSearchResults(false), 160)}
        onChange={(event) => {
          setTickerInput(event.target.value);
          setShowSearchResults(true);
        }}
        onFocus={() => setShowSearchResults(true)}
        placeholder="AAPL, NVDA, MSFT, TSLA"
      />
      <button className="icon-button" type="submit" aria-label="종목 검색">
        <Search size={18} />
      </button>
      {showSearchResults && (searchResults.length > 0 || searchLoading) ? (
        <div className="search-suggestions">
          {searchLoading ? <div className="search-suggestion muted">검색 중</div> : null}
          {searchResults.map((result) => (
            <button
              className="search-suggestion"
              key={`${result.symbol}-${result.exchange}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => goToTicker(result.symbol)}
            >
              <strong>{result.symbol}</strong>
              <span>{result.name}</span>
              <em>{result.exchange || result.type}</em>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
