/* ===== PopRush Admin Panel — Core Logic ===== */
(function () {
  'use strict';

  // ─── Auth Guard ───
  function checkAuth() {
    if (localStorage.getItem('poprushAdminAuth') !== 'true') {
      window.location.href = '../index.html';
    }
  }

  // ─── Data Helpers ───
  const PRICES = { Small: 69, Regular: 89, Large: 129 };

  function getOrders() { return JSON.parse(localStorage.getItem('poprushOrders') || '[]'); }
  function saveOrders(o) { localStorage.setItem('poprushOrders', JSON.stringify(o)); }
  function getInventory() { return JSON.parse(localStorage.getItem('poprushInventory') || '[]'); }
  function saveInventory(i) { localStorage.setItem('poprushInventory', JSON.stringify(i)); }
  function getNotifications() { return JSON.parse(localStorage.getItem('poprushNotifications') || '[]'); }
  function saveNotifications(n) { localStorage.setItem('poprushNotifications', JSON.stringify(n)); }

  // ─── Toast ───
  function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.admin-toast');
    existing.forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ─── Modal Helpers ───
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('active'); }
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('active'); }
  }

  // ─── Sidebar Navigation ───
  function initSidebar() {
    const links = document.querySelectorAll('[data-tab]');
    const sections = document.querySelectorAll('[data-section]');
    const pageTitle = document.getElementById('pageTitle');
    const mobileLinks = document.querySelectorAll('[data-mobile-tab]');

    function switchTab(tab) {
      links.forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
      mobileLinks.forEach(l => l.classList.toggle('active', l.dataset.mobileTab === tab));
      sections.forEach(s => {
        s.style.display = s.dataset.section === tab ? 'block' : 'none';
      });
      if (pageTitle) {
        const titles = { overview: 'Dashboard', orders: 'Orders', inventory: 'Inventory', notifications: 'Notifications', settings: 'Settings' };
        pageTitle.textContent = titles[tab] || 'Dashboard';
      }
      // Close sidebar on mobile
      const sidebar = document.getElementById('adminSidebar');
      if (sidebar && window.innerWidth < 1024) {
        sidebar.classList.remove('open');
      }
      // Refresh the section data
      if (tab === 'overview') renderOverview();
      if (tab === 'orders') renderOrders();
      if (tab === 'inventory') renderInventory();
      if (tab === 'notifications') renderNotifications();
    }

    links.forEach(l => l.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(l.dataset.tab);
    }));
    mobileLinks.forEach(l => l.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(l.dataset.mobileTab);
    }));

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }
    if (overlay && sidebar) {
      overlay.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Initialize first tab
    switchTab('overview');
  }

  // ─── Overview / Dashboard ───
  function renderOverview() {
    const orders = getOrders();
    const inventory = getInventory();
    const notifs = getNotifications();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalProducts = inventory.length;
    const unreadNotifs = notifs.filter(n => !n.read).length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('kpiOrders', totalOrders);
    el('kpiRevenue', '₱' + totalRevenue.toLocaleString());
    el('kpiPending', pendingOrders);
    el('kpiProducts', totalProducts);

    // Update notification badges
    document.querySelectorAll('.notif-count').forEach(b => {
      if (unreadNotifs > 0) { b.textContent = unreadNotifs; b.style.display = 'flex'; }
      else { b.style.display = 'none'; }
    });

    // Recent orders table
    const recentEl = document.getElementById('recentOrders');
    if (recentEl) {
      const recent = orders.slice(0, 5);
      if (recent.length === 0) {
        recentEl.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-on-surface-variant">No orders yet</td></tr>';
      } else {
        recentEl.innerHTML = recent.map(o => `
          <tr>
            <td class="font-bold text-secondary">${o.orderId}</td>
            <td>${o.customer.name}</td>
            <td class="hidden sm:table-cell">${o.items.map(i => i.name).join(', ')}</td>
            <td class="font-bold">₱${o.total}</td>
            <td><span class="status-badge ${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
          </tr>
        `).join('');
      }
    }
  }

  // ─── Orders Management ───
  let orderFilter = 'all';

  function renderOrders() {
    const orders = getOrders();
    const filtered = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    // Update filter counts
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('filterAll', orders.length);
    el('filterPending', orders.filter(o => o.status === 'pending').length);
    el('filterProcessing', orders.filter(o => o.status === 'processing').length);
    el('filterDelivered', orders.filter(o => o.status === 'delivered').length);

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-12 text-on-surface-variant">No orders found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((o, i) => `
      <tr>
        <td class="font-bold text-secondary whitespace-nowrap">${o.orderId}</td>
        <td>
          <div class="font-bold text-on-surface">${o.customer.name}</div>
          <div class="text-xs text-on-surface-variant">${o.customer.email}</div>
        </td>
        <td class="hidden md:table-cell text-sm">${o.items.map(item => `${item.name} (${item.size} x${item.qty})`).join(', ')}</td>
        <td class="font-bold whitespace-nowrap">₱${o.total}</td>
        <td><span class="status-badge ${o.status}">${o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span></td>
        <td>
          <div class="flex gap-1 flex-wrap">
            ${o.status === 'pending' ? `<button onclick="window.adminUpdateStatus('${o.orderId}','processing')" class="btn-admin-primary text-xs !py-1 !px-3">Process</button>` : ''}
            ${o.status === 'processing' ? `<button onclick="window.adminUpdateStatus('${o.orderId}','delivered')" class="btn-admin-primary text-xs !py-1 !px-3" style="background:#16a34a">Deliver</button>` : ''}
            ${o.status !== 'cancelled' && o.status !== 'delivered' ? `<button onclick="window.adminUpdateStatus('${o.orderId}','cancelled')" class="btn-admin-danger text-xs !py-1 !px-3">Cancel</button>` : ''}
            <button onclick="window.adminViewOrder('${o.orderId}')" class="btn-admin-secondary text-xs !py-1 !px-3">View</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.adminUpdateStatus = function (orderId, newStatus) {
    const orders = getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      // If moving to processing for the first time, decrement inventory
      if (newStatus === 'processing' && order.status === 'pending') {
        const inventory = getInventory();
        let stockUpdated = false;
        
        order.items.forEach(orderItem => {
          const product = inventory.find(p => p.name === orderItem.name);
          if (product && product.stock) {
            // Check if stock is an object (per-size) or flat number
            if (typeof product.stock === 'object') {
              const size = orderItem.size || 'Regular';
              if (product.stock[size] > 0) {
                product.stock[size] = Math.max(0, product.stock[size] - orderItem.qty);
                stockUpdated = true;
              }
            } else if (product.stock > 0) {
              // Fallback for flat stock
              product.stock = Math.max(0, product.stock - orderItem.qty);
              stockUpdated = true;
            }
          }
        });
        
        if (stockUpdated) {
          saveInventory(inventory);
          renderInventory(); // update the UI
        }
      }

      order.status = newStatus;
      saveOrders(orders);

      // Add notification
      const notifs = getNotifications();
      notifs.unshift({
        id: Date.now(),
        type: 'order',
        title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message: `Order ${orderId} has been ${newStatus}`,
        time: new Date().toLocaleString(),
        read: false
      });
      saveNotifications(notifs);

      renderOrders();
      renderOverview();
      showToast(`Order ${orderId} marked as ${newStatus}`, 'success');
    }
  };

  window.adminViewOrder = function (orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const content = document.getElementById('orderDetailContent');
    if (content) {
      content.innerHTML = `
        <div class="space-y-6">
          <div class="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h3 class="font-headline-md text-xl font-bold text-secondary" style="font-family:Montserrat">${order.orderId}</h3>
              <p class="text-sm text-on-surface-variant">${order.date}</p>
            </div>
            <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-surface-container-low rounded-xl p-4">
              <p class="text-xs font-bold uppercase text-on-surface-variant mb-2" style="font-family:Montserrat">Customer</p>
              <p class="font-bold text-on-surface">${order.customer.name}</p>
              <p class="text-sm text-on-surface-variant">${order.customer.email}</p>
              <p class="text-sm text-on-surface-variant">${order.customer.phone}</p>
            </div>
            <div class="bg-surface-container-low rounded-xl p-4">
              <p class="text-xs font-bold uppercase text-on-surface-variant mb-2" style="font-family:Montserrat">Delivery</p>
              <p class="text-sm text-on-surface">${order.customer.address}</p>
            </div>
          </div>
          <div>
            <p class="text-xs font-bold uppercase text-on-surface-variant mb-3" style="font-family:Montserrat">Items</p>
            <div class="bg-surface-container-low rounded-xl overflow-hidden">
              ${order.items.map(item => `
                <div class="flex justify-between items-center px-4 py-3 border-b border-outline-variant last:border-0">
                  <div>
                    <span class="font-bold text-on-surface">${item.name}</span>
                    <span class="text-xs text-on-surface-variant ml-2">${item.size} x${item.qty}</span>
                  </div>
                  <span class="font-bold text-secondary">₱${(PRICES[item.size] || 89) * item.qty}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="flex justify-between items-center pt-4 border-t border-outline-variant">
            <span class="font-bold text-on-surface-variant uppercase text-sm" style="font-family:Montserrat">Total</span>
            <span class="font-headline-md text-xl font-black text-secondary" style="font-family:Montserrat">₱${order.total}</span>
          </div>
        </div>
      `;
    }
    openModal('orderDetailModal');
  };

  window.adminSetOrderFilter = function (filter) {
    orderFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderOrders();
  };

  // ─── Inventory Management ───
  function renderInventory() {
    const inventory = getInventory();
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    if (inventory.length === 0) {
      grid.innerHTML = '<div class="col-span-full empty-state"><span class="material-symbols-outlined">inventory_2</span><p class="font-bold text-lg">No Products</p><p class="text-sm">Add your first product to get started</p></div>';
      return;
    }

    grid.innerHTML = inventory.map(item => `
      <div class="inventory-card">
        <div class="h-40 bg-surface-container-low flex items-center justify-center overflow-hidden">
          <img src="../../pictures/${item.image}" alt="${item.name}" class="w-full h-full object-cover"
               onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-[48px] text-outline\\'>image</span>'">
        </div>
        <div class="p-4">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-on-surface" style="font-family:Montserrat">${item.name}</h4>
            <span class="status-badge ${item.status === 'active' ? 'delivered' : 'cancelled'} text-[10px]">
              ${item.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p class="text-xs text-on-surface-variant mb-3">${item.description || ''}</p>
          <div class="flex justify-between items-center mb-3">
            <div>
              <span class="text-xs text-on-surface-variant">Stock</span>
              <p class="font-bold ${((typeof item.stock === 'object') ? (item.stock.Small + item.stock.Regular + item.stock.Large) : item.stock) < 50 ? 'text-error' : 'text-on-surface'}">${(typeof item.stock === 'object') ? (item.stock.Small + item.stock.Regular + item.stock.Large) : item.stock} total</p>
            </div>
            <div class="text-right">
              <span class="text-xs text-on-surface-variant">Price (Reg)</span>
              <p class="font-bold text-secondary">₱${item.prices.Regular}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="window.adminEditProduct(${item.id})" class="btn-admin-secondary flex-1 justify-center text-xs !py-2">
              <span class="material-symbols-outlined text-[16px]">edit</span> Edit
            </button>
            <button onclick="window.adminDeleteProduct(${item.id})" class="btn-admin-danger flex-1 justify-center text-xs !py-2">
              <span class="material-symbols-outlined text-[16px]">delete</span> Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.adminShowAddProduct = function () {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    openModal('productModal');
  };

  window.adminEditProduct = function (id) {
    const inventory = getInventory();
    const item = inventory.find(p => p.id === id);
    if (!item) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = item.id;
    document.getElementById('productName').value = item.name;
    document.getElementById('productImage').value = item.image;
    document.getElementById('productDesc').value = item.description || '';
    
    if (typeof item.stock === 'object') {
      document.getElementById('productStockSmall').value = item.stock.Small || 0;
      document.getElementById('productStockRegular').value = item.stock.Regular || 0;
      document.getElementById('productStockLarge').value = item.stock.Large || 0;
    } else {
      // Fallback if editing an old item
      document.getElementById('productStockSmall').value = Math.floor(item.stock / 3) || 0;
      document.getElementById('productStockRegular').value = Math.floor(item.stock / 3) || 0;
      document.getElementById('productStockLarge').value = Math.floor(item.stock / 3) || 0;
    }
    
    document.getElementById('productCategory').value = item.category || 'Sweet';
    document.getElementById('productPriceSmall').value = item.prices.Small;
    document.getElementById('productPriceRegular').value = item.prices.Regular;
    document.getElementById('productPriceLarge').value = item.prices.Large;
    document.getElementById('productStatus').value = item.status;
    openModal('productModal');
  };

  window.adminSaveProduct = function (e) {
    e.preventDefault();
    const inventory = getInventory();
    const id = document.getElementById('productId').value;

    const productData = {
      name: document.getElementById('productName').value.trim(),
      image: document.getElementById('productImage').value.trim(),
      description: document.getElementById('productDesc').value.trim(),
      category: document.getElementById('productCategory').value,
      stock: {
        Small: parseInt(document.getElementById('productStockSmall').value) || 0,
        Regular: parseInt(document.getElementById('productStockRegular').value) || 0,
        Large: parseInt(document.getElementById('productStockLarge').value) || 0
      },
      prices: {
        Small: parseInt(document.getElementById('productPriceSmall').value) || 0,
        Regular: parseInt(document.getElementById('productPriceRegular').value) || 0,
        Large: parseInt(document.getElementById('productPriceLarge').value) || 0
      },
      status: document.getElementById('productStatus').value
    };

    if (id) {
      // Edit existing
      const idx = inventory.findIndex(p => p.id === parseInt(id));
      if (idx !== -1) {
        inventory[idx] = { ...inventory[idx], ...productData };
      }
      showToast(`${productData.name} updated successfully`, 'success');
    } else {
      // Add new
      productData.id = Date.now();
      inventory.push(productData);

      const notifs = getNotifications();
      notifs.unshift({
        id: Date.now(), type: 'product', title: 'New Product Added',
        message: `${productData.name} has been added to inventory`,
        time: new Date().toLocaleString(), read: false
      });
      saveNotifications(notifs);
      showToast(`${productData.name} added to inventory`, 'success');
    }

    saveInventory(inventory);
    closeModal('productModal');
    renderInventory();
    renderOverview();
  };

  window.adminDeleteProduct = function (id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    let inventory = getInventory();
    const item = inventory.find(p => p.id === id);
    inventory = inventory.filter(p => p.id !== id);
    saveInventory(inventory);
    showToast(`${item ? item.name : 'Product'} deleted`, 'error');
    renderInventory();
    renderOverview();
  };

  // ─── Notifications ───
  function renderNotifications() {
    const notifs = getNotifications();
    const container = document.getElementById('notifList');
    if (!container) return;

    if (notifs.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">notifications_off</span><p class="font-bold text-lg">No Notifications</p><p class="text-sm">You\'re all caught up!</p></div>';
      return;
    }

    container.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="window.adminMarkRead(${n.id})">
        ${!n.read ? '<div class="notif-dot"></div>' : '<div style="width:8px;flex-shrink:0"></div>'}
        <div class="flex-grow min-w-0">
          <div class="flex justify-between items-start gap-2">
            <p class="font-bold text-on-surface text-sm truncate" style="font-family:Montserrat">${n.title}</p>
            <span class="text-[10px] text-on-surface-variant whitespace-nowrap">${n.time}</span>
          </div>
          <p class="text-sm text-on-surface-variant mt-1">${n.message}</p>
        </div>
      </div>
    `).join('');

    // Update badges
    const unread = notifs.filter(n => !n.read).length;
    document.querySelectorAll('.notif-count').forEach(b => {
      if (unread > 0) { b.textContent = unread; b.style.display = 'flex'; }
      else { b.style.display = 'none'; }
    });
  }

  window.adminMarkRead = function (id) {
    const notifs = getNotifications();
    const n = notifs.find(x => x.id === id);
    if (n) { n.read = true; saveNotifications(notifs); renderNotifications(); }
  };

  window.adminMarkAllRead = function () {
    const notifs = getNotifications();
    notifs.forEach(n => n.read = true);
    saveNotifications(notifs);
    renderNotifications();
    showToast('All notifications marked as read', 'success');
  };

  window.adminClearNotifications = function () {
    if (!confirm('Clear all notifications?')) return;
    saveNotifications([]);
    renderNotifications();
    showToast('Notifications cleared', 'info');
  };

  // ─── Settings ───
  window.adminSaveSettings = function (e) {
    e.preventDefault();
    const newUser = document.getElementById('settingsUsername').value.trim();
    const currentPass = document.getElementById('settingsCurrentPass').value;
    const newPass = document.getElementById('settingsNewPass').value;
    const confirmPass = document.getElementById('settingsConfirmPass').value;

    const creds = JSON.parse(localStorage.getItem('poprushAdminCreds'));

    if (currentPass && currentPass !== creds.password) {
      showToast('Current password is incorrect', 'error');
      return;
    }

    if (newPass) {
      if (newPass.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
      if (newPass !== confirmPass) { showToast('Passwords do not match', 'error'); return; }
      creds.password = newPass;
    }

    if (newUser) { creds.username = newUser; }

    localStorage.setItem('poprushAdminCreds', JSON.stringify(creds));
    localStorage.setItem('poprushAdminUser', creds.username);
    showToast('Settings updated successfully', 'success');
    e.target.reset();
    document.getElementById('settingsUsername').value = creds.username;
  };

  // ─── Logout ───
  window.adminLogout = function () {
    localStorage.removeItem('poprushAdminAuth');
    localStorage.removeItem('poprushAdminUser');
    window.location.href = '../index.html';
  };

  // ─── Close Modal Helpers ───
  window.adminCloseModal = function (id) { closeModal(id); };

  // ─── Listen for new orders from customer side ───
  function pollForNewOrders() {
    const lastOrder = localStorage.getItem('lastPoprushOrder');
    if (lastOrder) {
      const orderData = JSON.parse(lastOrder);
      const orders = getOrders();

      // Check if this order is already tracked
      if (!orders.find(o => o.orderId === orderData.orderId)) {
        orders.unshift({
          orderId: orderData.orderId,
          date: orderData.date,
          status: 'pending',
          customer: orderData.customer,
          items: orderData.items,
          total: orderData.total
        });
        saveOrders(orders);

        // Add notification
        const notifs = getNotifications();
        notifs.unshift({
          id: Date.now(), type: 'order', title: 'New Order Received',
          message: `${orderData.customer.name} placed order ${orderData.orderId} worth ₱${orderData.total}`,
          time: new Date().toLocaleString(), read: false
        });
        saveNotifications(notifs);
        renderOverview();
        renderNotifications();
      }
    }
  }

  // ─── Initialize ───
  function init() {
    checkAuth();
    initSidebar();

    // Load settings
    const creds = JSON.parse(localStorage.getItem('poprushAdminCreds') || '{}');
    const usernameField = document.getElementById('settingsUsername');
    if (usernameField && creds.username) { usernameField.value = creds.username; }

    // Poll for new orders
    pollForNewOrders();
    setInterval(pollForNewOrders, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
