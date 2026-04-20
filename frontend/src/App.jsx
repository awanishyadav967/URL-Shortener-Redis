import { useEffect, useState } from "react";

const API = "http://localhost:4000";

function App() {
  const [user, setUser] = useState(null);
  const [urls, setUrls] = useState([]);
  const [input, setInput] = useState("");
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${API}/me`, { credentials: "include" });
      const data = await res.json();
      setUser(data);
      if (data) fetchUrls();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUrls = async () => {
    const res = await fetch(`${API}/api/urls`, { credentials: "include" });
    const data = await res.json();
    setUrls(data);
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const shortenUrl = async () => {
    if (!input) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`${API}/api/shorten`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original: input }),
    });

    const data = await res.json();

    setRate({
      limit: Number(res.headers.get("X-RateLimit-Limit")),
      remaining: Number(res.headers.get("X-RateLimit-Remaining")),
      reset: Number(res.headers.get("X-RateLimit-Reset")),
    });

    if (res.status === 429) {
      setError("Rate limit exceeded. Try again later.");
    } else if (res.ok) {
      setInput("");
      fetchUrls();
    } else {
      setError(data.message || "Something went wrong");
    }

    setLoading(false);
  };

  const logout = async () => {
    await fetch(`${API}/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setUrls([]);
    setRate(null);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔗 URL Shortener</h1>

        {!user && (
          <button
            style={styles.primaryBtn}
            onClick={() => (window.location.href = `${API}/auth/google`)}
          >
            Login with Google
          </button>
        )}

        {user && (
          <>
            <p style={styles.userText}>
              Logged in as <b>{user.email}</b>
            </p>

            <div style={styles.inputRow}>
              <input
                style={styles.input}
                type="text"
                placeholder="Paste long URL here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button style={styles.primaryBtn} onClick={shortenUrl}>
                {loading ? "..." : "Shorten"}
              </button>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {rate && (
              <p style={styles.rate}>
                Remaining: {rate.remaining} / {rate.limit} • resets in{" "}
                {rate.reset}s
              </p>
            )}

            {urls.length > 0 && (
              <div style={styles.urlList}>
                {urls.map((url) => (
                  <div key={url.id} style={styles.urlCard}>
                    <p style={styles.original}>{url.original}</p>
                    <a
                      href={`${API}/${url.short}`}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.short}
                    >
                      {API}/{url.short}
                    </a>
                    <p style={styles.clicks}>👆 {url.clicks} clicks</p>
                  </div>
                ))}
              </div>
            )}

            <button style={styles.secondaryBtn} onClick={logout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #66aaea, #764ba2)",
    fontFamily: "sans-serif",
  },
  card: {
    background: "#f7f0f0",
    padding: "30px",
    borderRadius: "12px",
    width: "420px",
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  },
  title: {
    marginBottom: "20px",
  },
  primaryBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "6px",
    background: "#667eea",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  secondaryBtn: {
    padding: "10px 16px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "16px",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  urlList: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  urlCard: {
    background: "#fff",
    padding: "12px",
    borderRadius: "8px",
    textAlign: "left",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  original: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "4px",
    wordBreak: "break-all",
  },
  short: {
    fontSize: "14px",
    color: "#667eea",
    fontWeight: 700,
    wordBreak: "break-all",
  },
  clicks: {
    fontSize: "12px",
    color: "#555",
    marginTop: "4px",
  },
  userText: {
    fontSize: "14px",
    marginBottom: "16px",
  },
  rate: {
    fontSize: "12px",
    color: "#666",
    marginBottom: "10px",
  },
  error: {
    color: "red",
    fontSize: "13px",
    marginBottom: "8px",
  },
};