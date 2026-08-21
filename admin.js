const SUPABASE_URL = 'https://yvuljyujtrycwoxhnzyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jCR-jZAEWg3d1rNRcOiV3A_23F-knpG';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let orders = [];
const $ = id => document.getElementById(id);
const wrap = $('orders');
const empty = $('empty');
const modal = $('detailModal');

function money(n){return '₹'+Number(n||0).toLocaleString('en-IN')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function statusClass(status){return 'status-'+String(status||'new').toLowerCase().replace(/[^a-z]+/g,'-')}
function formatDate(value){if(!value)return'—';const d=new Date(value);return d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__aeToast);window.__aeToast=setTimeout(()=>el.classList.remove('show'),2200)}

function showLogin(){
  document.body.insertAdjacentHTML('beforeend',`
    <div id="adminLogin" class="admin-login">
      <form id="adminLoginForm">
        <p class="login-kicker">ATTITUDE EMPIRE / SECURE ACCESS</p>
        <h2>ADMIN LOGIN</h2>
        <label>EMAIL</label>
        <input id="adminEmail" type="email" required autocomplete="email">
        <label>PASSWORD</label>
        <input id="adminPassword" type="password" required autocomplete="current-password">
        <p id="loginError" class="login-error"></p>
        <button type="submit" id="loginBtn">LOGIN TO ORDER MANAGER</button>
      </form>
    </div>`);

  $('adminLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const button=$('loginBtn'),errorBox=$('loginError');
    button.disabled=true;button.textContent='SIGNING IN…';errorBox.style.display='none';
    const {error}=await db.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});
    if(error){errorBox.textContent='Login failed. Check your email and password.';errorBox.style.display='block';button.disabled=false;button.textContent='LOGIN TO ORDER MANAGER';return}
    $('adminLogin').remove();addLogoutButton();await loadOrders();
  });
}

function addLogoutButton(){
  if($('logoutBtn'))return;
  const headerRight=document.querySelector('.header-meta');if(!headerRight)return;
  const button=document.createElement('button');button.id='logoutBtn';button.textContent='LOG OUT';
  button.onclick=async()=>{await db.auth.signOut();location.reload()};headerRight.appendChild(button);
}

function convertOrder(row){
  const nameParts=String(row.customer_name||'').trim().split(/\s+/);
  return{databaseId:row.id,id:row.order_id,createdAt:row.created_at,updatedAt:row.updated_at,status:row.order_status||'New',payment:row.payment_method||'COD',paymentStatus:row.payment_status||'Pending',customer:{firstName:nameParts[0]||'',lastName:nameParts.slice(1).join(' '),phone:row.phone||'',email:row.email||'',address:row.address||'',city:row.city||'',state:row.state||'',pincode:row.pincode||''},items:Array.isArray(row.products)?row.products:[],subtotal:Number(row.subtotal||0),shipping:Number(row.delivery_charge||0),discount:Math.max(0,Number(row.subtotal||0)+Number(row.delivery_charge||0)-Number(row.total_amount||0)),total:Number(row.total_amount||0),notes:row.notes||''};
}

async function loadOrders(){
  empty.textContent='Loading live orders…';empty.style.display='block';wrap.innerHTML='';
  const refresh=$('refreshBtn');if(refresh){refresh.disabled=true;refresh.textContent='SYNCING…'}
  const {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false});
  if(refresh){refresh.disabled=false;refresh.textContent='REFRESH'}
  if(error){console.error(error);empty.textContent='Unable to load orders. Please refresh or sign in again.';empty.style.display='block';return}
  orders=(data||[]).map(convertOrder);const sync=$('lastSync');if(sync)sync.textContent='Last synced '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});render();
}

function stats(){
  const active=orders.filter(o=>o.status!=='Cancelled');
  $('statOrders').textContent=orders.length;
  $('statRevenue').textContent=money(active.reduce((a,o)=>a+Number(o.total||0),0));
  $('statNew').textContent=orders.filter(o=>['New','Confirmed'].includes(o.status)).length;
  $('statShipped').textContent=orders.filter(o=>o.status==='Shipped').length;
  $('statDelivered').textContent=orders.filter(o=>o.status==='Delivered').length;
}

function render(){
  stats();
  const q=$('search').value.toLowerCase().trim(),f=$('statusFilter').value;
  const shown=orders.filter(o=>{const hay=[o.id,o.customer.firstName,o.customer.lastName,o.customer.phone,o.customer.email].join(' ').toLowerCase();return hay.includes(q)&&(f==='all'||o.status===f)});
  empty.style.display=shown.length?'none':'block';if(!shown.length)empty.textContent=orders.length?'No orders match your current search or filter.':'No orders have been received yet.';
  wrap.innerHTML='';
  shown.forEach(o=>{
    const el=document.createElement('article');el.className='order';
    el.innerHTML=`
      <div><small>ORDER ID</small><strong>${esc(o.id)}</strong><span class="muted">${esc(formatDate(o.createdAt))}</span></div>
      <div><small>CUSTOMER</small><strong>${esc(`${o.customer.firstName} ${o.customer.lastName}`.trim())}</strong><span class="muted">${esc(o.customer.phone)}</span></div>
      <div class="payment-cell"><small>PAYMENT</small><strong>${esc(o.payment)}</strong><span class="muted">${esc(o.paymentStatus)}</span></div>
      <div><small>TOTAL</small><strong>${money(o.total)}</strong></div>
      <div><small>STATUS</small><span class="status ${statusClass(o.status)}">${esc(o.status)}</span></div>
      <button>VIEW ORDER</button>`;
    el.querySelector('button').onclick=()=>details(o.id);wrap.appendChild(el);
  });
}

