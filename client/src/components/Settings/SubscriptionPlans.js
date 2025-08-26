import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  CheckIcon,
  XMarkIcon,
  StarIcon,
  RocketLaunchIcon,
  BuildingOfficeIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const SubscriptionPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data: userInfo } = useQuery('userInfo', async () => {
    const response = await axios.get('/api/users/profile');
    return response.data.user;
  });

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with lead generation',
      icon: StarIcon,
      color: 'bg-gray-500',
      features: [
        { text: '3 active scraping configurations', included: true },
        { text: '50 leads per month', included: true },
        { text: 'Daily scraping frequency', included: true },
        { text: 'Basic lead export', included: true },
        { text: 'Email support', included: false },
        { text: 'Advanced AI processing', included: false },
        { text: 'CRM integrations', included: false },
        { text: 'Priority support', included: false }
      ],
      limits: {
        maxConfigs: 3,
        maxLeads: 50,
        frequency: 'daily'
      }
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '$29',
      period: 'per month',
      description: 'Great for small businesses and freelancers',
      icon: RocketLaunchIcon,
      color: 'bg-blue-500',
      features: [
        { text: '10 active scraping configurations', included: true },
        { text: '200 leads per month', included: true },
        { text: 'Daily scraping frequency', included: true },
        { text: 'Advanced lead export', included: true },
        { text: 'Email support', included: true },
        { text: 'Advanced AI processing', included: true },
        { text: 'Basic CRM integrations', included: true },
        { text: 'Priority support', included: false }
      ],
      limits: {
        maxConfigs: 10,
        maxLeads: 200,
        frequency: 'daily'
      }
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$99',
      period: 'per month',
      description: 'Ideal for growing companies and agencies',
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500',
      features: [
        { text: '25 active scraping configurations', included: true },
        { text: '500 leads per month', included: true },
        { text: 'Hourly scraping frequency', included: true },
        { text: 'All export formats', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Advanced AI processing', included: true },
        { text: 'Full CRM integrations', included: true },
        { text: 'Priority support', included: true }
      ],
      limits: {
        maxConfigs: 25,
        maxLeads: 500,
        frequency: 'hourly'
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: 'per month',
      description: 'For large organizations with high-volume needs',
      icon: TrophyIcon,
      color: 'bg-yellow-500',
      features: [
        { text: '100 active scraping configurations', included: true },
        { text: 'Unlimited leads per month', included: true },
        { text: 'Hourly scraping frequency', included: true },
        { text: 'Custom export solutions', included: true },
        { text: 'Dedicated support manager', included: true },
        { text: 'Custom AI processing', included: true },
        { text: 'Custom CRM integrations', included: true },
        { text: '24/7 phone support', included: true }
      ],
      limits: {
        maxConfigs: 100,
        maxLeads: -1, // Unlimited
        frequency: 'hourly'
      }
    }
  ];

  const currentPlan = plans.find(plan => plan.id === userInfo?.subscriptionTier) || plans[0];

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      // In a real application, this would redirect to a payment processor
      // For now, we'll simulate the upgrade
      toast.success(`Upgrade to ${selectedPlan.name} plan initiated!`);
      setSelectedPlan(null);
    } catch (error) {
      toast.error('Failed to initiate upgrade');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="mt-2 text-lg text-gray-600">
          Choose the perfect plan for your lead generation needs
        </p>
      </div>

      {/* Current Plan Info */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
            <p className="text-gray-600 mt-1">
              You are currently on the <span className="font-semibold">{currentPlan.name}</span> plan
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">{currentPlan.price}</p>
            <p className="text-sm text-gray-500">{currentPlan.period}</p>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Max Configs</p>
            <p className="text-lg font-semibold text-gray-900">{currentPlan.limits.maxConfigs}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Max Leads</p>
            <p className="text-lg font-semibold text-gray-900">
              {currentPlan.limits.maxLeads === -1 ? 'Unlimited' : currentPlan.limits.maxLeads}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Frequency</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{currentPlan.limits.frequency}</p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.id === userInfo?.subscriptionTier;
          const isSelected = selectedPlan?.id === plan.id;
          
          return (
            <motion.div
              key={plan.id}
              className={`relative bg-white rounded-lg shadow-lg p-6 border-2 transition-all duration-200 ${
                isCurrentPlan 
                  ? 'border-primary-500 bg-primary-50' 
                  : isSelected 
                    ? 'border-primary-300 shadow-xl' 
                    : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ y: -5 }}
              onClick={() => handlePlanSelect(plan)}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${plan.color} text-white mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {!isCurrentPlan && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan);
                  }}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Upgrade Button */}
      {selectedPlan && selectedPlan.id !== userInfo?.subscriptionTier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-primary-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upgrade to {selectedPlan.name}
            </h3>
            <p className="text-gray-600 mb-4">
              Get access to {selectedPlan.limits.maxConfigs} configurations and{' '}
              {selectedPlan.limits.maxLeads === -1 ? 'unlimited' : selectedPlan.limits.maxLeads} leads per month
            </p>
            <button
              onClick={handleUpgrade}
              className="bg-primary-600 text-white px-8 py-3 rounded-md font-medium hover:bg-primary-700 transition-colors"
            >
              Upgrade Now - {selectedPlan.price}/{selectedPlan.period === 'forever' ? 'one-time' : 'month'}
            </button>
          </div>
        </motion.div>
      )}

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900">Can I change my plan at any time?</h4>
            <p className="text-gray-600 text-sm mt-1">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">What happens to my existing configurations when I downgrade?</h4>
            <p className="text-gray-600 text-sm mt-1">
              When downgrading, you'll need to deactivate configurations to meet your new limit. Existing leads are preserved.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Do you offer custom plans for enterprise customers?</h4>
            <p className="text-gray-600 text-sm mt-1">
              Yes, we offer custom pricing and features for enterprise customers. Contact our sales team for details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;

