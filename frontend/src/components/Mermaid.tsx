import { useEffect, useId } from "react";
import mermaid from "mermaid";

export default function MermaidDiagram({ code }: { code: string }) {
  const id = useId();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
    });

    // Renderiza os diagramas presentes no DOM
    mermaid.run({ querySelector: `.mermaid-${CSS.escape(id)}` });
  }, [code, id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 overflow-auto">
      <div className={`mermaid-${id} mermaid`}>{code}</div>
    </div>
  );
}
