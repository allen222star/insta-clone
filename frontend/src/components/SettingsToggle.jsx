export default function SettingsToggle({ on, onChange, label, hint }) {
  return (
    <div className="settings-row">
      <div>
        <div className="settings-row-title">{label}</div>
        {hint && <p className="settings-hint">{hint}</p>}
      </div>
      <button
        type="button"
        className={`switch ${on ? "on" : ""}`}
        onClick={() => onChange(!on)}
        aria-pressed={on}
        aria-label={label}
      >
        <i />
      </button>
    </div>
  );
}
