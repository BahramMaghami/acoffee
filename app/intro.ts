export const introStorageKey = 'acoffee:intro:v1'

// Run before the first paint. Without JavaScript or session storage the site
// stays visible. Timers release the overlay even if React never hydrates.
export const introScript = `(function(){
  try {
    if(location.pathname!=='/' || location.hash || matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem('${introStorageKey}')) return;
    sessionStorage.setItem('${introStorageKey}','seen');
    var root=document.documentElement;
    root.dataset.intro='drawing';
    var finish=function(){
      if(root.dataset.intro==='drawing') root.dataset.intro='revealing';
      setTimeout(function(){delete root.dataset.intro},700);
    };
    var key=function(event){if(event.key==='Escape')finish()};
    document.addEventListener('keydown',key);
    setTimeout(finish,2200);
    setTimeout(function(){delete root.dataset.intro;document.removeEventListener('keydown',key)},3200);
  } catch(e) {delete document.documentElement.dataset.intro}
})()`
