/* apps/web/src/App.tsx */
import { useState } from 'react';
import BlueprintEditor from './pages/blueprints/Editor';
import Dashboard from './pages/dashboard/Index';
import RunDetail from './pages/runs/Detail';
import type { Tab } from './components/NavBar';

type Route =
  | { name: 'editor' }
  | { name: 'dashboard' }
  | { name: 'run'; runId: string };

function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });

  const goTab = (t: Tab) => {
    // "runs" tab shows run history in dashboard (Iter 3+: dedicated runs overview)
    if (t === 'runs' || t === 'dashboard') setRoute({ name: 'dashboard' });
    else if (t === 'editor') setRoute({ name: 'editor' });
  };
  const goRun = (runId: string) => setRoute({ name: 'run', runId });

  if (route.name === 'run') {
    return <RunDetail runId={route.runId} onBack={() => setRoute({ name: 'dashboard' })} />;
  }

  return (
    <>
      {route.name === 'dashboard' && <Dashboard onOpenRun={goRun} onNav={goTab} />}
      {route.name === 'editor' && <EditorWithNav onNav={goTab} onRunCreated={goRun} />}
    </>
  );
}

function EditorWithNav({ onNav, onRunCreated }: { onNav: (t: Tab) => void; onRunCreated?: (runId: string) => void }) {
  return <BlueprintEditor onNav={onNav} onRunCreated={onRunCreated} />;
}

export default App;