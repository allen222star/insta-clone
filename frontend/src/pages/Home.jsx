import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { postApi } from "../api";
import Feed from "../components/Feed";
import StoriesBar from "../components/StoriesBar";
import Suggestions from "../components/Suggestions";

export default function Home() {
  const { openPost, tick } = useOutletContext();
  const [items, setItems] = useState([]);
  const [fallback, setFallback] = useState(false);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);

  async function load(reset = false) {
    try {
      const off = reset ? 0 : offset;
      const { data } = await postApi.feed({ limit: 8, offset: off });
      setFallback(data.fallback);
      setMore(data.has_more);
      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      setOffset(off + data.items.length);
    } catch {
      setItems([]);
      setMore(false);
    }
  }

  useEffect(() => {
    setOffset(0);
    load(true);
  }, [tick]);

  return (
    <div className="home">
      <div className="home-body">
        <div className="feed-col">
          <StoriesBar refreshKey={tick} />
          <Feed
            items={items}
            onOpen={openPost}
            onChange={() => load(true)}
            fallback={fallback}
            more={more}
            onMore={() => load(false)}
          />
        </div>
        <Suggestions />
      </div>
      <footer className="site-footer">학습용 클론 프로젝트</footer>
    </div>
  );
}
