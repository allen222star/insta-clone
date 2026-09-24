import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../api";
import { useAuth } from "../AuthContext";
import Avatar from "../components/Avatar";
import { errMsg } from "../utils";

export default function EditProfile() {
  const { user, refreshMe } = useAuth();
  const nav = useNavigate();
  const [full_name, setFull] = useState(user.full_name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [website, setWeb] = useState(user.website || "");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("full_name", full_name);
      form.append("bio", bio);
      form.append("website", website);
      if (file) form.append("avatar", file);
      await userApi.updateMe(form);
      await refreshMe();
      nav(`/${user.username}`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="edit-page" onSubmit={save}>
      <h2>프로필 수정</h2>
      <div className="edit-ava">
        <Avatar user={user} src={file ? URL.createObjectURL(file) : user.avatar_url} size={56} />
        <div>
          <div className="uname">{user.username}</div>
          <label className="blue">
            사진 변경
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>
      <label>
        이름
        <input value={full_name} onChange={(e) => setFull(e.target.value)} />
      </label>
      <label>
        소개
        <textarea value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} />
      </label>
      <label>
        웹사이트
        <input value={website} onChange={(e) => setWeb(e.target.value)} />
      </label>
      {err && <p className="error">{err}</p>}
      <button className="btn-blue" disabled={busy}>
        제출
      </button>
    </form>
  );
}
