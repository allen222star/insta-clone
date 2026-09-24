import { useEffect, useRef, useState } from "react";
import { storyApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";

export default function StoriesBar({ refreshKey }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [groups, setGroups] = useState([]);
  const [viewer, setViewer] = useState(null);
  const inputRef = useRef();

  async function load() {
    try {
      const { data } = await storyApi.list();
      setGroups(data);
    } catch {
      setGroups([]);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  const mine = user ? groups.find((g) => g.user.id === user.id) : null;

  async function onFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const form = new FormData();
    form.append("image", f);
    await storyApi.create(form);
    load();
  }

  function onMine() {
    if (!requireAuth()) return;
    if (mine) setViewer(0);
    else inputRef.current.click();
  }

  return (
    <>
      <div className="stories">
        <button className="story-item" onClick={onMine}>
          <span className={`story-ring ${mine ? "has" : ""}`}>
            <Avatar user={user} size={56} />
            {!mine && <span className="story-plus">+</span>}
          </span>
          <span className="story-name">내 스토리</span>
        </button>
        {groups
          .filter((g) => !user || g.user.id !== user.id)
          .map((g) => (
            <button
              key={g.user.id}
              className="story-item"
              onClick={() => setViewer(groups.findIndex((x) => x.user.id === g.user.id))}
            >
              <span className="story-ring has">
                <Avatar user={g.user} size={56} />
              </span>
              <span className="story-name">{g.user.username}</span>
            </button>
          ))}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {viewer != null && (
        <StoryViewer groups={groups} start={viewer} onClose={() => setViewer(null)} onChange={load} />
      )}
    </>
  );
}
