import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown never renders raw HTML, so model output can't inject markup.
export function Markdown({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? "md md-compact" : "md"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
