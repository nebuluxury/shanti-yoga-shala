(function(){
  "use strict";

  /* ---- mobile nav ---- */
  var ham = document.getElementById('hamburger');
  var nav = document.getElementById('nav');
  if(nav && ham){
    // backdrop scrim (tap outside to close)
    var scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);

    // close (X) button, wrapped in a header row (same flow pattern as .nav-extra)
    var head = document.createElement('div');
    head.className = 'nav-head';
    head.innerHTML = '<button class="nav-close" aria-label="Close menu">&times;</button>';
    nav.insertBefore(head, nav.firstChild);
    var close = head.querySelector('.nav-close');

    // CTA + contact block
    var extra = document.createElement('div');
    extra.className = 'nav-extra';
    extra.innerHTML =
      '<a href="index.html#schedule" class="btn btn-solid">Book a Class</a>' +
      '<div class="nav-contact">' +
        '<strong>Palm Beach Gardens</strong>' +
        '<a href="tel:15614443280">(561) 444-3280</a>' +
        '<a href="sms:15613732406">Text (561) 373-2406</a>' +
      '</div>';
    nav.appendChild(extra);

    function openNav(){ nav.classList.add('open'); scrim.classList.add('show'); document.body.style.overflow='hidden'; }
    function closeNav(){ nav.classList.remove('open'); scrim.classList.remove('show'); document.body.style.overflow=''; }

    ham.addEventListener('click', openNav);
    close.addEventListener('click', closeNav);
    scrim.addEventListener('click', closeNav);
    nav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeNav(); });
  }

  /* ---- hero image (loads generated art if present, else keeps gradient) ---- */
  (function(){
    var el = document.getElementById('heroMedia');
    if(!el) return;
    var img = new Image();
    img.onload = function(){ el.style.backgroundImage = "url('assets/hero.jpg')"; el.classList.add('loaded'); };
    img.src = 'assets/hero.jpg';
    var about = document.getElementById('aboutMedia');
    if(about){ var i2=new Image(); i2.onload=function(){ about.style.backgroundImage="url('assets/studio.jpg')"; }; i2.src='assets/studio.jpg'; }
  })();

  /* ---- schedule (stand-in for the live MindBody widget) ---- */
  var WEEK = [
    {name:'Mon', date:'Jul 13', classes:[
      {t:'9:15a', dur:'75 min', cl:'Yoga Basics', te:'with Maya', spots:6},
      {t:'12:00p', dur:'60 min', cl:'Yin & Gentle', te:'with Priya', spots:9},
      {t:'6:00p', dur:'75 min', cl:'Ashtanga Vinyasa', te:'with David', spots:0}
    ]},
    {name:'Tue', date:'Jul 14', classes:[
      {t:'9:15a', dur:'75 min', cl:'Art of Alignment · Iyengar', te:'with Maya', spots:4},
      {t:'5:30p', dur:'75 min', cl:'Shanti Vinyasa', te:'with David', spots:11}
    ]},
    {name:'Wed', date:'Jul 15', classes:[
      {t:'9:15a', dur:'75 min', cl:'Yoga Basics', te:'with Priya', spots:8},
      {t:'12:00p', dur:'60 min', cl:'Yin & Gentle', te:'with Maya', spots:5},
      {t:'6:00p', dur:'75 min', cl:'Ashtanga Vinyasa', te:'with David', spots:2}
    ]},
    {name:'Thu', date:'Jul 16', classes:[
      {t:'9:15a', dur:'75 min', cl:'Art of Alignment · Iyengar', te:'with Maya', spots:7},
      {t:'7:00p', dur:'60 min', cl:'Sound Bath', te:'with Priya', spots:1}
    ]},
    {name:'Fri', date:'Jul 17', classes:[
      {t:'9:15a', dur:'75 min', cl:'Shanti Vinyasa', te:'with David', spots:10},
      {t:'4:30p', dur:'60 min', cl:'Yin & Gentle', te:'with Maya', spots:12}
    ]},
    {name:'Sat', date:'Jul 18', classes:[
      {t:'8:30a', dur:'90 min', cl:'Ashtanga Vinyasa', te:'with David', spots:3},
      {t:'10:30a', dur:'75 min', cl:'Yoga Basics', te:'with Priya', spots:6},
      {t:'5:00p', dur:'60 min', cl:'Sound Bath', te:'with Maya', spots:0}
    ]},
    {name:'Sun', date:'Jul 19', classes:[
      {t:'10:00a', dur:'75 min', cl:'Yin & Gentle', te:'with Priya', spots:8}
    ]}
  ];

  var daysEl = document.getElementById('schedDays');
  var listEl = document.getElementById('schedList');
  if(!daysEl || !listEl) return;

  function renderList(i){
    var day = WEEK[i];
    if(!day.classes.length){ listEl.innerHTML = '<p class="sched-empty">No classes scheduled - rest is part of the practice.</p>'; return; }
    listEl.innerHTML = day.classes.map(function(c){
      var right = c.spots === 0
        ? '<span class="sr-full">Waitlist</span>'
        : '<a class="btn btn-solid sr-book" href="#" onclick="return false;">Book · '+c.spots+' left</a>';
      return '<div class="sched-row">'+
        '<div class="sr-time"><span class="t">'+c.t+'</span><span class="dur">'+c.dur+'</span></div>'+
        '<div class="sr-main"><div class="cl">'+c.cl+'</div><div class="te">'+c.te+'</div></div>'+
        right+'</div>';
    }).join('');
  }

  daysEl.innerHTML = WEEK.map(function(d,i){
    return '<button class="sched-day'+(i===0?' active':'')+'" data-i="'+i+'" role="tab">'+
      '<span class="d-name">'+d.name+'</span><span class="d-date">'+d.date+'</span></button>';
  }).join('');

  daysEl.addEventListener('click',function(e){
    var btn = e.target.closest('.sched-day'); if(!btn) return;
    daysEl.querySelectorAll('.sched-day').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    renderList(parseInt(btn.getAttribute('data-i'),10));
  });

  renderList(0);
})();
