import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { formatPerfumeName } from "../utils/formatPerfumeName";

export default function CollectionPage({ currentUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [addingPerfumeId, setAddingPerfumeId] = useState(null);
  const librarySearchRef = useRef(null);
  const [sortOrder, setSortOrder] = useState("a-z");
  const [brandFilter, setBrandFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [noteFilter, setNoteFilter] = useState("");

  useEffect(() => {
    if (!currentUser?.id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `http://localhost:5000/api/collection/${currentUser.id}`
        );
        if (!cancelled) setItems(res.data || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("We couldn't load your collection right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    const query = libraryQuery.trim();

    if (!query) {
      setLibraryResults([]);
      setLibraryError("");
      setLibraryLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const runSearch = async () => {
      setLibraryLoading(true);
      setLibraryError("");
      try {
        const res = await axios.get("http://localhost:5000/api/perfumes/search", {
          params: { q: query },
          signal: controller.signal,
        });

        if (!cancelled) {
          const results = Array.isArray(res.data) ? res.data.slice(0, 8) : [];
          setLibraryResults(results);
        }
      } catch (err) {
        if (cancelled || err.name === "CanceledError") return;
        console.error(err);
        setLibraryError("We couldn't search right now. Please try again.");
        setLibraryResults([]);
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    };

    const timeoutId = setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [libraryQuery]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!librarySearchRef.current) return;
      if (!librarySearchRef.current.contains(event.target)) {
        setLibraryQuery("");
        setLibraryResults([]);
        setLibraryError("");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleRemove = async (collectionId) => {
    if (!currentUser?.id || !collectionId || removingId === collectionId) return;

    setError("");
    setRemovingId(collectionId);
    try {
      await axios.delete(
        `http://localhost:5000/api/collection/${currentUser.id}/item/${collectionId}`
      );
      setItems((prev) => prev.filter((item) => item.collection_id !== collectionId));
    } catch (err) {
      console.error(err);
      const backendMessage =
        err?.response?.data?.error || err?.response?.data?.message;
      setError(backendMessage || "We couldn't remove this fragrance right now.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddFromLibrary = async (perfumeId) => {
    if (!currentUser?.id || !perfumeId || addingPerfumeId === perfumeId) return;

    setError("");
    setLibraryError("");
    setAddingPerfumeId(perfumeId);

    try {
      await axios.post("http://localhost:5000/api/collection", {
        userId: currentUser.id,
        perfumeId,
        status: "owned",
      });

      const refresh = await axios.get(
        `http://localhost:5000/api/collection/${currentUser.id}`
      );
      setItems(refresh.data || []);
    } catch (err) {
      console.error(err);
      const backendMessage =
        err?.response?.data?.error || err?.response?.data?.message;
      setLibraryError(backendMessage || "We couldn't add this fragrance right now.");
    } finally {
      setAddingPerfumeId(null);
    }
  };

  const collectedPerfumeIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items]
  );

  const brandOptions = useMemo(() => {
    const brands = [...new Set(items.map((item) => item.brand).filter(Boolean))];
    return brands.sort((a, b) => a.localeCompare(b));
  }, [items]);

  const genderOptions = useMemo(() => {
    const genders = [...new Set(items.map((item) => item.gender).filter(Boolean))];
    return genders.sort((a, b) => a.localeCompare(b));
  }, [items]);

  const displayedItems = useMemo(() => {
    const noteTerm = noteFilter.trim().toLowerCase();

    const filtered = items.filter((item) => {
      const matchesBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchesGender = genderFilter === "all" || item.gender === genderFilter;

      const matchesNotes =
        !noteTerm ||
        [item.top, item.middle, item.base]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(noteTerm);

      return matchesBrand && matchesGender && matchesNotes;
    });

    const sorted = [...filtered].sort((a, b) =>
      formatPerfumeName(a.perfume).localeCompare(formatPerfumeName(b.perfume))
    );

    if (sortOrder === "z-a") sorted.reverse();

    return sorted;
  }, [items, brandFilter, genderFilter, noteFilter, sortOrder]);

  return (
    <div className="min-h-screen bg-black/75 text-white">
      <main className="max-w-6xl mx-auto px-6 py-16">
        <header className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-perfume-gold mb-3">
            Your Wardrobe
          </p>
          <h1 className="text-4xl font-display mb-2 uppercase tracking-widest">
            My Collection
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm">
            Saved fragrances that you&apos;ve added from Discover and beyond.
          </p>
        </header>

        {!loading && (
          <section ref={librarySearchRef} className="max-w-2xl mx-auto mb-8 relative">
            <label className="text-xs tracking-[0.2em] uppercase text-perfume-gold mb-3 block">
              Add From Library
            </label>
            <input
              type="text"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search perfume or brand..."
              className="w-full bg-[#141412] border border-gray-700 rounded-lg px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:border-perfume-gold"
            />

            {libraryQuery.trim() && (
              <div className="absolute mt-2 w-full bg-[#141412] border border-gray-700 rounded-lg shadow-2xl z-20 max-h-80 overflow-y-auto">
                {libraryLoading && (
                  <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
                )}

                {!libraryLoading && libraryError && (
                  <p className="px-4 py-3 text-sm text-amber-300">{libraryError}</p>
                )}

                {!libraryLoading && !libraryError && libraryResults.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No matching perfumes found.</p>
                )}

                {!libraryLoading && !libraryError && libraryResults.length > 0 && (
                  <ul>
                    {libraryResults.map((perfume) => {
                      const alreadyAdded = collectedPerfumeIds.has(perfume.id);

                      return (
                        <li
                          key={perfume.id}
                          className="px-4 py-3 border-b border-white/5 last:border-b-0 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1">
                              {perfume.brand}
                            </p>
                            <p className="text-sm text-white">
                              {formatPerfumeName(perfume.perfume)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddFromLibrary(perfume.id)}
                            disabled={alreadyAdded || addingPerfumeId === perfume.id}
                            className="text-xs uppercase tracking-[0.18em] px-3 py-2 rounded-full border border-perfume-gold/60 hover:bg-perfume-gold hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {alreadyAdded
                              ? "Added"
                              : addingPerfumeId === perfume.id
                                ? "Adding..."
                                : "Add"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {loading && (
          <p className="text-center text-gray-500">
            Curating your scents...
          </p>
        )}

        {!loading && error && (
          <p className="text-center text-amber-300 text-sm">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-center text-gray-500">
            Your collection is empty. Start in Discover and tap the + icon to
            add your first fragrance.
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <section className="mt-8 mb-4 grid gap-3 md:grid-cols-4">
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

            <input
              type="text"
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value)}
              placeholder="Filter by note (e.g. vanilla)"
              className="bg-[#141412] border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
          </section>
        )}

        {!loading && !error && items.length > 0 && displayedItems.length === 0 && (
          <p className="text-center text-gray-500 mt-8">
            No perfumes match your current filters.
          </p>
        )}

        {!loading && !error && displayedItems.length > 0 && (
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {displayedItems.map((p) => (
              <article
                key={p.collection_id}
                className="bg-[#141412] border border-gray-800 rounded-2xl p-5 shadow-elegant flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">
                      {p.brand}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(p.collection_id)}
                      disabled={removingId === p.collection_id}
                      className="text-gray-400 hover:text-white text-lg leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Remove ${formatPerfumeName(p.perfume)} from collection`}
                      title="Remove from collection"
                    >
                      ×
                    </button>
                  </div>
                  <h2 className="font-display text-xl mb-2">
                    {formatPerfumeName(p.perfume)}
                  </h2>
                  <p className="text-xs text-gray-400 mb-1">
                    Status:{" "}
                    <span className="text-gray-200">
                      {p.collection_status || "owned"}
                    </span>
                  </p>

                  <p className="text-xs text-gray-400 mt-2">
                    Base Notes:{" "}
                    <span className="text-gray-200">{p.base || "—"}</span>
                  </p>
                </div>
                <div className="mt-3">
                  <Link
                    to={`/perfume/${p.id}`}
                    className="text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border border-perfume-gold/60 hover:bg-perfume-gold hover:text-black transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}


