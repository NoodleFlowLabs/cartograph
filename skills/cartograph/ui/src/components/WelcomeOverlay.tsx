export function WelcomeOverlay() {
  return (
    <div className="drop-zone-overlay" id="drop-zone-overlay">
      <div className="welcome-shell">
        <div className="welcome-logo">
          <img src="/cartograph-logo.svg" alt="" width="34" height="34" />
          <span className="welcome-logo-text">Cartograph</span>
        </div>
        <div className="welcome-copy">
          Cartograph runs locally. The UI loads <code>cartograph.json</code> from this project root and refreshes when it changes.
        </div>
        <div className="welcome-terminal-prompt">bun skills/cartograph/ui/server.ts</div>
        <div className="drop-zone" id="drop-zone" role="button" tabIndex={0} aria-label="Load cartograph.json">
          <div className="drop-zone-title">
            Waiting for <code>cartograph.json</code>
          </div>
          <div className="drop-zone-sub">Run /cartograph, or browse for a JSON file</div>
          <button className="drop-zone-btn" id="browse-btn" type="button">
            Browse files
          </button>
          <div className="drop-zone-error" id="drop-zone-error" />
          <input type="file" id="file-input" accept=".json" style={{ display: "none" }} />
        </div>
        <div className="welcome-divider" />
        <div className="welcome-landing-link">
          <a href="https://cartograph.sh" target="_blank" rel="noopener noreferrer">
            Learn more at cartograph.sh -&gt;
          </a>
        </div>
      </div>
    </div>
  );
}
