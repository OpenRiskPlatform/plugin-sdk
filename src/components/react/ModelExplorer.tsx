import { useMemo, useState } from "react";

type Entity = {
  id: string;
  label: string;
  group: string;
  description: string;
  frontend: string;
  props: Record<string, unknown>;
};

export function ModelExplorer({ entities }: { entities: Entity[] }) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = entities.filter((entity) => {
      if (!normalized) return true;
      return (
        entity.id.toLowerCase().includes(normalized) ||
        entity.label.toLowerCase().includes(normalized) ||
        Object.keys(entity.props).some((key) => key.toLowerCase().includes(normalized))
      );
    });

    return filtered.reduce<Record<string, Entity[]>>((acc, entity) => {
      (acc[entity.group] ??= []).push(entity);
      return acc;
    }, {});
  }, [entities, query]);

  return (
    <section className="or-explorer">
      <div className="or-explorer-toolbar">
        <div>
          <p className="or-kicker">Interactive map</p>
          <h2>Explore the model surface</h2>
        </div>
        <label>
          <span>Filter entities or props</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="pepStatus, media, organization..."
          />
        </label>
      </div>

      <div className="or-explorer-groups">
        {Object.entries(grouped).map(([group, items]) => {
          const isOpen = openGroups[group] ?? true;
          return (
            <div className="or-explorer-group" key={group}>
              <button
                type="button"
                onClick={() => setOpenGroups((state) => ({ ...state, [group]: !isOpen }))}
                aria-expanded={isOpen}
              >
                <span>{group}</span>
                <span>{items.length} entities</span>
              </button>
              {isOpen && (
                <div className="or-explorer-list">
                  {items.map((entity) => (
                    <a className="or-explorer-item" href={`./entities/${entity.id.replace("entity.", "")}/`} key={entity.id}>
                      <span>
                        <strong>{entity.label}</strong>
                        <code>{entity.id}</code>
                      </span>
                      <span>{Object.keys(entity.props).length} props</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
