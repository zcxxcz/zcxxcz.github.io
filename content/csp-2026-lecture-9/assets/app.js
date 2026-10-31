
(function(){
  var data = window.__SLIDES__ || [];
  var lb = document.getElementById('lb');
  var img = document.getElementById('lb-img');
  var ttl = document.getElementById('lb-ttl');
  var sub = document.getElementById('lb-sub');
  var cur = 0;
  function show(i){
    cur = (i + data.length) % data.length;
    var d = data[cur];
    img.src = d.img; img.alt = d.title;
    ttl.textContent = 'P' + String(d.no).padStart(2,'0') + '　' + d.title;
    sub.textContent = d.sub + '　·　讲解 ' + d.time + (d.note ? '　·　' + d.note : '');
  }
  function open(i){ show(i); lb.classList.add('on'); document.body.style.overflow='hidden'; }
  function close(){ lb.classList.remove('on'); document.body.style.overflow=''; }
  document.querySelectorAll('[data-slide]').forEach(function(el){
    el.addEventListener('click', function(){ open(+el.getAttribute('data-slide')); });
  });
  document.getElementById('lb-prev').addEventListener('click', function(e){ e.stopPropagation(); show(cur-1); });
  document.getElementById('lb-next').addEventListener('click', function(e){ e.stopPropagation(); show(cur+1); });
  document.getElementById('lb-close').addEventListener('click', close);
  lb.addEventListener('click', function(e){ if(e.target === lb) close(); });
  document.addEventListener('keydown', function(e){
    if(!lb.classList.contains('on')) return;
    if(e.key === 'Escape') close();
    if(e.key === 'ArrowLeft') show(cur-1);
    if(e.key === 'ArrowRight') show(cur+1);
  });
  // TOC 高亮
  var links = [].slice.call(document.querySelectorAll('.toc a'));
  var targets = links.map(function(a){ return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if(targets.length){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(en.isIntersecting){
          links.forEach(function(l){ l.style.color=''; l.style.fontWeight=''; });
          var l = links[targets.indexOf(en.target)];
          if(l){ l.style.color='var(--accent)'; l.style.fontWeight='700'; }
        }
      });
    }, {rootMargin:'-10% 0px -70% 0px'});
    targets.forEach(function(t){ io.observe(t); });
  }
})();
