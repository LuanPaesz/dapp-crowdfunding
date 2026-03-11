import { useEffect, useId } from "react";
import mermaid from "mermaid";

type MermaidDiagramProps = Readonly<{
  code: string;
}>;

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const id = useId();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
    });

    void mermaid.run({ querySelector: `.mermaid-${CSS.escape(id)}` });
  }, [code, id]);

  return (
    <div className="overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className={`mermaid ${`mermaid-${id}`}`}>{code}</div>
    </div>
  );
}