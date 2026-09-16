
// Add React import to fix namespace error
import React from 'react';

export interface AuditRequest {
  full_name: string;
  business_name: string;
  website: string;
  email: string;
  industry: string;
  location: string;
}

export interface IndustryData {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  howWeHelp: string;
  icon: React.ReactNode;
}

export interface ServiceData {
  title: string;
  problem: string;
  solution: string;
  outcome: string;
}

export type ServicePlanId = 'diy' | 'dfy' | 'monitoring';

export interface ServicePlan {
  id: ServicePlanId;
  name: string;
  badge?: string;
  isPopular?: boolean;
  tagline: string;
  price: number;
  formattedPrice: string;
  billingType: 'one-time' | 'recurring';
  billingInterval?: string;
  buttonText: string;
  description: string;
  features: string[];
}

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  website: string;
  city: string;
  state: string;
}