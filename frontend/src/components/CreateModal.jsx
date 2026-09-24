import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postApi } from "../api";
import { CloseIcon } from "./Icons";

export default function CreateModal({ onClose, onCreated }) {
  const nav = useNavigate();
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(0);

  function pick(list) {
    const next = Array.from(list || []).slice(0, 10);
    if (!next.length) return;
    setFiles(next);
    setIdx(0);
  }

  async function share() {
    if (!files.length) return;
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      form.append("image", files[0]);
      form.append("caption", caption);
      form.append("location", location);
      await postApi.create(form);
      onCreated?.();
      onClose();
      nav("/");
    } catch (e) {
      setErr("업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const preview = files[idx] ? URL.createObjectURL(files[idx]) : "";

  return (
    <div className="modal-bg" onClick={onClose}>
      <button className="modal-x" onClick={onClose} aria-label="닫기">
        <CloseIcon />
      </button>
      <div className="create-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <b>새 게시물 만들기</b>
          {files.length > 0 && (
            <button className="blue" disabled={busy} onClick={share}>
              {busy ? "공유 중…" : "공유하기"}
            </button>
          )}
        </header>
        {!files.length ? (
          <label className="drop">
            사진을 선택하세요 (여러 장 가능)
            <input type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
          </label>
        ) : (
          <div className="create-body">
            <div className="post-media">
              <img src={preview} alt="" />
              {files.length > 1 && (
                <>
                  {idx > 0 && (
                    <button className="caro-btn left" onClick={() => setIdx(idx - 1)}>
                      ‹
                    </button>
                  )}
                  {idx < files.length - 1 && (
                    <button className="caro-btn right" onClick={() => setIdx(idx + 1)}>
                      ›
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="create-form">
              <textarea placeholder="문구 입력..." value={caption} onChange={(e) => setCaption(e.target.value)} />
              <input placeholder="위치 추가" value={location} onChange={(e) => setLocation(e.target.value)} />
              <p className="muted tiny">{files.length}장 선택됨</p>
              {err && <p className="error">{err}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
