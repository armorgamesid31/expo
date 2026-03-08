import { useNavigate } from 'react-router-dom';
import { MoreScreen } from '../components/more/MoreScreen';

export function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <MoreScreen
      isDarkMode={false}
      onToggleDarkMode={() => undefined}
      onNavigate={(target) => navigate(`/app/features/${target}`)}
    />
  );
}
