import { useState } from 'react';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { defaultState } from './lib/defaultState';
import type { PlannerState } from './lib/types';
import { currentNetWorth, formatINR } from './lib/finance';
import { Inputs } from './components/Inputs';
import { Overview } from './components/Overview';
import { LandScenario } from './components/LandScenario';
import { Comparison } from './components/Comparison';

const TABS = ['Overview', 'Inputs', 'Land scenario', 'Compare years'] as const;
type Tab = (typeof TABS)[number];

function App() {
  const [state, setState] = useLocalStorageState<PlannerState>('fire-planner-state', defaultState);
  const [tab, setTab] = useState<Tab>('Overview');
  const netWorth = currentNetWorth(state);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <div>
              <h1 className="text-base font-semibold text-zinc-50">FIRE &amp; Land Planner</h1>
              <p className="text-xs text-zinc-500">Net worth {formatINR(netWorth)}</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === 'Overview' && <Overview state={state} />}
        {tab === 'Inputs' && <Inputs state={state} setState={setState} />}
        {tab === 'Land scenario' && <LandScenario state={state} setState={setState} />}
        {tab === 'Compare years' && <Comparison state={state} setState={setState} />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-zinc-600 sm:px-6">
        All figures are estimates for personal planning. Data is stored only in your browser.
      </footer>
    </div>
  );
}

export default App;
