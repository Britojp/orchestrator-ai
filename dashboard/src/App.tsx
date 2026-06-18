import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardScreen } from './screens/DashboardScreen';
import { TaskDetailScreen } from './screens/TaskDetailScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/tasks/:id" element={<TaskDetailScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
