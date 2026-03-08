import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
        <LayoutDashboard className="w-8 h-8 text-[var(--color-accent)]" /> {t('dashboard.title')}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        {t('dashboard.welcomeDesc')}
      </p>
    </div>
  );
};

export default Dashboard;
