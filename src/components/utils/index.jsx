/**
 * Utility functions for the app
 */

/**
 * Creates a page URL with proper routing
 * @param {string} pageName - Name of the page
 * @param {object} params - Optional URL parameters
 * @returns {string} - The constructed URL
 */
export function createPageUrl(pageName, params = {}) {
  try {
    if (!pageName || typeof pageName !== 'string') {
      console.warn('[createPageUrl] Invalid page name:', pageName);
      return '/dashboard';
    }

    let url = `/${pageName}`;
    
    // Add query parameters if provided
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  } catch (error) {
    console.error('[createPageUrl] Error creating URL:', error);
    return '/dashboard';
  }
}

/**
 * Safe function to get URL parameters
 * @param {string} param - Parameter name
 * @returns {string|null} - Parameter value or null
 */
export function getUrlParam(param) {
  try {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  } catch (error) {
    console.error('[getUrlParam] Error getting URL parameter:', error);
    return null;
  }
}

/**
 * Safe function to update URL parameters without page reload
 * @param {object} params - Parameters to update
 */
export function updateUrlParams(params) {
  try {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    });
    
    window.history.replaceState({}, '', url);
  } catch (error) {
    console.error('[updateUrlParams] Error updating URL parameters:', error);
  }
}

export default { createPageUrl, getUrlParam, updateUrlParams };