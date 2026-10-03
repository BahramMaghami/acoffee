export type Theme = 'light' | 'dark'
export const themeStorageKey = 'acoffee:theme'
export const defaultTheme: Theme = 'dark'

// Runs synchronously in the head, before the saved palette can flash on screen.
export const themeScript = `(function(){var t='${defaultTheme}';try{var saved=localStorage.getItem('${themeStorageKey}');if(saved==='light'||saved==='dark')t=saved}catch(e){}document.documentElement.dataset.theme=t})()`
