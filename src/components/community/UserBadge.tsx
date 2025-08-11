'use client';

interface UserBadgeProps {
  badge: {
    badge_type: string;
    badge_name: string;
    badge_description: string;
    badge_icon: string;
    badge_color: string;
    earned_at: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export default function UserBadge({ badge, size = 'md', showTooltip = true }: UserBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="relative inline-block">
              <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-sm`}
          style={{ 
            backgroundColor: `${badge.badge_color}15`,
            color: badge.badge_color,
            border: `2px solid ${badge.badge_color}30`
          }}
          title={showTooltip ? `${badge.badge_name}: ${badge.badge_description}` : undefined}
        >
          {badge.badge_icon}
        </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          <div className="font-semibold">{badge.badge_name}</div>
          <div className="text-gray-300">{badge.badge_description}</div>
          <div className="text-gray-400 mt-1">Earned {formatDate(badge.earned_at)}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Badge collection component
interface BadgeCollectionProps {
  badges: Array<{
    badge_type: string;
    badge_name: string;
    badge_description: string;
    badge_icon: string;
    badge_color: string;
    earned_at: string;
  }>;
  maxDisplay?: number;
  showAll?: boolean;
}

export function BadgeCollection({ badges, maxDisplay = 5, showAll = false }: BadgeCollectionProps) {
  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay);
  const hiddenCount = badges.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayBadges.map((badge) => (
        <div key={badge.badge_type} className="group">
          <UserBadge badge={badge} size="md" />
        </div>
      ))}
      
      {!showAll && hiddenCount > 0 && (
        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          +{hiddenCount}
        </div>
      )}
    </div>
  );
} 