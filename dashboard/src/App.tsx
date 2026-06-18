import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { DashboardScreen } from './screens/DashboardScreen';
import { TaskDetailScreen } from './screens/TaskDetailScreen';
import { ChatScreen } from './screens/ChatScreen';
import { KanbanScreen } from './screens/KanbanScreen';
import { Bot, LayoutDashboard, KanbanSquare } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'bg-gray-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50';

  return (
    <nav className="flex space-x-4 border-b border-gray-200 px-4 py-3 bg-white">
      <Link to="/" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}>
        <LayoutDashboard className="w-4 h-4" />
        Dashboard
      </Link>
      <Link to="/chat" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive('/chat')}`}>
        <Bot className="w-4 h-4" />
        Chat Workspace
      </Link>
      <Link to="/kanban" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive('/kanban')}`}>
        <KanbanSquare className="w-4 h-4" />
        Kanban Board
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/chat" element={<ChatScreen />} />
            <Route path="/kanban" element={<KanbanScreen />} />
            <Route path="/tasks/:id" element={<TaskDetailScreen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
