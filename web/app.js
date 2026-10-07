window.addEventListener('DOMContentLoaded',()=>{
 try{new PagefindUI({element:'#search',showSubResults:false,showImages:false,pageSize:6,resetStyles:false,translations:{placeholder:'试试「学习规划」「拼写」或讲稿中的关键词…'}});}catch{document.querySelector('#search').textContent='搜索暂时无法加载，请使用下方内容目录。';}
 const rows=[...document.querySelectorAll('.library-row')];
 const status=document.querySelector('#filter-status');
 function filter(value){let count=0;for(const row of rows){row.hidden=value!=='全部'&&!row.dataset.tags.split(' ').includes(value);if(!row.hidden)count++;}status.textContent=`${count} 条内容`;}
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});filter(button.dataset.filter);}));
 document.querySelector('#sort').addEventListener('change',e=>{const sorted=[...rows];if(e.target.value==='title')sorted.sort((a,b)=>a.querySelector('strong').textContent.localeCompare(b.querySelector('strong').textContent,'zh'));document.querySelector('#rows').replaceChildren(...sorted);});filter('全部');
 document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();document.querySelector('#search input')?.focus();}});
});
