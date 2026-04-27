import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useAppStore } from '../store/useAppStore';
import Sidebar from './components/Sidebar';
import ProjectSubSidebar from './components/ProjectSubSidebar';
import ProjectsPage from './components/ProjectsPage';
import ProjectDetailPage from './components/ProjectDetailPage';
import RolesPage from './components/RolesPage';
import DashboardPage from './components/DashboardPage';
import SettingsPage from './components/SettingsPage';
import SystemSettingsPage from './components/SystemSettingsPage';
import Background from './components/Background';
import Toast from './components/Toast';

export default function App() {
  const { theme } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <>
      <Background />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {location.pathname.startsWith('/projects/') && <ProjectSubSidebar />}
        <main key={location.pathname} className="flex-1 min-w-0 fade-enter">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailRoute />} />
            <Route path="/permissions" element={<RolesPage />} />
            <Route path="/permissions/users" element={<Navigate to="/permissions?tab=users" replace />} />
            <Route path="/permissions/roles" element={<Navigate to="/permissions?tab=roles" replace />} />
            <Route path="/system" element={<SystemSettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </>
  );
}

function ProjectDetailRoute() {
  const { projectId } = useParams();
  const { setCurrentProject } = useAppStore();

  useEffect(() => {
    setCurrentProject(projectId ?? null);
  }, [projectId, setCurrentProject]);

  return <ProjectDetailPage />;
}
