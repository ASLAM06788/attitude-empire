const SUPABASE_URL = 'https://yvuljyujtrycwoxhnzyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jCR-jZAEWg3d1rNRcOiV3A_23F-knpG';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let orders = [];

const $ = id => document.getElementById(id);
const wrap = $('orders');
const empty = $('empty');
const modal = $('detailModal');

function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

function showLogin() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="adminLogin" style="
      position:fixed;
      inset:0;
      z-index:9999;
      background:#0b0b0b;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      font-family:Montserrat,sans-serif;
    ">
      <form id="adminLoginForm" style="
        width:100%;
        max-width:420px;
        background:#151515;
        border:1px solid #333;
        padding:35px;
        color:white;
      ">
        <p style="font-size:11px;letter-spacing:2px;color:#999;">
          ATTITUDE EMPIRE / SECURE ACCESS
        </p>

        <h2 style="font-size:32px;margin:10px 0 25px;">
          ADMIN LOGIN
        </h2>

        <label style="font-size:12px;">EMAIL</label>
        <input
          id="adminEmail"
          type="email"
          required
          autocomplete="email"
          style="
            width:100%;
            box-sizing:border-box;
            margin:8px 0 18px;
            padding:14px;
            background:#0b0b0b;
            border:1px solid #444;
            color:white;
          "
        >

        <label style="font-size:12px;">PASSWORD</label>
        <input
          id="adminPassword"
          type="password"
          required
          autocomplete="current-password"
          style="
            width:100%;
            box-sizing:border-box;
            margin:8px 0 18px;
            padding:14px;
            background:#0b0b0b;
            border:1px solid #444;
            color:white;
          "
        >

        <p id="loginError" style="
          display:none;
          color:#ff7b7b;
          font-size:12px;
          margin-bottom:15px;
        "></p>

        <button
          type="submit"
          id="loginBtn"
          style="
            width:100%;
            padding:15px;
            background:white;
            color:black;
            border:0;
            font-weight:800;
            cursor:pointer;
          "
        >
          LOGIN TO ORDER MANAGER
        </button>
      </form>
    </div>
  `);

  $('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();

    const button = $('loginBtn');
    const errorBox = $('loginError');

    button.disabled = true;
    button.textContent = 'SIGNING IN...';
    errorBox.style.display = 'none';

    const email = $('adminEmail').value.trim();
    const password = $('adminPassword').value;

    const { error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorBox.textContent = 'Login failed. Check your email and password.';
      errorBox.style.display = 'block';
      button.disabled = false;
      button.textContent = 'LOGIN TO ORDER MANAGER';
      return;
    }

    $('adminLogin').remove();
    addLogoutButton();
    await loadOrders();
  });
}

function addLogoutButton() {
  if ($('logoutBtn')) return;

  const headerRight = document.querySelector('header > div');

  if (!headerRight) return;

  const button = document.createElement('button');
  button.id = 'logoutBtn';
  button.textContent = 'LOG OUT';
  button.style.marginTop = '8px';
  button.style.padding = '7px 12px';
  button.style.cursor = 'pointer';

  button.onclick = async () => {
    await db.auth.signOut();
    location.reload();
  };

  headerRight.appendChild(button);
}

function convertOrder(row) {
  const nameParts = String(row.customer_name || '').trim().split(/\s+/);

  return {
    databaseId: row.id,
    id: row.order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    status: row.order_status || 'New',

    payment: row.payment_method || 'COD',
    paymentStatus: row.payment_status || 'Pending',

    customer: {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      address2: '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || ''
    },

    items: Array.isArray(row.products) ? row.products : [],

    subtotal: Number(row.subtotal || 0),
    shipping: Number(row.delivery_charge || 0),
    discount: 0,
    total: Number(row.total_amount || 0),

    notes: row.notes || ''
  };
}

async function loadOrders() {
  empty.textContent = 'Loading orders...';
  empty.style.display = 'block';

  const { data, error } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    empty.textContent = 'Unable to load orders.';
    empty.style.display = 'block';
    return;
  }

  orders = (data || []).map(convertOrder);

  render();
}

function stats() {
  const active = orders.filter(o => o.status !== 'Cancelled');

  const revenue = active.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  $('statOrders').textContent = orders.length;
  $('statRevenue').textContent = money(revenue);

  $('statNew').textContent = orders.filter(
    o => ['New', 'Confirmed'].includes(o.status)
  ).length;

  $('statDelivered').textContent = orders.filter(
    o => o.status === 'Delivered'
  ).length;
}

function render() {
  stats();

  const q = $('search').value.toLowerCase().trim();
  const filter = $('statusFilter').value;

  const shown = orders.filter(o => {
    const haystack = [
      o.id,
      o.customer.firstName,
      o.customer.lastName,
      o.customer.phone,
      o.customer.email
    ].join(' ').toLowerCase();

    return (
      haystack.includes(q) &&
      (filter === 'all' || o.status === filter)
    );
  });

  empty.style.display = shown.length ? 'none' : 'block';

  if (!shown.length) {
    empty.textContent = orders.length
      ? 'No orders match your search.'
      : 'No orders have been received yet.';
  }

  wrap.innerHTML = '';

  shown.forEach(o => {
    const el = document.createElement('article');
    el.className = 'order';

    el.innerHTML = `
      <div>
        <small>ORDER ID</small>
        <strong>${esc(o.id)}</strong>
      </div>

      <div>
        <small>CUSTOMER</small>
        <strong>
          ${esc(
            `${o.customer.firstName} ${o.customer.lastName}`.trim()
          )}
        </strong>
      </div>

      <div>
        <small>TOTAL</small>
        <strong>${money(o.total)}</strong>
      </div>

      <div>
        <small>STATUS</small>
        <span class="status">${esc(o.status)}</span>
      </div>

      <button>VIEW ORDER</button>
    `;

    el.querySelector('button').onclick = () => details(o.id);

    wrap.appendChild(el);
  });
}

function details(id) {
  const o = orders.find(x => x.id === id);

  if (!o) return;

  const address = [
    o.customer.address,
    o.customer.city,
    o.customer.state,
    o.customer.pincode
  ].filter(Boolean).join(', ');

  const itemHTML = o.items.length
    ? o.items.map(x => `
        <div class="item">
          <span>
            ${esc(x.product || 'Product')}
            <br>
            <small>
              ${esc(
                [
                  x.code,
                  x.colour,
                  x.size ? `Size ${x.size}` : ''
                ].filter(Boolean).join(' · ')
              )}
            </small>
          </span>

          <strong>${money(x.price)}</strong>
        </div>
      `).join('')
    : '<p>No product information available.</p>';

  $('detail').innerHTML = `
    <div class="detail-head">
      <p>ATTITUDE EMPIRE / COD ORDER</p>
      <h2>${esc(o.id)}</h2>
      <span class="status">${esc(o.status)}</span>
    </div>

    <div class="detail-grid">
      <div class="detail-block">
        <b>CUSTOMER</b>
        ${esc(
          `${o.customer.firstName} ${o.customer.lastName}`.trim()
        )}
        <br>
        ${esc(o.customer.phone)}
        <br>
        ${esc(o.customer.email)}
      </div>

      <div class="detail-block">
        <b>DELIVERY ADDRESS</b>
        ${esc(address)}
      </div>
    </div>

    <div class="items">
      <b>ORDER ITEMS</b>
      ${itemHTML}
    </div>

    <div class="totals">
      <div class="total-line">
        <span>Subtotal</span>
        <b>${money(o.subtotal)}</b>
      </div>

      <div class="total-line">
        <span>Shipping</span>
        <b>${o.shipping ? money(o.shipping) : 'FREE'}</b>
      </div>

      <div class="total-line grand">
        <span>COD TOTAL</span>
        <b>${money(o.total)}</b>
      </div>
    </div>

    <div class="status-control">
      <select id="editStatus">
        ${[
          'New',
          'Confirmed',
          'Packed',
          'Shipped',
          'Delivered',
          'Cancelled'
        ].map(status => `
          <option ${status === o.status ? 'selected' : ''}>
            ${status}
          </option>
        `).join('')}
      </select>

      <button id="saveStatus">
        UPDATE STATUS
      </button>
    </div>

    <a
      class="wa"
      target="_blank"
      rel="noopener"
      href="https://wa.me/91${encodeURIComponent(o.customer.phone)}?text=${encodeURIComponent(
        `Hi ${o.customer.firstName}, ATTITUDE EMPIRE order ${o.id} is currently ${o.status}.`
      )}"
    >
      MESSAGE CUSTOMER
    </a>
  `;

  $('saveStatus').onclick = async () => {
    const newStatus = $('editStatus').value;
    const button = $('saveStatus');

    button.disabled = true;
    button.textContent = 'UPDATING...';

    const { error } = await db
      .from('orders')
      .update({
        order_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', o.databaseId);

    if (error) {
      console.error(error);
      alert('Could not update order status.');

      button.disabled = false;
      button.textContent = 'UPDATE STATUS';

      return;
    }

    o.status = newStatus;
    o.updatedAt = new Date().toISOString();

    render();
    details(id);
  };

  modal.classList.add('active');
}

$('closeModal').onclick = () => {
  modal.classList.remove('active');
};

modal.onclick = e => {
  if (e.target === modal) {
    modal.classList.remove('active');
  }
};

$('search').oninput = render;
$('statusFilter').onchange = render;

$('exportBtn').onclick = () => {
  if (!orders.length) {
    alert('No orders to export.');
    return;
  }

  const rows = [[
    'Order ID',
    'Date',
    'Customer',
    'Phone',
    'Email',
    'Address',
    'Items',
    'Subtotal',
    'Shipping',
    'Total',
    'Payment',
    'Payment Status',
    'Order Status'
  ]];

  orders.forEach(o => {
    rows.push([
      o.id,
      o.createdAt || '',
      `${o.customer.firstName} ${o.customer.lastName}`.trim(),
      o.customer.phone,
      o.customer.email,
      [
        o.customer.address,
        o.customer.city,
        o.customer.state,
        o.customer.pincode
      ].filter(Boolean).join(', '),
      o.items.map(x =>
        [
          x.code,
          x.product,
          x.colour,
          x.size
        ].filter(Boolean).join(' ')
      ).join(' | '),
      o.subtotal,
      o.shipping,
      o.total,
      o.payment,
      o.paymentStatus,
      o.status
    ]);
  });

  const csv = rows
    .map(row =>
      row.map(value =>
        `"${String(value ?? '').replace(/"/g, '""')}"`
      ).join(',')
    )
    .join('\n');

  const blob = new Blob(
    [csv],
    { type: 'text/csv;charset=utf-8' }
  );

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);
  a.download = 'attitude-empire-orders.csv';

  a.click();

  URL.revokeObjectURL(a.href);
};

async function startAdmin() {
  const {
    data: { session }
  } = await db.auth.getSession();

  if (!session) {
    showLogin();
    return;
  }

  addLogoutButton();
  await loadOrders();
}

startAdmin();
