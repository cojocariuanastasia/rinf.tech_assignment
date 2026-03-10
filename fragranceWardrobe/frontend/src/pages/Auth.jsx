import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Auth({ onAuthSuccess = () => {} }) {
  const [isLogin, setIsLogin] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    gender_pref: "Unisex",
    budget_pref: "Mid-Range",
    favorite_notes: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await axios.post(`http://localhost:5000${url}`, formData);
      alert(res.data.message);

      const payload =
        res.data.user
          ? res.data.user
          : { id: res.data.userId, username: formData.username };

      onAuthSuccess(payload);
      navigate("/collection");
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen text-white font-display">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black/80 via-black/90 to-black/80">
        <div className="relative z-10 w-full px-6 flex items-center justify-center">
          <div
            className="backdrop-blur-md p-12 shadow-2xl w-full max-w-md border border-gray-800 rounded-2xl"
            style={{ backgroundColor: "#1b1611" }}
          >
            <h2 className="text-3xl mb-8 text-center uppercase tracking-widest">
              {isLogin ? "Sign In" : "Join the Atelier"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Username
                </label>
                <input
                  className="w-full border-b border-perfume-gold/60 p-2 focus:outline-none focus:border-perfume-gold bg-transparent placeholder-gray-400"
                  placeholder="Type your username..."
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Security Key
                </label>
                <input
                  type="password"
                  className="w-full border-b border-perfume-gold/60 p-2 focus:outline-none focus:border-perfume-gold bg-transparent placeholder-gray-400"
                  placeholder="Type your password..."
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              {!isLogin && (
                <div className="pt-4 space-y-6">
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                      Olfactive Preference
                    </label>
                    <select
                      className="w-full bg-transparent border-b border-perfume-gold/60 py-2 focus:outline-none"
                      onChange={(e) =>
                        setFormData({ ...formData, gender_pref: e.target.value })
                      }
                    >
                      <option className="bg-perfume-black text-white" value="Female">Female</option>
                      <option className="bg-perfume-black text-white" value="Male">Male</option>
                      <option className="bg-perfume-black text-white" value="Unisex">Unisex</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
                      Signature Notes
                    </label>
                    <input
                      className="w-full border-b border-perfume-gold/60 p-2 focus:outline-none focus:border-perfume-gold transition-colors bg-transparent placeholder-gray-400"
                      placeholder="e.g. Rose, Vanilla, Bergamot..."
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          favorite_notes: e.target.value.split(","),
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <button className="w-full bg-perfume-black text-white py-4 hover:bg-perfume-gold transition-colors duration-500 uppercase tracking-widest text-sm rounded-md">
                {isLogin ? "Enter" : "Create Profile"}
              </button>
            </form>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full mt-6 text-xs text-gray-400 underline hover:text-white rounded-md py-3"
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already a member? Login"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
