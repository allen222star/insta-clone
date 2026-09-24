import { useEffect, useState } from "react";
import { settingsApi } from "../api";
import { errMsg } from "../utils";

const LANGS = [
  { id: "ko", label: "한국어", native: "한국어" },
  { id: "en", label: "English", native: "영어" },
  { id: "ja", label: "日本語", native: "일본어" },
  { id: "zh", label: "中文（简体）", native: "중국어" },
  { id: "es", label: "Español", native: "스페인어" },
  { id: "fr", label: "Français", native: "프랑스어" },
];

export default function LanguageSettings() {
  const [language, setLanguage] = useState("ko");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((r) => setLanguage(r.data.language || "ko"))
      .catch((e) => setErr(errMsg(e)));
  }, []);

  async function choose(id) {
    setLanguage(id);
    try {
      await settingsApi.patch({ language: id });
      document.documentElement.lang = id;
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  return (
    <div className="settings-panel">
      <h2>언어</h2>
      <p className="settings-lead">앱에서 사용할 언어를 선택하세요. 이 클론의 화면 문구는 한국어로 유지됩니다.</p>
      <ul className="lang-list">
        {LANGS.map((lang) => (
          <li key={lang.id}>
            <button
              type="button"
              className={`lang-row ${language === lang.id ? "on" : ""}`}
              onClick={() => choose(lang.id)}
            >
              <span>
                <b>{lang.label}</b>
                <span className="muted"> {lang.native}</span>
              </span>
              {language === lang.id && <span className="lang-check">✓</span>}
            </button>
          </li>
        ))}
      </ul>
      {saved && <p className="settings-saved">저장됨</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}
