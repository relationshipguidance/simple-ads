(function() {
  var slots = document.querySelectorAll('.bidfree-slot');
  if (slots.length === 0) return;

  var context = document.title + ' ' +
                (document.querySelector('meta[name="keywords"]')?.content || '') + ' ' +
                (document.querySelector('h1')?.innerText || '');

  fetch('https://simple-ads.onrender.com/api/serve?context=' +
        encodeURIComponent(context) + '&n=' + slots.length)
    .then(function(res) { return res.json(); })
    .then(function(ads) {
      slots.forEach(function(slot, i) {
        if (!ads[i]) {
          slot.innerHTML = '<div style="padding:12px;border:1px dashed #ccc;color:#999;font-size:12px;">Ad slot available</div>';
          return;
        }
        var ad = ads[i];
        slot.innerHTML = `
          <div style="border:1px solid #ddd;padding:14px;border-radius:8px;margin:12px 0;font-family:sans-serif;background:#fffef7;">
            <div style="font-size:10px;color:#a16207;text-transform:uppercase;letter-spacing:1px;">Sponsored</div>
            <div style="font-size:16px;font-weight:bold;margin:6px 0;color:#333;">${ad.title}</div>
            <div style="font-size:13px;color:#555;margin-bottom:8px;">${ad.body}</div>
            <a href="https://simple-ads.onrender.com/static/lead-form.html?ad_id=${ad.id}"
               target="_blank"
               style="display:inline-block;font-size:13px;color:#4f46e5;font-weight:600;text-decoration:none;">
               Enquire Now →
            </a>
          </div>
        `;
      });
    })
    .catch(function(err) { console.log('BidFree Ads:', err); });
})();
