import { Link } from "react-router-dom";

export default function Caption({ text, username }) {
  if (!text) return null;
  const parts = String(text).replace(/\r\n?/g, "\n").split(/(#[\p{L}\p{N}_]+|@[A-Za-z0-9._]+)/gu);
  return (
    <p className="caption">
      {username && (
        <Link to={`/${username}`} className="uname">
          {username}{" "}
        </Link>
      )}
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return (
            <Link key={i} to={`/explore/tags/${part.slice(1).toLowerCase()}`} className="hash">
              {part}
            </Link>
          );
        }
        if (part.startsWith("@")) {
          return (
            <Link key={i} to={`/${part.slice(1)}`} className="hash">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
