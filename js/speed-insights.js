/**
 * Vercel Speed Insights Integration
 * Automatically tracks web vitals and performance metrics
 * 
 * This script initializes Vercel Speed Insights for performance monitoring.
 * When deployed to Vercel, it automatically collects and reports Web Vitals.
 * 
 * Documentation: https://vercel.com/docs/speed-insights/quickstart
 */

(function() {
  'use strict';
  
  // Initialize Speed Insights queue
  window.si = window.si || function () { 
    (window.siq = window.siq || []).push(arguments); 
  };
  
  // Load the Speed Insights script
  // This path is automatically configured when deployed to Vercel
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Handle script load errors gracefully
  script.onerror = function() {
    console.warn('Vercel Speed Insights: Script could not be loaded. This is expected in local development. Speed Insights will work when deployed to Vercel.');
  };
  
  // For development environments, we can optionally enable debug mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('Vercel Speed Insights: Initialized (will only track in production on Vercel)');
  }
  
  document.head.appendChild(script);
})();
