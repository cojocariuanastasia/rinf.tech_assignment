import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { formatPerfumeName } from "../utils/formatPerfumeName";

export default function PerfumeDetailsPage({ currentUser }) {
  const { perfumeId } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = !!currentUser;
  const [perfume, setPerfume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`http://localhost:5000/api/perfumes/${perfumeId}`);
        if (!cancelled) setPerfume(res.data || null);
      } catch (err) {
        console.error(err);
        const backendMessage = err?.response?.data?.error || err?.response?.data?.message;
        if (!cancelled) {
          setError(backendMessage || "We couldn't load this perfume right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (perfumeId) {
      loadDetails();
    } else {
      setLoading(false);
      setError("Missing perfume id.");
    }

    return () => {
      cancelled = true;
    };
  }, [perfumeId]);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      if (!perfumeId || !isAuthenticated) {
        setAiLoading(false);
        return;
      }

      setAiLoading(true);
      setAiError("");
      try {
        const res = await axios.get(`http://localhost:5000/api/perfumes/${perfumeId}/ai-suggestions`);
        if (!cancelled) setAiSuggestions(res.data || null);
      } catch (err) {
        const backendMessage = err?.response?.data?.error || err?.response?.data?.message;
        if (!cancelled) setAiError(backendMessage || "AI suggestions are unavailable right now.");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [perfumeId, isAuthenticated]);

  const formatFieldLabel = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const perfumers = [
    perfume?.perfumer1,
    perfume?.perfumer2,
    perfume?.perfumer3,
    perfume?.perfumer4,
    perfume?.perfumer5,
    perfume?.perfumer6,
  ].filter((value) => value && String(value).trim() !== "");

  const detailRows = Object.entries(perfume || {}).filter(
    ([key, value]) =>
      ![
        "id",
        "brand",
        "perfume",
        "url",
        "country",
        "perfumer1",
        "perfumer2",
        "perfumer3",
        "perfumer4",
        "perfumer5",
        "perfumer6",
      ].includes(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
  );

  const similarFragranceEntries = Array.isArray(aiSuggestions?.similarFragrances)
    ? aiSuggestions.similarFragrances
        .map((item) => {
          if (typeof item === "string") {
            return { perfumeId: null, label: item };
          }
          return {
            perfumeId: item?.perfumeId || item?.id || null,
            label: item?.label || `${item?.brand || ""} - ${item?.perfume || ""}`,
          };
        })
        .filter((item) => item.label && String(item.label).trim() !== "")
    : [];

  return (
    <div className="min-h-screen bg-black/75 text-white">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs uppercase tracking-[0.2em] text-perfume-gold hover:text-white"
          >
            Go Back
          </button>
        </div>

        {loading && <p className="text-gray-500">Loading perfume details...</p>}

        {!loading && error && <p className="text-amber-300 text-sm">{error}</p>}

        {!loading && !error && perfume && (
          <>
            <article className="bg-[#141412] border border-gray-800 rounded-2xl p-6 shadow-elegant">
              <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 mb-2">
                {perfume.brand}
              </p>
              <h1 className="font-display text-3xl mb-4">
                {formatPerfumeName(perfume.perfume || perfume.name)}
              </h1>

              <div className="space-y-3">
                {perfumers.length > 0 && (
                  <p className="text-sm text-gray-300">
                    Perfumers:{" "}
                    <span className="text-gray-100">{perfumers.join(", ")}</span>
                  </p>
                )}

                {detailRows.length > 0 ? (
                  detailRows.map(([key, value]) => (
                    <p key={key} className="text-sm text-gray-300">
                      {formatFieldLabel(key)}:{" "}
                      <span className="text-gray-100">{String(value)}</span>
                    </p>
                  ))
                ) : perfumers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No details available.</p>
                ) : null}
              </div>
            </article>

            <section className="mt-6 bg-[#141412] border border-gray-800 rounded-2xl p-6 shadow-elegant">
              <p className="text-xs tracking-[0.3em] uppercase text-perfume-gold mb-4">
                Advisor's Suggestions
              </p>

              {!isAuthenticated ? (
                <p className="text-gray-400 text-sm">Sign Up to see Advisor&apos;s suggestions</p>
              ) : (
                <>
                  {aiLoading && <p className="text-gray-500 text-sm">Generating AI suggestions...</p>}

                  {!aiLoading && aiError && (
                    <p className="text-amber-300 text-sm">{aiError}</p>
                  )}

                  {!aiLoading && !aiError && aiSuggestions && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-300">
                        Suitable Occasion:{" "}
                        <span className="text-gray-100">{aiSuggestions.occasion || "—"}</span>
                      </p>
                      <p className="text-sm text-gray-300">
                        Best Season:{" "}
                        <span className="text-gray-100">{aiSuggestions.season || "—"}</span>
                      </p>
                      <p className="text-sm text-gray-300">
                        Similar Fragrances:{" "}
                        {similarFragranceEntries.length > 0 ? (
                          <span className="block mt-2">
                            <ul className="space-y-2">
                              {similarFragranceEntries.map((item, index) => (
                                <li key={`${item.label}-${index}`}>
                                  {item.perfumeId ? (
                                    <Link
                                      to={`/perfume/${item.perfumeId}`}
                                      className="text-perfume-gold hover:text-white underline-offset-4 hover:underline"
                                    >
                                      {item.label}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-100">{item.label}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </span>
                        ) : (
                          <span className="text-gray-100">—</span>
                        )}
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
