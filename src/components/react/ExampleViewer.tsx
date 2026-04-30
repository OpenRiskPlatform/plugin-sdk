import { useMemo, useState } from "react";

type ExampleSet = Record<"minimal" | "common" | "full", unknown>;

const labels = {
  minimal: "Minimal",
  common: "Common",
  full: "Full",
} as const;

export function ExampleViewer({ examples }: { examples: ExampleSet }) {
  const [active, setActive] = useState<keyof ExampleSet>("minimal");
  const json = useMemo(() => JSON.stringify(examples[active], null, 2), [examples, active]);

  return (
    <section className="or-example-viewer">
      <div className="or-section-heading">
        <p className="or-kicker">Generated examples</p>
        <h2>JSON output patterns</h2>
      </div>
      <div className="or-tabs" role="tablist" aria-label="Example variants">
        {(Object.keys(labels) as Array<keyof ExampleSet>).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setActive(key)}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <pre className="or-json-block"><code>{json}</code></pre>
    </section>
  );
}
