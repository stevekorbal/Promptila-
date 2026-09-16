
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

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  role: UserRole;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

export interface BusinessRecord {
  id: string;
  user_id?: string;
  name: string;
  website?: string;
  city?: string;
  state?: string;
  phone?: string;
  created_at?: string;
}

export interface ServiceRecord {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  billing_type: 'one-time' | 'recurring';
  created_at?: string;
  features?: string[] | string;
}

export interface AuditRequestRecord {
  id: string;
  user_id?: string;
  business_name?: string;
  website?: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at?: string;
}

export interface AuditRecord {
  id: string;
  business_id?: string;
  user_id?: string;
  overall_score?: number;
  status?: string;
  created_at?: string;
  business_name?: string;
}

export interface ReportRecord {
  id: string;
  audit_id?: string;
  business_id?: string;
  user_id?: string;
  title: string;
  summary?: string;
  file_url?: string;
  created_at?: string;
}

export interface OrderRecord {
  id: string;
  user_id?: string;
  service_id?: string;
  service_name?: string;
  amount: number;
  status: string;
  billing_type?: string;
  created_at?: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id?: string;
  service_id?: string;
  service_name?: string;
  status: string;
  current_period_end?: string;
  created_at?: string;
}
