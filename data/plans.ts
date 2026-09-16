import { useState, useEffect } from 'react';
import { ServicePlan, ServicePlanId, ServiceRecord } from '../types.ts';
import { getSupabaseClient, fetchServicesFromSupabase } from '../lib/supabase.ts';

export const SERVICE_PLANS: Record<ServicePlanId, ServicePlan> = {
  diy: {
    id: 'diy',
    name: 'DIY Blueprint',
    tagline: 'The complete self-paced implementation system to optimize your business for AI search.',
    price: 297,
    formattedPrice: '$297',
    billingType: 'one-time',
    buttonText: 'Get DIY Blueprint',
    description: 'Ideal for in-house marketing teams and founders looking to execute proven AI optimization strategies themselves.',
    features: [
      'Complete step-by-step AI search optimization blueprint',
      'Structured JSON-LD schema templates for entity authority',
      'High-impact citation & LLM training source directory',
      'Proven prompt testing rubrics for ChatGPT, Gemini & Claude',
      'Actionable self-paced implementation checklist',
      'Lifetime access to blueprint updates & resource library'
    ]
  },
  dfy: {
    id: 'dfy',
    name: 'DFY Optimization',
    badge: 'Recommended',
    isPopular: true,
    tagline: 'Complete turnkey optimization executed directly by our team of AI search specialists.',
    price: 1199,
    formattedPrice: '$1,199',
    billingType: 'one-time',
    buttonText: 'Get DFY Optimization',
    description: 'Our most comprehensive solution. We handle the entire audit, technical metadata, and citation buildout for you.',
    features: [
      'Turnkey execution handled 100% by our AI search engineers',
      'Custom schema architecture & deep entity metadata deployment',
      'Strategic authority buildout across vetted LLM training sources',
      'Competitor displacement strategy in ChatGPT & Perplexity',
      'Before-and-after verification report with documented citations',
      'Dedicated 1-on-1 strategy call & priority specialist support'
    ]
  },
  monitoring: {
    id: 'monitoring',
    name: 'Monthly Monitoring',
    badge: 'Ongoing Protection',
    tagline: 'Continuous surveillance and protection to keep your business recommended as AI models evolve.',
    price: 99,
    formattedPrice: '$99',
    billingType: 'recurring',
    billingInterval: '/month',
    buttonText: 'Start Monitoring',
    description: 'Ensures your citations, brand accuracy, and AI recommendations stay strong as model weights update weekly.',
    features: [
      'Continuous 24/7 monitoring across ChatGPT, Gemini, & Claude',
      'Real-time alerts when competitors gain AI citations in your niche',
      'Hallucination and inaccurate brand claim prevention',
      'Monthly visibility score & executive progress reports',
      'Quarterly schema & citation tune-ups for new LLM releases',
      'Cancel anytime with zero long-term commitments'
    ]
  }
};

export const DEFAULT_PLAN_ID: ServicePlanId = 'dfy';

export function getServicePlan(id: string | null | undefined, customPlans?: Record<ServicePlanId, ServicePlan>): ServicePlan {
  const plans = customPlans || SERVICE_PLANS;
  if (id && (id === 'diy' || id === 'dfy' || id === 'monitoring')) {
    return plans[id] || SERVICE_PLANS[id];
  }
  return plans[DEFAULT_PLAN_ID] || SERVICE_PLANS[DEFAULT_PLAN_ID];
}

/**
 * Hook to load dynamic services from Supabase `services` table
 * and merge with the UI plans format
 */
export function useServices() {
  const [plans, setPlans] = useState<Record<ServicePlanId, ServicePlan>>(SERVICE_PLANS);
  const [rawServices, setRawServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const dbServices = await fetchServicesFromSupabase();
        if (!isMounted) return;

        if (dbServices && dbServices.length > 0) {
          setRawServices(dbServices);
          const updatedPlans: Record<ServicePlanId, ServicePlan> = { ...SERVICE_PLANS };

          dbServices.forEach((service) => {
            const rawSlug = (service.slug || service.name || '').toLowerCase();
            let matchedKey: ServicePlanId | null = null;

            if (rawSlug.includes('diy') || rawSlug.includes('blueprint')) {
              matchedKey = 'diy';
            } else if (rawSlug.includes('dfy') || rawSlug.includes('optimization')) {
              matchedKey = 'dfy';
            } else if (rawSlug.includes('monitoring') || rawSlug.includes('month')) {
              matchedKey = 'monitoring';
            }

            if (matchedKey) {
              const base = SERVICE_PLANS[matchedKey];
              const priceNum = Number(service.price) || base.price;
              const formattedPrice = priceNum >= 1000 
                ? `$${priceNum.toLocaleString()}` 
                : `$${priceNum}`;

              updatedPlans[matchedKey] = {
                ...base,
                name: service.name || base.name,
                description: service.description || base.description,
                price: priceNum,
                formattedPrice,
                billingType: service.billing_type || base.billingType,
                billingInterval: service.billing_type === 'recurring' ? '/month' : undefined,
              };
            }
          });

          setPlans(updatedPlans);
        }
      } catch (err) {
        console.warn('Could not load services from Supabase:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { plans, rawServices, loading };
}

