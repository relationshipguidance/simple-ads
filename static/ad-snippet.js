(function() {
  // 1. Find all elements with class "bidfree-slot"
  var slots = document.querySelectorAll('.bidfree-slot');

  if (slots.length === 0) return;

  // 2. Auto-detect page context (title + meta keywords + first heading)
  var context = document.title + ' ' +
                (document.querySelector('meta[name="keywords"]')?.content || '') + ' ' +
                (document.querySelector('h1')?.innerText || '');

  // 3. Ask our ad server for ads matching this context
  fetch('https://https://simple-ads.onrender.com.onrender.com/api/serve?context=' +
        encodeURIComponent(context) + '&n=' + slots.length)
    .then(function(res) { return res.json(); })
    .then(function(ads) {
      // 4. Render each ad into its slot
      slots.forEach(function(slot, i) {
        if (!ads[i]) return;
        var ad = ads[i];
        slot.innerHTML = `
          <div style="border:1px solid #ddd;padding:12px;border-radius:8px;margin:10px 0;font-family:sans-serif;">
            <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px;">Sponsored</div>
            <div style="font-size:16px;font-weight:bold;margin:6px 0;color:#333;">${ad.title}</div>
            <div style="font-size:13px;color:#555;">${ad.body}</div>
            <a href="https://https://simple-ads.onrender.com.onrender.com/click/${ad.id}"
               target="_blank"
               style="display:inline-block;margin-top:8px;font-size:12px;color:#0066cc;">
               Learn more →
            </a>
          </div>
        `;
      });
    })
    .catch(function(err) { console.log('BidFree Ads:', err); });
})();
