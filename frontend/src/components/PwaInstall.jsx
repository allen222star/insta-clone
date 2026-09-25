import { useEffect, useState } from "react";

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem("pwa-install-hide") === "1");

  useEffect(() => {
    if (standalone()) return;
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(apple && !window.MSStream);
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || standalone()) return null;
  if (!promptEvent && !ios) return null;

  function dismiss() {
    localStorage.setItem("pwa-install-hide", "1");
    setHidden(true);
  }

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    dismiss();
  }

  return (
    <div className="pwa-install" role="dialog" aria-label="앱 설치">
      <p>
        {ios
          ? "공유 버튼을 누른 뒤 ‘홈 화면에 추가’하면 앱처럼 쓸 수 있습니다."
          : "홈 화면에 설치하면 ANNAgram을 앱처럼 쓸 수 있습니다."}
      </p>
      <div className="pwa-install-actions">
        {promptEvent && (
          <button type="button" className="btn-blue" onClick={install}>
            설치
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={dismiss}>
          닫기
        </button>
      </div>
    </div>
  );
}
