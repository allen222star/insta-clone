import { mediaUrl } from "../api";

export default function Avatar({ user, src, size = 32, className = "" }) {
  const url = src || user?.avatar_url;
  const letter = (user?.username || "?").slice(0, 1).toUpperCase();
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {url ? <img src={mediaUrl(url)} alt="" /> : letter}
    </span>
  );
}
