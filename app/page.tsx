"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Bookmark {
  id: number;
  title: string;
  url: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchBookmarks(session.user.id);
      else setBookmarks([]);
    });
  }, []);

  // Google login/logout
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };
  const signOut = async () => await supabase.auth.signOut();

  // Fetch bookmarks
  const fetchBookmarks = async (userId: string) => {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBookmarks(data || []);
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-bookmarks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks", filter: `user_id=eq.${user.id}` },
        () => fetchBookmarks(user.id)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Add bookmark
  const addBookmark = async () => {
    if (!title || !url) return;
    setLoading(true);
    await supabase.from("bookmarks").insert([{ title, url, user_id: user.id }]);
    setTitle(""); setUrl("");
    setLoading(false);
  };

  // Delete bookmark
  const deleteBookmark = async (id: number) => {
    await supabase.from("bookmarks").delete().eq("id", id).eq("user_id", user.id);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <button
          onClick={signInWithGoogle}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-10 bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Bookmarks</h1>
          <button
            onClick={signOut}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Add Bookmark */}
        <input
          className="w-full border p-2 rounded mb-2 bg-gray-100 dark:bg-gray-700"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded mb-2 bg-gray-100 dark:bg-gray-700"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addBookmark}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded mb-4 hover:bg-blue-700"
        >
          {loading ? "Adding..." : "Add Bookmark"}
        </button>

        {/* Bookmark List */}
        <div className="space-y-2">
          {bookmarks.length === 0 && <p className="text-gray-500 dark:text-gray-400">No bookmarks yet.</p>}
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded"
            >
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">
                {b.title}
              </a>
              <button
                onClick={() => deleteBookmark(b.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