function details(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  const address=[o.customer.address,o.customer.city,o.customer.state,o.customer.pincode].filter(Boolean).join(', ');
  const itemHTML=o.items.length?o.items.map(x=>`<div class="item"><span>${esc(x.product||'Product')}<br><small>${esc([x.code,x.colour,x.size?`Size ${x.size}`:''].filter(Boolean).join(' · '))}</small></span><strong>${money(x.price)}</strong></div>`).join(''):'<p>No product information available.</p>';
  $('detail').innerHTML=`
    <div class="detail-head"><p>ATTITUDE EMPIRE / ORDER DETAILS</p><h2>${esc(o.id)}</h2><div class="detail-meta"><span class="status ${statusClass(o.status)}">${esc(o.status)}</span><span class="meta-chip">${esc(o.payment)}</span><span class="meta-chip">${esc(o.paymentStatus)}</span><span class="meta-chip">${esc(formatDate(o.createdAt))}</span></div></div>
    <div class="detail-grid"><div class="detail-block"><b>CUSTOMER</b>${esc(`${o.customer.firstName} ${o.customer.lastName}`.trim())}<br>${esc(o.customer.phone)}<br>${esc(o.customer.email||'No email provided')}</div><div class="detail-block"><b>DELIVERY ADDRESS</b>${esc(address)}</div></div>
    <div class="items"><b>ORDER ITEMS</b>${itemHTML}</div>
    <div class="totals"><div class="total-line"><span>Subtotal</span><b>${money(o.subtotal)}</b></div><div class="total-line"><span>Shipping</span><b>${o.shipping?money(o.shipping):'FREE'}</b></div>${o.discount?`<div class="total-line"><span>Discount</span><b>−${money(o.discount)}</b></div>`:''}<div class="total-line grand"><span>${esc(o.payment==='COD'?'COD TOTAL':'ORDER TOTAL')}</span><b>${money(o.total)}</b></div></div>
    ${o.notes?`<div class="notes"><strong>ORDER NOTE</strong><br>${esc(o.notes)}</div>`:''}
    <div class="status-control"><select id="editStatus">${['New','Confirmed','Packed','Shipped','Delivered','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select><button id="saveStatus">UPDATE STATUS</button></div>
    <a class="wa" target="_blank" rel="noopener" href="https://wa.me/91${encodeURIComponent(o.customer.phone)}?text=${encodeURIComponent(`Hi ${o.customer.firstName}, your ATTITUDE EMPIRE order ${o.id} is currently ${o.status}.`)}">MESSAGE CUSTOMER</a>`;

  $('saveStatus').onclick=async()=>{
    const newStatus=$('editStatus').value,button=$('saveStatus');button.disabled=true;button.textContent='UPDATING…';
    const {error}=await db.from('orders').update({order_status:newStatus,updated_at:new Date().toISOString()}).eq('id',o.databaseId);
    if(error){console.error(error);alert('Could not update order status.');button.disabled=false;button.textContent='UPDATE STATUS';return}
    o.status=newStatus;o.updatedAt=new Date().toISOString();render();details(id);toast(`Order ${o.id} updated to ${newStatus}`);
  };
  modal.classList.add('active');modal.setAttribute('aria-hidden','false');
}

$('closeModal').onclick=()=>{modal.classList.remove('active');modal.setAttribute('aria-hidden','true')};
modal.onclick=e=>{if(e.target===modal){modal.classList.remove('active');modal.setAttribute('aria-hidden','true')}};
$('search').oninput=render;$('statusFilter').onchange=render;$('refreshBtn').onclick=loadOrders;

$('exportBtn').onclick=()=>{
  if(!orders.length)return alert('No orders to export.');
  const rows=[['Order ID','Date','Customer','Phone','Email','Address','Items','Subtotal','Shipping','Discount','Total','Payment','Payment Status','Order Status']];
  orders.forEach(o=>rows.push([o.id,o.createdAt||'',`${o.customer.firstName} ${o.customer.lastName}`.trim(),o.customer.phone,o.customer.email,[o.customer.address,o.customer.city,o.customer.state,o.customer.pincode].filter(Boolean).join(', '),o.items.map(x=>[x.code,x.product,x.colour,x.size].filter(Boolean).join(' ')).join(' | '),o.subtotal,o.shipping,o.discount,o.total,o.payment,o.paymentStatus,o.status]));
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='attitude-empire-orders.csv';a.click();URL.revokeObjectURL(a.href);toast('CSV export created');
};

async function startAdmin(){
  const {data:{session}}=await db.auth.getSession();if(!session){showLogin();return}addLogoutButton();await loadOrders();
}

startAdmin();
