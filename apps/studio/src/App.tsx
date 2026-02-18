import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TemplateEditor } from "./components/TemplateEditor";
import { CardCatalog } from "./components/CardCatalog";
import { CsvImportConsole } from "./components/CsvImportConsole";
import { EffectSimulator } from "./components/EffectSimulator";
import { ExportCenter } from "./components/ExportCenter";
import { CardPreview } from "./components/CardPreview";
import { AiWorkshop } from "./components/AiWorkshop";
import { ArtAssets } from "./components/ArtAssets";

type View = "template" | "catalog" | "csv" | "effects" | "export" | "ai" | "art";

export function App() {
  const [view, setView] = useState<View>("template");
  const bootstrap = useMutation(api.seed.bootstrap);
  const didBootstrap = useRef(false);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void bootstrap({});
  }, [bootstrap]);

  const content = useMemo(() => {
    switch (view) {
      case "template":
        return <TemplateEditor />;
      case "catalog":
        return <CardCatalog />;
      case "csv":
        return <CsvImportConsole />;
      case "effects":
        return <EffectSimulator />;
      case "export":
        return <ExportCenter />;
      case "ai":
        return <AiWorkshop />;
      case "art":
        return <ArtAssets />;
      default:
        return null;
    }
  }, [view]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <img src="/brand/logo.png" alt="LunchTable logo" className="logo" />
        <h1 style={{ fontSize: "1.4rem", marginBottom: 6 }}>Gambit Studio</h1>
        <p style={{ marginTop: 0, color: "#4a4138" }}>Premier TCG generator vertical slice</p>
        <div className="nav-list">
          <button className={`nav-btn ${view === "template" ? "active" : ""}`} onClick={() => setView("template")}>Template Editor</button>
          <button className={`nav-btn ${view === "catalog" ? "active" : ""}`} onClick={() => setView("catalog")}>Card Catalog</button>
          <button className={`nav-btn ${view === "csv" ? "active" : ""}`} onClick={() => setView("csv")}>CSV Import</button>
          <button className={`nav-btn ${view === "art" ? "active" : ""}`} onClick={() => setView("art")}>Art Assets</button>
          <button className={`nav-btn ${view === "effects" ? "active" : ""}`} onClick={() => setView("effects")}>Effect Simulator</button>
          <button className={`nav-btn ${view === "export" ? "active" : ""}`} onClick={() => setView("export")}>Export Center</button>
          <button className={`nav-btn ${view === "ai" ? "active" : ""}`} onClick={() => setView("ai")}>AI Workshop</button>
        </div>
      </aside>

      <main className="content">
        <CardPreview />
        {content}
      </main>
    </div>
  );
}
