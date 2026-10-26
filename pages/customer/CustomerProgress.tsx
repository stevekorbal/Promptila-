import React from 'react';
import CustomerPlaceholder from '../../components/customer/CustomerPlaceholder.tsx';

export const CustomerProgress: React.FC = () => {
  return (
    <CustomerPlaceholder
      icon="progress"
      title="Optimization Progress"
      description="Score trajectory over time, completed implementation milestones, verified citations, and before-and-after recommendation comparisons."
    />
  );
};

export default CustomerProgress;
