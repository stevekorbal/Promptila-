import { ServicePlan, ServicePlanId } from '../types.ts';

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

export function getServicePlan(id: string | null | undefined): ServicePlan {
  if (id && (id === 'diy' || id === 'dfy' || id === 'monitoring')) {
    return SERVICE_PLANS[id];
  }
  return SERVICE_PLANS[DEFAULT_PLAN_ID];
}
