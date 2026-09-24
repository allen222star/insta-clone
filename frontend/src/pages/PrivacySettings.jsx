import { useEffect, useState } from "react";
import { settingsApi } from "../api";
import { useAuth } from "../AuthContext";
import SettingsToggle from "../components/SettingsToggle";
import { errMsg } from "../utils";

export default function PrivacySettings() {
  const { refreshMe } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((r) => setData(r.data))
      .catch((e) => setErr(errMsg(e)));
  }, []);

  async function patch(partial) {
    const next = { ...data, ...partial };
    setData(next);
    try {
      const { data: savedData } = await settingsApi.patch(partial);
      setData(savedData);
      await refreshMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  if (!data) return <div className="settings-panel empty">{err || "불러오는 중…"}</div>;

  return (
    <div className="settings-panel">
      <h2>개인정보</h2>
      <p className="settings-lead">계정과 콘텐츠를 볼 수 있는 사람을 관리합니다.</p>
      <SettingsToggle
        label="비공개 계정"
        hint="계정을 비공개로 설정하면 회원님이 승인한 사람만 사진과 동영상을 볼 수 있습니다."
        on={data.is_private}
        onChange={(v) => patch({ is_private: v })}
      />
      <SettingsToggle
        label="활동 상태 표시"
        hint="최근 활동한 시간을 다른 계정에 표시합니다."
        on={data.show_activity}
        onChange={(v) => patch({ show_activity: v })}
      />
      <SettingsToggle
        label="비슷한 계정 추천"
        hint="다른 사람의 프로필에 회원님 계정을 추천으로 보여줄 수 있습니다."
        on={data.suggest_account}
        onChange={(v) => patch({ suggest_account: v })}
      />
      {saved && <p className="settings-saved">저장됨</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
