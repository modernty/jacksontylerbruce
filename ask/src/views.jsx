import { createContext, useContext, useEffect, useState } from "react";
import { projectCard } from "./registry.js";

const CatalogContext = createContext({ status: "loading", catalog: { nodes: [] } });

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ status: "loading", catalog: { nodes: [] } });
  useEffect(() => {
    let cancel = false;
    fetch("/public/map.json")
      .then((response) => {
        if (!response.ok) throw new Error("map");
        return response.json();
      })
      .then((map) => {
        if (!cancel) {
          setState({
            status: "ready",
            catalog: { nodes: map.nodes || [], edges: map.edges || [] },
          });
        }
      })
      .catch(() => {
        if (!cancel) setState({ status: "error", catalog: { nodes: [] } });
      });
    return () => {
      cancel = true;
    };
  }, []);
  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}

export function TextFallback({ text }) {
  return (
    <p className="fallback" data-view="text">
      {text}
    </p>
  );
}

export function ProjectCard({ id, anchor }) {
  const { status, catalog } = useCatalog();
  if (status === "loading") return <p data-state="loading">Loading</p>;
  if (status === "error") return <TextFallback text="The public record did not load." />;
  const card = projectCard(id, catalog, anchor);
  if (card.type !== "show_project") return <TextFallback text={card.text} />;
  const meta = [card.role, card.years].filter(Boolean).join(" · ");
  return (
    <article className="project-card" data-view="project-card" data-project-id={card.id}>
      <p className="kicker">Project</p>
      <h2>{card.title}</h2>
      {meta ? <p className="meta">{meta}</p> : null}
      {card.summary ? <p className="summary">{card.summary}</p> : null}
      {card.preview ? (
        <p>
          <a className="preview" href={card.preview} data-preview="live">
            Live preview
          </a>
        </p>
      ) : null}
      <ul className="links">
        {card.links.map((link) => (
          <li key={`${link.kind}:${link.href}`}>
            <a href={link.href} aria-current={link.current ? "location" : undefined}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

function idOnly(args) {
  return {
    id: args && typeof args.id === "string" ? args.id : "",
    anchor: args && typeof args.anchor === "string" ? args.anchor : undefined,
  };
}

export function renderShowProject({ args }) {
  const props = idOnly(args);
  return <ProjectCard id={props.id} anchor={props.anchor} />;
}

export function renderText({ args }) {
  const text = args && typeof args.text === "string" ? args.text : "";
  return <TextFallback text={text} />;
}

export function renderUnimplemented(toolName) {
  const copy = {
    explain_pattern: "That view is not in this slice.",
    show_related: "That view is not in this slice.",
  };
  return function Unimplemented() {
    return <TextFallback text={copy[toolName] || "That view is not available."} />;
  };
}
