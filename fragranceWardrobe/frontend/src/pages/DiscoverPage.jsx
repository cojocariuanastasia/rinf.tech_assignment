import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { formatPerfumeName } from "../utils/formatPerfumeName";

const FALLBACK_POPULAR = [
  {
    perfume: "Santal 33",
    brand: "Le Labo",
    top: "Cardamom, Violet Accord, Ambrox",
    middle: "Sandalwood, Cedarwood",
    base: "Leather, Musk",
    occasion: "Everyday signature",
  },
  {
    perfume: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    top: "Saffron, Jasmine",
    middle: "Ambergris, Amberwood",
    base: "Cedar, Fir Resin",
    occasion: "Evening / special occasions",
  },
  {
    perfume: "Black Orchid",
    brand: "Tom Ford",
    top: "Truffle, Ylang-Ylang, Bergamot",
    middle: "Black Orchid, Fruity Notes",
    base: "Patchouli, Incense, Vanilla",
    occasion: "Night out",
  },
];

export default function DiscoverPage({ isAuthenticated = false, currentUser = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortOrder, setSortOrder] = useState("a-z");
  const [brandFilter, setBrandFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => {
    const paramQuery = searchParams.get("q") || "";
    if (paramQuery !== query) {
      setQuery(paramQuery);
    }
  }, [searchParams, query]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const runSearch = async () => {
      setLoading(true);
      setError("");
      try {
        const params = query.trim() ? { q: query.trim() } : {};
        const res = await axios.get("http://localhost:5000/api/perfumes/search", {
          params,
          signal: controller.signal,
        });
        if (!cancelled) {
          setResults(res.data || []);
        }
      } catch (err) {
        if (cancelled || err.name === "CanceledError") return;
        console.error(err);
        setError("We couldn't reach the fragrance library. Showing a few popular picks instead.");
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeoutId = setTimeout(runSearch, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  const perfumesToShow = useMemo(() => {
    if (results.length > 0) return results;
    if (loading || error || query.trim()) return [];
    return FALLBACK_POPULAR;
  }, [results, loading, error, query]);

  const brandOptions = useMemo(() => {
    const brands = [...new Set(perfumesToShow.map((item) => item.brand).filter(Boolean))];
    return brands.sort((a, b) => a.localeCompare(b));
  }, [perfumesToShow]);

  const genderOptions = useMemo(() => {
    const genders = [...new Set(perfumesToShow.map((item) => item.gender).filter(Boolean))];
    return genders.sort((a, b) => a.localeCompare(b));
  }, [perfumesToShow]);

  const displayedPerfumes = useMemo(() => {
    const filtered = perfumesToShow.filter((item) => {
      const matchesBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchesGender = genderFilter === "all" || item.gender === genderFilter;

      return matchesBrand && matchesGender;
    });

    const sorted = [...filtered].sort((a, b) =>
      formatPerfumeName(a.perfume || a.name).localeCompare(
        formatPerfumeName(b.perfume || b.name)
      )
    );

    if (sortOrder === "z-a") sorted.reverse();

    return sorted;
  }, [perfumesToShow, brandFilter, genderFilter, sortOrder]);

  const handleAddToCollection = async (perfume) => {
    if (!isAuthenticated) {
      alert("You need to sign in first to add perfumes to your collection.");
      return;
    }

    if (!currentUser?.id) {
      alert("We couldn't identify your account. Please sign in again.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/collection", {
        userId: currentUser.id,
        perfumeId: perfume.id,
        status: "owned",
      });
      alert(`“${formatPerfumeName(perfume.perfume || perfume.name)}” was added to your collection.`);
    } catch (err) {
      console.error(err);
      alert("We couldn't add this perfume to your collection. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black/75 text-white">
      <main className="max-w-6xl mx-auto px-6 py-16">
        <header className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-perfume-gold mb-3">
            Discover
          </p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">
            Explore Iconic Fragrances
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Start with some of the world&apos;s most-loved scents. Search by{" "}
            <span className="text-perfume-gold">brand</span>,{" "}
            <span className="text-perfume-gold">perfume name</span>, or{" "}
            <span className="text-perfume-gold">key notes</span>.
          </p>
        </header>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);

                if (nextQuery.trim()) {
                  setSearchParams({ q: nextQuery }, { replace: true });
                } else {
                  setSearchParams({}, { replace: true });
                }
              }}
              placeholder="Try “Chanel”, “vanilla”, or “Baccarat Rouge”"
              className="w-full bg-[#141412] border border-gray-700 rounded-full px-6 py-3 text-sm placeholder-gray-500 focus:outline-none focus:border-perfume-gold focus:ring-1 focus:ring-perfume-gold"
            />
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <p className="col-span-full text-center text-gray-500">
              Searching the wardrobe for your next scent...
            </p>
          )}

          {!loading && error && (
            <p className="col-span-full text-center text-amber-300 text-sm">
              {error}
            </p>
          )}

          {!loading && perfumesToShow.length > 0 && (
            <div className="col-span-full grid gap-3 md:grid-cols-3 mb-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-[#141412] border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="a-z">Sort: A - Z</option>
                <option value="z-a">Sort: Z - A</option>
              </select>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-[#141412] border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Brands</option>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="bg-[#141412] border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Genders</option>
                {genderOptions.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>

            </div>
          )}

          {!loading &&
            displayedPerfumes.map((p) => {
              const displayName = formatPerfumeName(p.perfume || p.name);
              return (
            <article
              key={`${p.id || displayName}-${p.brand}`}
              className="bg-[#141412] border border-gray-800 rounded-2xl p-5 shadow-elegant flex flex-col justify-between"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-2">
                  {p.brand}
                </p>
                <h2 className="font-display text-xl mb-2">{displayName}</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Base Notes:{" "}
                  <span className="text-gray-200">
                    {p.base || "—"}
                  </span>
                </p>

                <p className="text-xs text-gray-400 mb-3">
                  Middle Notes:{" "}
                  <span className="text-gray-200">
                    {p.middle || "—"}
                  </span>
                </p>


                <p className="text-xs text-gray-400 mb-3">
                  Top Notes:{" "}
                  <span className="text-gray-200">
                    {p.top || "—"}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {p.occasion || "From the library"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddToCollection(p)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-perfume-gold/70 text-perfume-gold hover:bg-perfume-gold hover:text-black transition-colors text-base"
                    aria-label="Add to your collection"
                  >
                    +
                  </button>
                  {p.id ? (
                    <Link
                      to={`/perfume/${p.id}`}
                      className="text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-perfume-gold/60 hover:bg-perfume-gold hover:text-black transition-colors"
                    >
                      View Details
                    </Link>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-gray-700 text-gray-500 cursor-not-allowed">
                      View Details
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
          })}

          {!loading && perfumesToShow.length > 0 && displayedPerfumes.length === 0 && (
            <p className="col-span-full text-center text-gray-500 mt-4">
              No perfumes match your current filters.
            </p>
          )}

          {!loading && perfumesToShow.length === 0 && !error && (
            <p className="col-span-full text-center text-gray-500">
              No matches found. Try another brand, perfume, or note.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

