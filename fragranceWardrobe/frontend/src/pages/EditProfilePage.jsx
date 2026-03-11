import { useEffect, useState } from "react";
import axios from "axios";

export default function EditProfilePage({ currentUser, onProfileUpdated = () => {} }) {
  const [formData, setFormData] = useState({
    username: currentUser?.username || "",
    gender_pref: "Unisex",
    budget_pref: "Mid-Range",
    favorite_notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${currentUser.id}`);
        const user = res.data || {};
        if (!cancelled) {
          setFormData({
            username: user.username || currentUser?.username || "",
            gender_pref: user.gender_pref || "Unisex",
            budget_pref: user.budget_pref || "Mid-Range",
            favorite_notes: Array.isArray(user.favorite_notes)
              ? user.favorite_notes.join(", ")
              : user.favorite_notes || "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleChange = (field, value) => {
    setSuccess("");
    setError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        username: formData.username.trim(),
        gender_pref: formData.gender_pref,
        budget_pref: formData.budget_pref,
        favorite_notes: formData.favorite_notes
          .split(",")
          .map((note) => note.trim())
          .filter(Boolean),
      };

      const res = await axios.put(`http://localhost:5000/api/users/${currentUser.id}`, payload);
      setSuccess("Profile updated successfully.");
      if (res?.data?.user) {
        onProfileUpdated((prev) => ({ ...prev, ...res.data.user }));
      }
    } catch (err) {
      const backendMessage = err?.response?.data?.error || err?.response?.data?.message;
      setError(backendMessage || "We couldn't update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/75 text-white">
      <main className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-perfume-gold mb-3">
            Profile
          </p>
          <h1 className="font-display text-4xl mb-2 uppercase tracking-widest">
            Edit Profile
          </h1>
          <p className="text-gray-300 text-sm">
            Signed in as <span className="text-white">{currentUser?.username || "User"}</span>.
          </p>
        </header>

        <section className="bg-[#141412] border border-gray-800 rounded-2xl p-6 shadow-elegant">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading profile...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Username
                </label>
                <input
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="w-full border-b border-perfume-gold/60 p-2 focus:outline-none focus:border-perfume-gold bg-transparent placeholder-gray-400"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Olfactive Preference
                </label>
                <select
                  value={formData.gender_pref}
                  onChange={(e) => handleChange("gender_pref", e.target.value)}
                  className="w-full bg-transparent border-b border-perfume-gold/60 py-2 focus:outline-none"
                >
                 <option className="bg-perfume-black text-white" value="Female">Female</option>
                  <option className="bg-perfume-black text-white" value="Male">Male</option>
                  <option className="bg-perfume-black text-white" value="Unisex">Unisex</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Budget Preference
                </label>
                <select
                  value={formData.budget_pref}
                  onChange={(e) => handleChange("budget_pref", e.target.value)}
                  className="w-full bg-transparent border-b border-perfume-gold/60 py-2 focus:outline-none"
                >
                  <option className="bg-perfume-black text-white" value="Affordable">Affordable</option>
                  <option className="bg-perfume-black text-white" value="Mid-Range">Mid-Range</option>
                  <option className="bg-perfume-black text-white" value="Luxury">Luxury</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Signature Notes (comma-separated)
                </label>
                <input
                  value={formData.favorite_notes}
                  onChange={(e) => handleChange("favorite_notes", e.target.value)}
                  placeholder="e.g. Rose, Vanilla, Bergamot"
                  className="w-full border-b border-perfume-gold/60 p-2 focus:outline-none focus:border-perfume-gold bg-transparent placeholder-gray-400"
                />
              </div>

              {error && <p className="text-amber-300 text-sm">{error}</p>}
              {success && <p className="text-green-300 text-sm">{success}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-perfume-black text-white py-3 hover:bg-perfume-gold hover:text-black transition-colors duration-500 uppercase tracking-widest text-xs rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
