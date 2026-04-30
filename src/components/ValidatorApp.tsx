import { useState, useCallback } from "react";

const SCHEMA_URL = "https://openriskplatform.github.io/plugin-sdk/schemas/data-model-v0.0.1.schema.json";

const PLACEHOLDER = JSON.stringify(
    [
        {
            $entity: "entity.person",
            $id: "example:person",
            $props: {
                name: [{ $type: "string", value: "Jane Example" }],
            },
        },
    ],
    null,
    2
);

type ValidationResult =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "valid" }
    | { status: "invalid"; errors: string[] }
    | { status: "error"; message: string };

export function ValidatorApp() {
    const [input, setInput] = useState(PLACEHOLDER);
    const [result, setResult] = useState<ValidationResult>({ status: "idle" });

    const validate = useCallback(async () => {
        setResult({ status: "loading" });
        try {
            // Parse JSON first
            let parsed: unknown;
            try {
                parsed = JSON.parse(input);
            } catch (e) {
                setResult({ status: "invalid", errors: [`JSON parse error: ${(e as Error).message}`] });
                return;
            }

            // Dynamically import ajv (it's a large lib, lazy load)
            const { default: Ajv } = await import("ajv");
            const ajv = new Ajv({ allErrors: true });

            const schemaRes = await fetch(SCHEMA_URL);
            if (!schemaRes.ok) throw new Error(`Could not fetch schema: ${schemaRes.status}`);
            const schema = await schemaRes.json();

            const valid = ajv.validate(schema, parsed);
            if (valid) {
                setResult({ status: "valid" });
            } else {
                const errors = (ajv.errors ?? []).map((e) => {
                    const path = e.instancePath || "(root)";
                    return `${path}: ${e.message}`;
                });
                setResult({ status: "invalid", errors });
            }
        } catch (e) {
            setResult({ status: "error", message: (e as Error).message });
        }
    }, [input]);

    return (
        <div className="space-y-4">
            <textarea
                value={input}
                onChange={(e) => {
                    setInput(e.target.value);
                    setResult({ status: "idle" });
                }}
                rows={20}
                spellCheck={false}
                className="w-full rounded-xl border border-border bg-muted p-4 font-mono text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex items-center gap-3">
                <button
                    onClick={validate}
                    disabled={result.status === "loading"}
                    className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {result.status === "loading" ? "Validating…" : "Validate"}
                </button>
                {result.status !== "idle" && result.status !== "loading" && (
                    <span
                        className={[
                            "text-sm font-medium",
                            result.status === "valid" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                        ].join(" ")}
                    >
                        {result.status === "valid" ? "✓ Valid" : result.status === "error" ? `Error: ${result.message}` : `✗ ${result.errors.length} error(s)`}
                    </span>
                )}
            </div>
            {result.status === "invalid" && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
                    <ul className="space-y-1">
                        {result.errors.map((err, i) => (
                            <li key={i} className="text-sm font-mono text-red-700 dark:text-red-400">
                                {err}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {result.status === "valid" && (
                <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
                    <p className="text-sm text-green-700 dark:text-green-400">
                        Output is valid against the OpenRisk data model v0.0.1 schema.
                    </p>
                </div>
            )}
        </div>
    );
}
