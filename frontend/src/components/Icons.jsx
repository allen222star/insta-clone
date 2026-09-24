export function LogoMark({ className = "logo-word" }) {
  return <span className={className}>Andygram</span>;
}

export function HomeIcon({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
    </svg>
  );
}

export function SearchIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      {filled ? (
        <path d="M18.5 10.5a8 8 0 1 1-8-8 8 8 0 0 1 8 8Z M16.5 16.5 21.5 21.5" fill="none" />
      ) : null}
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ExploreIcon({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <polygon points="13.941 13.953 7.461 15.918 9.426 9.438 15.906 7.473 13.941 13.953" />
      <polygon fill="none" stroke="currentColor" strokeWidth="2" points="17.215 7.473 7.461 7.473 7.461 17.227 17.215 17.227 17.215 7.473" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13.941 13.953 7.461 15.918 9.426 9.438 15.906 7.473 13.941 13.953" />
      <polygon points="17.215 7.473 7.461 7.473 7.461 17.227 17.215 17.227 17.215 7.473" />
    </svg>
  );
}

export function ReelsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.003 2.001a9.705 9.705 0 1 1 0 19.4 10.876 10.876 0 0 1-2.895-.384.798.798 0 0 0-.533.04l-1.984.876a.801.801 0 0 1-1.123-.708l-.054-1.78a.797.797 0 0 0-.268-.57 9.716 9.716 0 0 1-3.86-7.874c0-5.37 4.35-9.73 9.717-9.73Z" />
    </svg>
  );
}

export function HeartIcon({ filled, size = 24 }) {
  return filled ? (
    <svg viewBox="0 0 24 24" width={size} height={size} className="heart-fill">
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.675 5.002 7.876 3.078 2.744 6.62 5.263 6.998 5.502.377-.24 3.92-2.758 6.998-5.502C21.45 14.797 24 12.732 24 9.122a6.985 6.985 0 0 0-6.708-7.218Z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="3" x2="9.218" y2="10.083" />
      <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" />
    </svg>
  );
}

export function BookmarkIcon({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M20 22a.999.999 0 0 1-.624-.219L12 15.828 4.624 21.78A1 1 0 0 1 3 21V3a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="20 21 12 13.44 4 21 4 3 20 3 20 21" />
    </svg>
  );
}

export function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
