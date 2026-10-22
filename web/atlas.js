const roman=['I','II','III','IV'];
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** A spatial table of contents. Every portal leads to an original book chapter. */
export function mountAtlas({root,groups,pages,icon,hydrateIcons}){
  let selected=0;
  const partRoutes=['parts/the-semantic-view.html','parts/design-by-meaning-in-rust.html','parts/concepts.html','parts/insights.html'];
  const descriptions=[
    'Start with what a program means. Explore denotations, compositionality, laws, and the relationship between meaning and representation.',
    'Give meaning a concrete vocabulary. Explore capability traits, derived operations, interpreters, evidence, and compiler pipelines in Rust.',
    'Look beneath the surface of a program. Explore the structures and transformations that connect ideas to execution.',
    'Return to familiar ideas with a new perspective. Follow the connections between the semantic view and real programming machinery.'
  ];
  root.innerHTML=`<div class="atlas-heading"><div><div class="section-label"><span></span>THE CHAPTER ATLAS</div><h1>A world of ideas.</h1></div><p>Choose a world.<br>Follow an idea as far as it takes you.</p><a href="/contents.html" class="atlas-list-link">Browse as a list ${icon('arrow-right')}</a></div><div class="atlas-experience"><div class="atlas-map" aria-label="Interactive chapter map"><svg class="atlas-route" viewBox="0 0 800 600" aria-hidden="true"><path d="M235 120 C550 0 700 100 640 250 S470 480 330 460 S80 540 120 330 S200 250 235 120"/><ellipse cx="400" cy="300" rx="310" ry="220"/></svg><span class="atlas-star star-a" aria-hidden="true">✦</span><span class="atlas-star star-b" aria-hidden="true">✦</span><span class="atlas-star star-c" aria-hidden="true">+</span><span class="atlas-map-note">⟦ parts ⟧ → whole</span>${groups.map((g,i)=>`<button class="atlas-node node-${i}" data-world="${i}" aria-label="Explore ${escape(g.title)}" aria-pressed="${i===0}"><span class="atlas-node-number">${roman[i]}</span><img src="/art/world-${i}.webp" width="543" height="724" alt="" draggable="false"><span class="atlas-node-title">${escape(g.title)}</span><span class="atlas-node-dot"></span></button>`).join('')}<div class="atlas-navigation"><button class="icon-button" id="atlas-prev" aria-label="Previous world">${icon('arrow-left')}</button><span id="atlas-position">01 / 04</span><button class="icon-button" id="atlas-next" aria-label="Next world">${icon('arrow-right')}</button></div></div><section class="atlas-detail" id="atlas-detail" aria-live="polite" aria-atomic="true"></section></div>`;
  function select(n){
    selected=(n+4)%4;
    root.querySelectorAll('[data-world]').forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));});
    const g=groups[selected];
    root.querySelector('#atlas-position').textContent=`0${selected+1} / 04`;
    const detail=root.querySelector('#atlas-detail');
    detail.innerHTML=`<span class="atlas-part">PART ${roman[selected]}</span><h2>${escape(g.title)}</h2><p>${descriptions[selected]}</p><div class="atlas-chapter-list">${g.pages.map((slug,i)=>{const p=pages.find(p=>p.slug===slug);return `<a href="/${slug}"><span>${String(i+1).padStart(2,'0')}</span>${escape(p.title)}${icon('arrow-up-right')}</a>`;}).join('')}</div><a href="/${partRoutes[selected]}" class="button primary">Enter this world ${icon('arrow-right')}</a>`;
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches)detail.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
    hydrateIcons();
  }
  root.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>select(Number(b.dataset.world)));
  root.querySelector('#atlas-prev').onclick=()=>select(selected-1);
  root.querySelector('#atlas-next').onclick=()=>select(selected+1);
  root.querySelector('.atlas-map').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));root.querySelector(`[data-world="${selected}"]`).focus();}});
  select(0);
}
