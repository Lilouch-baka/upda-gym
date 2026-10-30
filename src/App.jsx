import { useApp } from './state.jsx';
import { useRoute } from './router.js';
import { Spinner, TabBar } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import Library from './screens/Library.jsx';
import Session from './screens/Session.jsx';
import Exam from './screens/Exam.jsx';
import Progress from './screens/Progress.jsx';
import Settings from './screens/Settings.jsx';

const ROUTES = {
  '/': { C: Home, tab: '/' },
  '/library': { C: Library, tab: '/library' },
  '/progress': { C: Progress, tab: '/progress' },
  '/settings': { C: Settings, tab: '/settings' },
  '/session': { C: Session, tab: null },
  '/exam': { C: Exam, tab: null },
};

export default function App() {
  const { ready } = useApp();
  const route = useRoute();
  const r = ROUTES[route.path] || ROUTES['/'];

  if (!ready) {
    return (
      <div className="app">
        <div className="screen">
          <Spinner label="Loading your progress…" />
        </div>
      </div>
    );
  }

  const C = r.C;
  // Keyed by the full hash so a new session always starts fresh.
  return (
    <div className="app">
      <main>
        <C key={window.location.hash} params={route.params} />
      </main>
      {r.tab && <TabBar current={r.tab} />}
    </div>
  );
}
