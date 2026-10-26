import React from 'react';
import CustomerPlaceholder from '../../components/customer/CustomerPlaceholder.tsx';

export const CustomerAccount: React.FC = () => {
  return (
    <CustomerPlaceholder
      icon="account"
      title="Customer Account Settings"
      description="Manage your contact details, business profile, login credentials, and notification preferences."
    />
  );
};

export default CustomerAccount;
