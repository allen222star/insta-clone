import { useEffect, useState } from "react";
import { settingsApi } from "../api";
import SettingsToggle from "../components/SettingsToggle";
import { errMsg } from "../utils";

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((r) => setPrefs(r.data.notifications))
      .catch((e) => setErr(errMsg(e)));
  }, []);

  async function toggle(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await settingsApi.patch({ notifications: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  if (!prefs) return <div className="settings-panel empty">{err || "불러오는 중…"}</div>;

  return (
    <div className="settings-panel">
      <h2>알림</h2>
      <p className="settings-lead">받고 싶은 알림을 선택하세요. 꺼 둔 활동은 알림 목록에 표시되지 않습니다.</p>
      <SettingsToggle
        label="좋아요"
        hint="다른 사람이 회원님의 게시물을 좋아할 때"
        on={prefs.likes}
        onChange={(v) => toggle("likes", v)}
      />
      <SettingsToggle
        label="댓글"
        hint="게시물에 댓글이 달릴 때"
        on={prefs.comments}
        onChange={(v) => toggle("comments", v)}
      />
      <SettingsToggle
        label="새 팔로워"
        hint="다른 사람이 회원님을 팔로우할 때"
        on={prefs.follows}
        onChange={(v) => toggle("follows", v)}
      />
      <SettingsToggle
        label="메시지"
        hint="새로운 다이렉트 메시지가 올 때"
        on={prefs.messages}
        onChange={(v) => toggle("messages", v)}
      />
      <SettingsToggle
        label="스토리"
        hint="팔로우하는 사람의 새 스토리"
        on={prefs.stories}
        onChange={(v) => toggle("stories", v)}
      />
      {saved && <p className="settings-saved">저장됨</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
