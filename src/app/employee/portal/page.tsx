'use client';

import EmployeePetPortal from '@/components/employee/EmployeePetPortal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function EmployeePortalPage() {
  return (
    <ProtectedRoute requiredUserType="employee">
      <EmployeePetPortal />
    </ProtectedRoute>
  );
}