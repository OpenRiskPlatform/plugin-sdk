import { useState } from "react";
import type { DataModelEntity } from "@/core/data-model/types";
import { EntityCard } from "@/components/data-model/EntityCard";
import { RiskTopicGroupCard } from "@/components/data-model/RiskTopicGroupCard";

interface EntityPreviewProps {
    examples: {
        minimal: DataModelEntity[];
        common: DataModelEntity[];
        full: DataModelEntity[];
    };
}

const TABS = [
    { key: "minimal" as const, label: "Minimal" },
    { key: "common" as const, label: "Common" },
    { key: "full" as const, label: "Full" },
];

export function EntityPreview({ examples }: EntityPreviewProps) {
    const [tab, setTab] = useState<"minimal" | "common" | "full">("common");
    const [showJson, setShowJson] = useState(false);
    const entities = examples[tab];
    const isRiskTopic = entities.every((e) => e.$entity === "entity.riskTopic");

    return (
        <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 bg-background">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Live Preview
                </span>
                <div className="flex items-center gap-2">
                    {/* Example variant tabs */}
                    <div className="flex rounded-md border border-border overflow-hidden text-xs">
                        {TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={[
                                    "px-3 py-1 transition-colors",
                                    tab === key
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                ].join(" ")}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {/* JSON toggle */}
                    <button
                        onClick={() => setShowJson((v) => !v)}
                        className={[
                            "px-3 py-1 rounded-md border text-xs transition-colors",
                            showJson
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        ].join(" ")}
                    >
                        JSON
                    </button>
                </div>
            </div>

            {/* Preview area */}
            <div className="p-4">
                {showJson ? (
                    <pre className="rounded-xl bg-muted p-4 text-xs overflow-x-auto font-mono leading-relaxed">
                        {JSON.stringify(entities, null, 2)}
                    </pre>
                ) : (
                    <div className="space-y-3">
                        {isRiskTopic ? (
                            <RiskTopicGroupCard topics={entities} />
                        ) : (
                            entities.map((entity) => (
                                <EntityCard key={entity.$id} entity={entity} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
