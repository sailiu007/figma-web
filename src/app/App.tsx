import { useEffect } from 'react';
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
  const { currentPage, theme } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'projects': return <ProjectsPage />;
      case 'project-detail': return <ProjectDetailPage />;
      case 'system': return <SystemSettingsPage />;
      case 'roles': return <RolesPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <>
      <Background />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {currentPage === 'project-detail' && <ProjectSubSidebar />}
        <main key={currentPage} className="flex-1 min-w-0 fade-enter">
          {renderPage()}
        </main>
      </div>
      <Toast />
    </>
  );
}
