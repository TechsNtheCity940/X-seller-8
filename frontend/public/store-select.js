document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // DOM elements
    const storesRow = document.getElementById('stores-row');
    const createStoreCard = document.getElementById('create-store-card');
    const noStoresMessage = document.getElementById('no-stores-message');
    const createFirstStoreBtn = document.getElementById('create-first-store-btn');
    const continueContainer = document.getElementById('continue-container');
    const continueButton = document.getElementById('continue-button');
    const createStoreModal = new bootstrap.Modal(document.getElementById('createStoreModal'), {
        keyboard: false,
        backdrop: 'static'
    });
    const saveStoreButton = document.getElementById('save-store-button');
    const createStoreForm = document.getElementById('create-store-form');
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    console.log("Create store card element:", createStoreCard);

    // API base URL
    const API_BASE_URL = '/api';
    
    // Selected store
    let selectedStoreId = null;
    
    // Load stores on page load
    fetchStores();
    
    // Event Listeners
    createStoreCard.addEventListener('click', () => {
        // Reset form
        createStoreForm.reset();
        // Show modal
        createStoreModal.show();
    });
    
    createFirstStoreBtn.addEventListener('click', () => {
        // Reset form
        createStoreForm.reset();
        // Show modal
        createStoreModal.show();
    });
    
    saveStoreButton.addEventListener('click', createStore);
    
    continueButton.addEventListener('click', () => {
        if (selectedStoreId) {
            activateStore(selectedStoreId);
        } else {
            showToast('Please select a store first', 'warning');
        }
    });
    
    // Functions
    
    /**
     * Fetch all stores from the API
     */
    async function fetchStores() {
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/stores`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch stores');
            }
            
            const data = await response.json();
            
            if (data.success) {
                renderStores(data.stores, data.activeStoreId);
                
                // Show "no stores" message if there are no stores
                if (data.stores.length === 0) {
                    noStoresMessage.style.display = 'block';
                } else {
                    noStoresMessage.style.display = 'none';
                    
                    // If there's an active store, select it automatically
                    if (data.activeStoreId) {
                        selectStore(data.activeStoreId);
                    }
                }
            } else {
                showToast(data.error || 'Failed to fetch stores', 'error');
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
            showToast('Failed to fetch stores. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Render stores in the UI
     * @param {Array} stores - Array of store objects
     * @param {string} activeStoreId - ID of the active store (if any)
     */
    function renderStores(stores, activeStoreId) {
        // Clear existing stores (except create store card)
        const storeCards = storesRow.querySelectorAll('.store-item');
        storeCards.forEach(card => card.remove());
        
        // Add create store card back to ensure it's the last card
        createStoreCard.parentElement.remove();
        
        // Render each store
        stores.forEach(store => {
            const storeCard = createStoreCard(store, store.id === activeStoreId);
            storesRow.appendChild(storeCard);
        });
        
        // Add create store card at the end
        const createStoreElement = document.createElement('div');
        createStoreElement.className = 'col-md-4 mb-4';
        createStoreElement.innerHTML = `
            <div class="card create-store-card" id="create-store-card">
                <div class="card-body">
                    <i class="bi bi-plus-circle add-store-icon"></i>
                    <h4 class="card-title mt-3">Create New Store</h4>
                    <p class="text-muted">Add a new restaurant location</p>
                </div>
            </div>
        `;
        storesRow.appendChild(createStoreElement);
        
        // Update create store card reference
        document.getElementById('create-store-card').addEventListener('click', () => {
            createStoreForm.reset();
            createStoreModal.show();
        });
    }
    
    /**
     * Create a store card element
     * @param {Object} store - Store object
     * @param {boolean} isActive - Whether this store is active
     * @returns {HTMLElement} - Store card element
     */
    function createStoreCard(store, isActive) {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4 store-item';
        
        const card = document.createElement('div');
        card.className = `card store-card${isActive ? ' active' : ''}`;
        card.dataset.storeId = store.id;
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Store icon based on active status
        const icon = document.createElement('i');
        icon.className = `bi ${isActive ? 'bi-building-check' : 'bi-building'} store-icon`;
        
        const title = document.createElement('h4');
        title.className = 'card-title';
        title.textContent = store.name;
        
        const details = document.createElement('div');
        details.className = 'card-text text-muted';
        
        // Add store details if available
        if (store.address || store.phone || store.email) {
            let detailsHtml = '';
            if (store.address) detailsHtml += `<p><i class="bi bi-geo-alt me-1"></i>${store.address}</p>`;
            if (store.phone) detailsHtml += `<p><i class="bi bi-telephone me-1"></i>${store.phone}</p>`;
            if (store.email) detailsHtml += `<p><i class="bi bi-envelope me-1"></i>${store.email}</p>`;
            
            details.innerHTML = detailsHtml;
        } else {
            details.innerHTML = '<p>No additional details</p>';
        }
        
        // Add date info
        const dateInfo = document.createElement('div');
        dateInfo.className = 'mt-3 text-muted small';
        
        const createdDate = new Date(store.created);
        dateInfo.textContent = `Created: ${createdDate.toLocaleDateString()}`;
        
        // Add status badge if active
        if (isActive) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success ms-2';
            badge.textContent = 'Active';
            title.appendChild(badge);
        }
        
        // Append elements to card
        cardBody.appendChild(icon);
        cardBody.appendChild(title);
        cardBody.appendChild(details);
        cardBody.appendChild(dateInfo);
        card.appendChild(cardBody);
        col.appendChild(card);
        
        // Add click event to select store
        card.addEventListener('click', () => {
            selectStore(store.id);
        });
        
        return col;
    }
    
    /**
     * Select a store
     * @param {string} storeId - ID of the store to select
     */
    function selectStore(storeId) {
        // Update selected store ID
        selectedStoreId = storeId;
        
        // Update UI
        const storeCards = document.querySelectorAll('.store-card');
        storeCards.forEach(card => {
            if (card.dataset.storeId === storeId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // Show continue button
        continueContainer.style.display = 'block';
    }
    
    /**
     * Create a new store
     */
    async function createStore() {
        // Get form data
        const name = document.getElementById('store-name').value.trim();
        const address = document.getElementById('store-address').value.trim();
        const phone = document.getElementById('store-phone').value.trim();
        const email = document.getElementById('store-email').value.trim();
        const notes = document.getElementById('store-notes').value.trim();
        
        // Validate required fields
        if (!name) {
            showToast('Store name is required', 'warning');
            return;
        }
        
        // Create store data object
        const storeData = {
            name,
            address,
            phone,
            email,
            notes
        };
        
        // Show loading
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/stores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(storeData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create store');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                createStoreModal.hide();
                
                // Show success message
                showToast(`Store "${data.store.name}" created successfully`, 'success');
                
                // Refresh stores list
                fetchStores();
                
                // Select the new store
                selectStore(data.store.id);
            } else {
                showToast(data.error || 'Failed to create store', 'error');
            }
        } catch (error) {
            console.error('Error creating store:', error);
            showToast('Failed to create store. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Activate a store and redirect to main application
     * @param {string} storeId - ID of the store to activate
     */
    async function activateStore(storeId) {
        showLoading();
        
        try {
            const response = await fetch(`${API_BASE_URL}/stores/${storeId}/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to activate store');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                showToast(`Store "${data.store.name}" is now active`, 'success');
                
                // Redirect to main application after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1000);
            } else {
                showToast(data.error || 'Failed to activate store', 'error');
            }
        } catch (error) {
            console.error('Error activating store:', error);
            showToast('Failed to activate store. Please try again.', 'error');
            hideLoading();
        }
    }
    
    // Utility functions
    
    /**
     * Show loading overlay
     */
    function showLoading() {
        document.querySelector('.loading-overlay').style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    function hideLoading() {
        document.querySelector('.loading-overlay').style.display = 'none';
    }
    
    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, warning, info)
     */
    function showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast show`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        // Set background color based on type
        let bgColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-success';
                icon = 'bi-check-circle-fill';
                break;
            case 'error':
                bgColor = 'bg-danger';
                icon = 'bi-exclamation-circle-fill';
                break;
            case 'warning':
                bgColor = 'bg-warning';
                icon = 'bi-exclamation-triangle-fill';
                break;
            default:
                bgColor = 'bg-info';
                icon = 'bi-info-circle-fill';
        }
        
        // Set toast content
        toast.innerHTML = `
            <div class="toast-header ${bgColor} text-white">
                <i class="bi ${icon} me-2"></i>
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
});
