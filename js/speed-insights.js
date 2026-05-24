// Vercel Speed Insights initialization
// This script injects the Speed Insights tracking code
(function() {
  // Initialize Speed Insights queue
  window.si = window.si || function () { 
    (window.siq = window.siq || []).push(arguments); 
  };

  // Load the Speed Insights script from Vercel's CDN
  // The script will automatically track Web Vitals and performance metrics
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Fallback: If the Vercel script doesn't load (e.g., not deployed on Vercel yet),
  // gracefully handle it without errors
  script.onerror = function() {
    console.log('Speed Insights: Script not loaded (expected in development or non-Vercel deployments)');
  };
  
  document.head.appendChild(script);
})();
