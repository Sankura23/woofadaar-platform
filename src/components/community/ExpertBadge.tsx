'use client';

interface ExpertBadgeProps {
  expertProfile?: {
    verification_status: string;
    specializations: string[];
    rating_average: number;
    experience_years?: number;
  };
  verificationBadge?: string;
  className?: string;
  showDetails?: boolean;
}

export default function ExpertBadge({ 
  expertProfile, 
  verificationBadge, 
  className = '',
  showDetails = false 
}: ExpertBadgeProps) {
  
  if (!expertProfile && !verificationBadge) return null;

  const getVerificationIcon = (status: string) => {
    const icons = {
      verified: '✅',
      pending: '⏳',
      rejected: '❌',
      specialist: '⭐',
      community_expert: '🎓'
    };
    return icons[status as keyof typeof icons] || '📋';
  };

  const getVerificationColor = (status: string) => {
    const colors = {
      verified: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      specialist: 'bg-purple-100 text-purple-800 border-purple-200',
      community_expert: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getVerificationLabel = (status: string) => {
    const labels = {
      verified: 'Verified Expert',
      pending: 'Verification Pending',
      rejected: 'Not Verified',
      specialist: 'Specialist',
      community_expert: 'Community Expert'
    };
    return labels[status as keyof typeof labels] || 'Expert';
  };

  const status = verificationBadge || expertProfile?.verification_status || 'pending';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getVerificationColor(status)}`}>
        <span>{getVerificationIcon(status)}</span>
        <span>{getVerificationLabel(status)}</span>
        
        {showDetails && expertProfile && (
          <>
            {expertProfile.rating_average > 0 && (
              <span className="ml-1">
                ⭐ {expertProfile.rating_average.toFixed(1)}
              </span>
            )}
            
            {expertProfile.experience_years && (
              <span className="ml-1">
                📅 {expertProfile.experience_years}y
              </span>
            )}
          </>
        )}
      </div>
      
      {showDetails && expertProfile && expertProfile.specializations.length > 0 && (
        <div className="ml-2 flex flex-wrap gap-1">
          {expertProfile.specializations.slice(0, 2).map((spec) => (
            <span
              key={spec}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {spec}
            </span>
          ))}
          {expertProfile.specializations.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{expertProfile.specializations.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}