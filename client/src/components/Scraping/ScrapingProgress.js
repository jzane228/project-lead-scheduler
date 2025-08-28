import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

const ScrapingProgress = ({ jobId, progress, onComplete, configName }) => {
  const [currentProgress, setCurrentProgress] = useState(progress || {
    stage: 'initializing',
    progress: 0,
    total: 1,
    percentage: 0,
    message: 'Starting enhanced scraping...'
  });

  useEffect(() => {
    if (progress) {
      setCurrentProgress(progress);
      
      // If completed, trigger onComplete after a delay
      if (progress.stage === 'completed') {
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 2000);
      }
    }
  }, [progress, onComplete]);

  const getStageIcon = () => {
    switch (currentProgress.stage) {
      case 'initializing':
        return <ClockIcon className="w-6 h-6 text-blue-500" />;
      case 'scraping':
        return <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'enriching':
        return <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />;
      case 'extracting':
        return <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />;
      case 'saving':
        return <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStageColor = () => {
    switch (currentProgress.stage) {
      case 'initializing':
        return 'bg-blue-500';
      case 'scraping':
        return 'bg-blue-500';
      case 'enriching':
        return 'bg-green-500';
      case 'extracting':
        return 'bg-purple-500';
      case 'saving':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStageDescription = () => {
    switch (currentProgress.stage) {
      case 'initializing':
        return 'Setting up enhanced scraping service...';
      case 'scraping':
        return 'Searching multiple high-quality business news sources';
      case 'enriching':
        return 'Extracting full article content from URLs';
      case 'extracting':
        return 'Using AI to extract business lead information';
      case 'saving':
        return 'Saving leads with populated data fields';
      case 'completed':
        return 'Scraping completed successfully!';
      default:
        return 'Processing...';
    }
  };

  if (!progress) return null;

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStageIcon()}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {configName ? `${configName} - Scraping Progress` : 'Enhanced Scraping Progress'}
            </h3>
            <p className="text-sm text-gray-500">{getStageDescription()}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{currentProgress.percentage}%</div>
          <div className="text-sm text-gray-500">
            {currentProgress.progress} of {currentProgress.total}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${getStageColor()}`}
          style={{ width: `${currentProgress.percentage}%` }}
        ></div>
      </div>

      {/* Current Message */}
      <div className="text-center">
        <p className="text-sm text-gray-700 font-medium">{currentProgress.message}</p>
      </div>

      {/* Stage Indicators */}
      <div className="mt-6 flex justify-between">
        {['initializing', 'scraping', 'enriching', 'extracting', 'saving', 'completed'].map((stage, index) => (
          <div key={stage} className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full mb-2 ${
              currentProgress.stage === stage 
                ? getStageColor() 
                : index < ['initializing', 'scraping', 'enriching', 'extracting', 'saving', 'completed'].indexOf(currentProgress.stage)
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}></div>
            <span className="text-xs text-gray-500 capitalize">{stage}</span>
          </div>
        ))}
      </div>

      {/* Success Message */}
      {currentProgress.stage === 'completed' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-800">
              Scraping completed successfully! Found and processed {currentProgress.progress} leads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapingProgress;
