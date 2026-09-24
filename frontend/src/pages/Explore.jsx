import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { postApi } from "../api";
import PostGrid from "../components/PostGrid";

export default function Explore() {
  const { openPost, tick } = useOutletContext();
  const [items, setItems] = useState([]);

  useEffect(() => {
    postApi
      .explore({ limit: 30 })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, [tick]);

  return (
    <div className="page-wide">
      <PostGrid posts={items} onOpen={(p) => openPost(p.id)} />
    </div>
  );
}
