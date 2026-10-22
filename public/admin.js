/**
 * Balconia Admin Dashboard Controller
 */

(() => {
  // State
  let products = [];
  let currentCategory = "all";
  let searchQuery = "";
  let currentSort = "featured";
  let activeEditingProduct = null;
  let pendingDropProductId = null;

  // DOM Elements
  const authScreen = document.getElementById("auth-screen");
  const dashboardApp = document.getElementById("dashboard-app");
  const authForm = document.getElementById("auth-form");
  const authError = document.getElementById("auth-error");
  const passphraseInput = document.getElementById("admin-passphrase");
  const togglePassBtn = document.getElementById("toggle-password");
  const logoutBtn = document.getElementById("logout-btn");

  const tbody = document.getElementById("products-tbody");
  const searchInput = document.getElementById("product-search");
  const sortSelect = document.getElementById("sort-select");
  const categoryTabs = document.getElementById("category-tabs");

  const metricLive = document.getElementById("metric-live");
  const metricDropped = document.getElementById("metric-dropped");
  const metricTotal = document.getElementById("metric-total");

  const productModal = document.getElementById("product-modal");
  const productForm = document.getElementById("product-form");
  const modalTitle = document.getElementById("modal-title");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const openAddModalBtn = document.getElementById("open-add-modal-btn");
  const deleteProductBtn = document.getElementById("delete-product-btn");

  const formId = document.getElementById("form-id");
  const formName = document.getElementById("form-name");
  const formCategory = document.getElementById("form-category");
  const formPriceRupees = document.getElementById("form-price-rupees");
  const formMrpRupees = document.getElementById("form-mrp-rupees");
  const formDiscount = document.getElementById("form-discount");
  const formSize = document.getElementById("form-size");
  const formLight = document.getElementById("form-light");
  const formDescription = document.getElementById("form-description");
  const formImageUrl = document.getElementById("form-image-url");
  const formPreviewImg = document.getElementById("form-preview-img");
  const photoFileInput = document.getElementById("photo-file-input");
  const uploadStatus = document.getElementById("upload-status");
  const formIsActive = document.getElementById("form-is-active");
  const formPlantOnly = document.getElementById("form-plant-only");
  const formRequiresInstall = document.getElementById("form-requires-install");
  const calcPricePaise = document.getElementById("calc-price-paise");
  const calcMrpPaise = document.getElementById("calc-mrp-paise");
  const discountBadgeChip = document.getElementById("discount-badge-chip");

  const confirmModal = document.getElementById("confirm-modal");
  const confirmCancel = document.getElementById("confirm-cancel");
  const confirmProceedDrop = document.getElementById("confirm-proceed-drop");
  const confirmMsg = document.getElementById("confirm-msg");

  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  // Currency Formatter
  const formatINR = (paise) => {
    if (paise === null || paise === undefined) return "On request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.style.display = "none";
    }, 3200);
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  togglePassBtn?.addEventListener("click", () => {
    const isPass = passphraseInput.type === "password";
    passphraseInput.type = isPass ? "text" : "password";
    togglePassBtn.textContent = isPass ? "🙈" : "👁";
  });

  async function checkAuth() {
    try {
      const res = await fetch("/api/admin/auth", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.authenticated) {
        showDashboard();
      } else {
        showAuthScreen();
      }
    } catch {
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    authScreen.style.display = "flex";
    dashboardApp.style.display = "none";
    passphraseInput.focus();
  }

  function showDashboard() {
    authScreen.style.display = "none";
    dashboardApp.style.display = "block";
    loadProducts();
  }

  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.style.display = "none";
    const passphrase = passphraseInput.value.trim();
    if (!passphrase) return;

    const submitBtn = document.getElementById("auth-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showDashboard();
      } else {
        authError.textContent = data.error || "Invalid passphrase";
        authError.style.display = "block";
      }
    } catch {
      authError.textContent = "Could not connect to authentication service.";
      authError.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in to Dashboard";
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    products = [];
    showAuthScreen();
    showToast("Logged out successfully");
  });

  // ==========================================================================
  // PRODUCTS DATA & RENDERING
  // ==========================================================================

  async function loadProducts() {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">Loading catalogue products...</td></tr>`;
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      if (res.status === 401) {
        showAuthScreen();
        return;
      }
      const data = await res.json();
      products = data.products || [];
      updateMetrics();
      renderTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:var(--danger)">Failed to load products. Please check connection.</td></tr>`;
    }
  }

  function updateMetrics() {
    const liveCount = products.filter((p) => p.isActive !== false).length;
    const droppedCount = products.filter((p) => p.isActive === false).length;
    const totalCount = products.length;

    metricLive.textContent = liveCount;
    metricDropped.textContent = droppedCount;
    metricTotal.textContent = totalCount;

    // Update Category Tab counts
    const countAll = document.getElementById("count-all");
    const countPlants = document.getElementById("count-plants");
    const countLights = document.getElementById("count-lights");
    const countFlooring = document.getElementById("count-flooring");
    const countFurniture = document.getElementById("count-furniture");
    const countDecor = document.getElementById("count-decor");
    const countDropped = document.getElementById("count-dropped");

    if (countAll) countAll.textContent = `(${liveCount})`;
    if (countPlants) countPlants.textContent = `(${products.filter((p) => p.category === "plants" && p.isActive !== false).length})`;
    if (countLights) countLights.textContent = `(${products.filter((p) => p.category === "lights" && p.isActive !== false).length})`;
    if (countFlooring) countFlooring.textContent = `(${products.filter((p) => p.category === "flooring" && p.isActive !== false).length})`;
    if (countFurniture) countFurniture.textContent = `(${products.filter((p) => p.category === "furniture" && p.isActive !== false).length})`;
    if (countDecor) countDecor.textContent = `(${products.filter((p) => p.category === "decor" && p.isActive !== false).length})`;
    if (countDropped) countDropped.textContent = `(${droppedCount})`;
  }

  function getFilteredProducts() {
    return products
      .filter((p) => {
        // Category filtering
        if (currentCategory === "dropped") {
          return p.isActive === false;
        }
        if (currentCategory !== "all" && p.category !== currentCategory) {
          return false;
        }
        if (currentCategory !== "dropped" && p.isActive === false) {
          return false;
        }

        // Search filtering
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchId = p.id.toLowerCase().includes(q);
          const matchName = (p.name || "").toLowerCase().includes(q);
          const matchDesc = (p.description || "").toLowerCase().includes(q);
          if (!matchId && !matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (currentSort === "price-low") {
          return (a.pricePaise || 0) - (b.pricePaise || 0);
        }
        if (currentSort === "price-high") {
          return (b.pricePaise || 0) - (a.pricePaise || 0);
        }
        if (currentSort === "name-asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (currentSort === "name-desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });
  }

  function renderTable() {
    const list = getFilteredProducts();

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">No products match this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map((p) => {
        const thumb = p.images?.[0]?.src || "assets/brand-logo-transparent.webp";
        const isActive = p.isActive !== false;
        const statusBadge = isActive
          ? `<span class="badge active-status">● Live</span>`
          : `<span class="badge dropped-status">Hidden</span>`;

        return `
          <tr class="${!isActive ? "is-dropped-row" : ""}" data-product-id="${esc(p.id)}">
            <td>
              <div class="product-thumb-cell">
                <img src="${esc(thumb)}" alt="" loading="lazy" onerror="this.src='assets/brand-logo-transparent.webp'">
              </div>
            </td>
            <td>
              <span class="product-id-badge">${esc(p.id)}</span>
            </td>
            <td class="product-info-cell">
              <strong>${esc(p.name)}</strong>
              <span class="product-specs">${esc(p.size || p.detail || p.category)}</span>
            </td>
            <td>
              <span class="category-name">${esc(p.category)}</span>
            </td>
            <td class="price-cell">
              <strong>${formatINR(p.pricePaise)}</strong>
            </td>
            <td class="mrp-cell">
              ${p.mrpPaise ? `<del>${formatINR(p.mrpPaise)}</del>` : `<span class="field-hint">—</span>`}
            </td>
            <td>
              ${p.discount ? `<span class="discount-chip">${p.discount}% off</span>` : `<span class="field-hint">—</span>`}
            </td>
            <td>
              ${statusBadge}
            </td>
            <td>
              <div class="actions-cell">
                <button type="button" class="btn secondary btn-icon-text action-edit" data-id="${esc(p.id)}">
                  Edit
                </button>
                <button type="button" class="btn outline btn-icon-text action-toggle-drop" data-id="${esc(p.id)}" data-active="${isActive}">
                  ${isActive ? "Drop" : "Restore"}
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  // ==========================================================================
  // SEARCH & CATEGORY FILTER LISTENERS
  // ==========================================================================

  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  sortSelect?.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderTable();
  });

  categoryTabs?.addEventListener("click", (e) => {
    const tab = e.target.closest(".cat-tab");
    if (!tab) return;
    document.querySelectorAll(".cat-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentCategory = tab.dataset.cat;
    renderTable();
  });

  // ==========================================================================
  // TABLE ACTIONS (EDIT & DROP)
  // ==========================================================================

  tbody?.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".action-edit");
    const dropBtn = e.target.closest(".action-toggle-drop");

    if (editBtn) {
      const id = editBtn.dataset.id;
      openEditModal(id);
    } else if (dropBtn) {
      const id = dropBtn.dataset.id;
      const isActive = dropBtn.dataset.active === "true";
      if (isActive) {
        confirmDropProduct(id);
      } else {
        restoreProduct(id);
      }
    }
  });

  // ==========================================================================
  // MODAL: ADD & EDIT PRODUCT
  // ==========================================================================

  function recalculatePricePaise() {
    const priceRupees = parseFloat(formPriceRupees.value) || 0;
    const mrpRupees = parseFloat(formMrpRupees.value) || 0;

    const pricePaise = Math.round(priceRupees * 100);
    const mrpPaise = Math.round(mrpRupees * 100);

    calcPricePaise.textContent = pricePaise.toLocaleString("en-IN");
    calcMrpPaise.textContent = mrpPaise.toLocaleString("en-IN");

    if (mrpRupees > priceRupees && mrpRupees > 0) {
      const computedDiscount = Math.round(((mrpRupees - priceRupees) / mrpRupees) * 100);
      formDiscount.value = computedDiscount;
      discountBadgeChip.textContent = `${computedDiscount}% off`;
      discountBadgeChip.style.display = "inline-block";
    } else if (formDiscount.value) {
      discountBadgeChip.textContent = `${formDiscount.value}% off`;
      discountBadgeChip.style.display = "inline-block";
    } else {
      discountBadgeChip.style.display = "none";
    }
  }

  formPriceRupees?.addEventListener("input", recalculatePricePaise);
  formMrpRupees?.addEventListener("input", recalculatePricePaise);
  formDiscount?.addEventListener("input", () => {
    if (formDiscount.value) {
      discountBadgeChip.textContent = `${formDiscount.value}% off`;
      discountBadgeChip.style.display = "inline-block";
    } else {
      discountBadgeChip.style.display = "none";
    }
  });

  formImageUrl?.addEventListener("input", (e) => {
    const url = e.target.value.trim();
    formPreviewImg.src = url || "assets/brand-logo-transparent.webp";
  });

  // Image File Upload
  photoFileInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadStatus.textContent = "Uploading image...";
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        formImageUrl.value = data.url;
        formPreviewImg.src = data.url;
        uploadStatus.textContent = "✓ Image uploaded successfully";
        setTimeout(() => {
          uploadStatus.textContent = "";
        }, 3000);
      } else {
        uploadStatus.textContent = "❌ " + (data.error || "Upload failed");
      }
    } catch {
      uploadStatus.textContent = "❌ Network error during upload";
    }
  });

  openAddModalBtn?.addEventListener("click", () => {
    openAddModal();
  });

  function openAddModal() {
    activeEditingProduct = null;
    modalTitle.textContent = "Add New Product";
    document.getElementById("form-mode").value = "add";

    // Reset Form
    productForm.reset();
    formId.disabled = false;
    formId.value = "";
    formName.value = "";
    formCategory.value = "plants";
    formPriceRupees.value = "";
    formMrpRupees.value = "";
    formDiscount.value = "";
    formSize.value = "";
    formLight.value = "";
    formDescription.value = "";
    formImageUrl.value = "";
    formPreviewImg.src = "assets/brand-logo-transparent.webp";
    formIsActive.checked = true;
    formPlantOnly.checked = false;
    formRequiresInstall.checked = false;
    deleteProductBtn.style.display = "none";

    recalculatePricePaise();
    productModal.showModal();
    formId.focus();
  }

  function openEditModal(productId) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    activeEditingProduct = product;
    modalTitle.textContent = `Edit Product · ${product.id}`;
    document.getElementById("form-mode").value = "edit";

    formId.disabled = true;
    formId.value = product.id;
    formName.value = product.name || "";
    formCategory.value = product.category || "plants";

    formPriceRupees.value = product.pricePaise !== null ? Math.round(product.pricePaise / 100) : "";
    formMrpRupees.value = product.mrpPaise ? Math.round(product.mrpPaise / 100) : "";
    formDiscount.value = product.discount || "";

    formSize.value = product.size || "";
    formLight.value = product.light || "";
    formDescription.value = product.description || "";

    const img = product.images?.[0]?.src || "";
    formImageUrl.value = img;
    formPreviewImg.src = img || "assets/brand-logo-transparent.webp";

    formIsActive.checked = product.isActive !== false;
    formPlantOnly.checked = Boolean(product.plantOnly);
    formRequiresInstall.checked = Boolean(product.requiresInstallation);

    deleteProductBtn.style.display = "inline-flex";
    deleteProductBtn.textContent = product.isActive !== false ? "Drop Item" : "Restore Item";

    recalculatePricePaise();
    productModal.showModal();
    formName.focus();
  }

  modalCloseBtn?.addEventListener("click", () => productModal.close());
  modalCancelBtn?.addEventListener("click", () => productModal.close());

  // Save (Create or Update)
  productForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mode = document.getElementById("form-mode").value;
    const saveBtn = document.getElementById("modal-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const id = formId.value.trim().toUpperCase();
    const priceRupees = formPriceRupees.value !== "" ? parseFloat(formPriceRupees.value) : null;
    const mrpRupees = formMrpRupees.value !== "" ? parseFloat(formMrpRupees.value) : null;

    const payload = {
      id,
      name: formName.value.trim(),
      category: formCategory.value,
      priceInRupees: priceRupees,
      mrpInRupees: mrpRupees,
      discount: formDiscount.value !== "" ? parseInt(formDiscount.value, 10) : null,
      size: formSize.value.trim(),
      light: formLight.value.trim(),
      description: formDescription.value.trim(),
      images: formImageUrl.value.trim()
        ? [{ src: formImageUrl.value.trim(), label: "View 1" }]
        : activeEditingProduct?.images || [],
      isActive: formIsActive.checked,
      plantOnly: formPlantOnly.checked,
      requiresInstallation: formRequiresInstall.checked,
    };

    try {
      let res;
      if (mode === "add") {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.ok) {
        productModal.close();
        showToast(mode === "add" ? `Added product ${id} successfully!` : `Updated product ${id} successfully!`);
        await loadProducts();
      } else {
        alert(data.error || "Failed to save product.");
      }
    } catch {
      alert("Network error while saving product.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product";
    }
  });

  // ==========================================================================
  // DROP & RESTORE FLOW
  // ==========================================================================

  deleteProductBtn?.addEventListener("click", () => {
    if (!activeEditingProduct) return;
    productModal.close();
    if (activeEditingProduct.isActive !== false) {
      confirmDropProduct(activeEditingProduct.id);
    } else {
      restoreProduct(activeEditingProduct.id);
    }
  });

  function confirmDropProduct(productId) {
    pendingDropProductId = productId;
    confirmMsg.textContent = `Are you sure you want to drop product '${productId}'? It will be hidden from the public catalogue, but kept in database records.`;
    confirmModal.showModal();
  }

  confirmCancel?.addEventListener("click", () => confirmModal.close());

  confirmProceedDrop?.addEventListener("click", async () => {
    if (!pendingDropProductId) return;
    const id = pendingDropProductId;
    confirmProceedDrop.disabled = true;
    confirmProceedDrop.textContent = "Hiding...";

    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        confirmModal.close();
        showToast(`Product ${id} dropped from public catalogue`);
        await loadProducts();
      } else {
        alert(data.error || "Failed to drop product.");
      }
    } catch {
      alert("Network error while dropping product.");
    } finally {
      confirmProceedDrop.disabled = false;
      confirmProceedDrop.textContent = "Hide from Website";
      pendingDropProductId = null;
    }
  });

  async function restoreProduct(productId) {
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Product ${productId} restored to live catalogue`);
        await loadProducts();
      } else {
        alert(data.error || "Failed to restore product.");
      }
    } catch {
      alert("Network error while restoring product.");
    }
  }

  // Initialize
  checkAuth();
})();
