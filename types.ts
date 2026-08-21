
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