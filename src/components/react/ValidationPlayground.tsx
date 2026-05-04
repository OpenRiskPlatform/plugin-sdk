import Ajv from "ajv";
import { useMemo, useState } from "react";

const initialValue = JSON.stringify(
  [
    {
      $modelVersion: "0.0.2",
      $entity: "entity.person",
      $id: "example:jane",
      $props: {
        name: [{ $type: "string", value: "Jane Example" }],
      },
    },
  ],
  null,
  2,
);

export function ValidationPlayground({ schema }: { schema: object }) {
  const [input, setInput] = useState(initialValue);
  const ajv = useMemo(() => new Ajv({ allErrors: true, strict: false }), []);
  const validate = useMemo(() => ajv.compile(schema), [ajv, schema]);

  let state: { ok: boolean; message: string; errors?: string[] };
  try {
    const parsed = JSON.parse(input);
    const ok = validate(parsed);
    state = ok
      ? { ok: true, message: "Valid data-model 0.0.2 output." }
      : {
          ok: false,
          message: "Schema validation failed.",
          errors: (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? ""}`),
        };
  } catch (error) {
    state = { ok: false, message: error instanceof Error ? error.message : "Invalid JSON." };
  }

  return (
    <section className="or-validator">
      <div className="or-section-heading">
        <p className="or-kicker">Validation playground</p>
        <h2>Check plugin output JSON</h2>
      </div>
      <div className="or-validator-grid">
        <textarea
          spellCheck={false}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Plugin output JSON"
        />
        <div className={`or-validation-result ${state.ok ? "is-ok" : "is-bad"}`}>
          <strong>{state.ok ? "Valid" : "Needs attention"}</strong>
          <p>{state.message}</p>
          {state.errors && (
            <ul>
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
