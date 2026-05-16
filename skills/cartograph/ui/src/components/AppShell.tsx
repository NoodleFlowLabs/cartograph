const tabs = [
  { id: "overview", label: "Overview", group: "overview" },
  { id: "surfaces", label: "Surfaces", group: "pm" },
  { id: "features", label: "Features", group: "pm" },
  { id: "flows", label: "Flows", group: "pm" },
  { id: "invariants", label: "Invariants", group: "pm", badge: true },
  { id: "techstack", label: "Tech Stack", group: "eng" },
  { id: "featuremap", label: "Feature Map", group: "eng" },
  { id: "datamodel", label: "Data Model", group: "eng" },
  { id: "codeorg", label: "Code Organization", group: "eng" },
  { id: "codehealth", label: "Code Health", group: "eng" },
];

export function AppShell() {
  return (
    <div className="app-shell" id="app-shell">
      <Header />
      <TabBar />
      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-search">
            <input type="text" id="search" placeholder="Search..." />
          </div>
          <div className="sidebar-list" id="sidebar-list" />
        </aside>
        <section className="content" id="content">
          <div className="panel-host" id="panel-host">
            <div className="panel active" id="overview-panel">
              <div className="overview-content" id="overview-content" />
            </div>
            <div className="panel" id="surfaces-panel" style={{ flexDirection: "row" }}>
              <div className="surface-content" id="surface-content">
                <div className="empty-state">Select a surface from the sidebar</div>
              </div>
            </div>
            <div className="panel" id="features-panel" style={{ flexDirection: "row" }}>
              <div className="feature-content" id="feature-content">
                <div className="empty-state">Select a feature from the sidebar</div>
              </div>
            </div>
            <div className="panel" id="entities-panel" style={{ flexDirection: "row" }}>
              <div className="entity-map-panel" id="entity-map-panel">
                <div id="entity-map-canvas" />
              </div>
              <div className="detail-panel" id="entity-detail" />
            </div>
            <div className="panel" id="flows-panel" style={{ flexDirection: "row" }}>
              <div className="flow-content" id="flow-content">
                <div className="empty-state">Select a flow from the sidebar</div>
              </div>
            </div>
            <div className="panel" id="invariants-panel" style={{ flexDirection: "row" }}>
              <div className="invariants-content" id="invariants-content">
                <div className="empty-state">No invariant data</div>
              </div>
            </div>
            <div className="panel" id="codemap-panel" style={{ flexDirection: "row" }}>
              <div className="codemap-content" id="codemap-content">
                <div className="empty-state" id="codemap-empty">
                  Select a compartment from the sidebar
                </div>
                <div id="codemap-detail-view" style={{ display: "none" }} />
                <div id="codemap-graph-view" style={{ display: "none" }}>
                  <div id="codemap-graph-canvas" />
                </div>
              </div>
            </div>
            <div className="panel" id="filetree-panel" style={{ flexDirection: "row" }}>
              <div className="filetree-legend" id="filetree-content">
                <div className="filetree-empty-state">
                  No file tree data. Re-run cartograph to generate.
                </div>
              </div>
            </div>
            <div className="panel" id="techstack-panel" style={{ flexDirection: "row" }}>
              <div className="techstack-content" id="techstack-content">
                <div className="techstack-empty">
                  No tech stack data. Re-run cartograph to generate.
                </div>
              </div>
            </div>
            <div className="panel" id="codehealth-panel" style={{ flexDirection: "row" }}>
              <div className="codehealth-panel-inner">
                <div className="codehealth-sidebar" id="codehealth-sidebar" />
                <div className="codehealth-content" id="codehealth-content" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <img src="/cartograph-logo.svg" alt="" width="26" height="26" />
        <div className="logo">
          Cartograph <span>Visualizer</span>
        </div>
      </div>
      <div className="stats" id="stats" />
    </header>
  );
}

function TabBar() {
  return (
    <nav className="tabs" aria-label="Cartograph views">
      <div className="tab-cluster tab-cluster-standalone" data-group="overview">
        <div className="tab-cluster-items">
          {tabs
            .filter((tab) => tab.group === "overview")
            .map((tab) => (
              <div className="tab active" data-tab={tab.id} key={tab.id}>
                {tab.label}
              </div>
            ))}
        </div>
      </div>
      <div className="tab-cluster" data-group="pm">
        <span className="tab-group-label" aria-hidden="true">
          PM
        </span>
        <div className="tab-cluster-items">
          {tabs
            .filter((tab) => tab.group === "pm")
            .map((tab) => (
              <div className="tab" data-tab={tab.id} id={tab.id === "invariants" ? "invariants-tab" : undefined} key={tab.id}>
                {tab.label}
                {tab.badge ? <span id="invariants-tab-badge" /> : null}
              </div>
            ))}
        </div>
      </div>
      <div className="tab-cluster" data-group="eng">
        <span className="tab-group-label" aria-hidden="true">
          Eng
        </span>
        <div className="tab-cluster-items">
          {tabs
            .filter((tab) => tab.group === "eng")
            .map((tab) => (
              <div className="tab" data-tab={tab.id} key={tab.id}>
                {tab.label}
              </div>
            ))}
        </div>
      </div>
    </nav>
  );
}
