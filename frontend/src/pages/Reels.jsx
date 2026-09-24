import { useEffect, useState } from "react";
import { postApi } from "../api";
import PostCard from "../components/PostCard";

export default function Reels() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    postApi
      .explore({ limit: 20 })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, []);
  return (
    <div className="reels">
      {items.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
