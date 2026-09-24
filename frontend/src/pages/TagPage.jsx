import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { postApi } from "../api";
import PostGrid from "../components/PostGrid";

export default function TagPage() {
  const { name } = useParams();
  const { openPost, tick } = useOutletContext();
  const [items, setItems] = useState([]);

  useEffect(() => {
    postApi
      .byTag(name, { limit: 30 })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, [name, tick]);

  return (
    <div className="page-wide">
      <h1 className="tag-title">#{name}</h1>
      <p className="muted">{items.length} 게시물</p>
      <PostGrid posts={items} onOpen={(p) => openPost(p.id)} />
    </div>
  );
}
