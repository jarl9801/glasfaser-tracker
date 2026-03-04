import { useEffect } from 'react'

/**
 * Handle SPA redirect from 404.html for GitHub Pages
 */
export function useRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      // Remove the redirect param and navigate to the path
      const newUrl = window.location.pathname.replace(/\?.*$/, '') + redirect
      window.history.replaceState(null, '', newUrl)
    }
  }, [])
}
