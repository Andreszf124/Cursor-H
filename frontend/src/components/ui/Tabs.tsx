interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del curso"
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`tab-${tab.id}`}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm transition ${
              selected
                ? 'border-indigo-600 font-medium text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
