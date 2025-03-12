document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const foodInventoryTable = document.getElementById('food-inventory-table');
    const alcoholInventoryTable = document.getElementById('alcohol-inventory-table');
    const inventorySearch = document.getElementById('inventory-search');
    const inventoryFilter = document.getElementById('inventory-filter');
    const currentMonthElement = document.getElementById('current-month');
    const monthList = document.getElementById('month-list');
    const startNewMonthBtn = document.getElementById('start-new-month');
    const foodTab = document.getElementById('food-tab');
    const alcoholTab = document.getElementById('alcohol-tab');
    const allItemsTab = document.getElementById('all-items-tab');
    const foodTabContent = document.getElementById('food-tab-content');
    const alcoholTabContent = document.getElementById('alcohol-tab-content');
    const allItemsTabContent = document.getElementById('all-items-tab-content');
    const newMonthModal = new bootstrap.Modal(document.getElementById('newMonthModal'));
    const startNewMonthForm = document.getElementById('start-new-month-form');
    const confirmNewMonthBtn = document.getElementById('confirm-new-month');
    
    // API base URL
    const API_BASE_URL = '/api';
    
    // Current month and inventory data
    let currentMonth = null;
    let inventoryData = [];
    let filteredInventory = [];
    let months = [];
    let activeStore = null;
    
    // Initialize page
    initializePage();
    
    /**
     * Initialize the page by fetching active store and inventory data
     */
    async function initializePage() {
        try {
            // First check if we have an active store
            await fetchActiveStore();
            
            if (!activeStore) {
                // No active store, redirect to store selection
                window.location.href = '/store-select.html';
                return;
            }
            
            // Fetch months
            await fetchMonths();
            
            // Fetch inventory data
            await fetchInventoryData();
            
            // Set up event listeners
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing page:', error);
            showToast('Failed to initialize page. Please try again.', 'error');
        }
    }
    
    /**
     * Fetch active store information
     */
    async function fetchActiveStore() {
        try {
            const response = await fetch(`${API_BASE_URL}/stores/active`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch active store');
            }
            
            const data = await response.json();
            
            if (data.success && data.hasActiveStore) {
                activeStore = data.store;
                
                // Update store name in UI
                document.getElementById('store-name').textContent = activeStore.name;
                document.title = `${activeStore.name} - X-Seller-8 Inventory`;
            } else {
                activeStore = null;
            }
        } catch (error) {
            console.error('Error fetching active store:', error);
            showToast('Failed to fetch active store', 'error');
            activeStore = null;
        }
    }
    
    /**
     * Fetch available months
     */
    async function fetchMonths() {
        try {
            const response = await fetch(`${API_BASE_URL}/months`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch months');
            }
            
            const data = await response.json();
            
            if (data.success) {
                months = data.months;
                renderMonthList(months);
                
                // Set current month (use the first month or 'Current')
                currentMonth = months.length > 0 ? months[0] : 'Current';
                updateCurrentMonthDisplay();
            } else {
                showToast(data.error || 'Failed to fetch months', 'error');
            }
        } catch (error) {
            console.error('Error fetching months:', error);
            showToast('Failed to fetch months. Please try again.', 'error');
        }
    }
    
    /**
     * Fetch inventory data
     */
    async function fetchInventoryData() {
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE_URL}/inventory`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch inventory data');
            }
            
            const data = await response.json();
            
            if (data.success) {
                inventoryData = data.inventory || [];
                
                // Split data into food and alcohol
                const foodItems = inventoryData.filter(item => item.category?.toLowerCase() === 'food' || !item.category);
                const alcoholItems = inventoryData.filter(item => item.category?.toLowerCase() === 'alcohol');
                
                // Render inventory tables
                renderInventoryTable(foodItems, foodInventoryTable);
                renderInventoryTable(alcoholItems, alcoholInventoryTable);
                renderInventoryTable(inventoryData, inventoryTableBody);
                
                // Update inventory stats
                updateInventoryStats(inventoryData);
            } else {
                showToast(data.error || 'Failed to fetch inventory data', 'error');
            }
        } catch (error) {
            console.error('Error fetching inventory data:', error);
            showToast('Failed to fetch inventory data. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Search inventory
        inventorySearch.addEventListener('input', filterInventory);
        
        // Filter inventory
        inventoryFilter.addEventListener('change', filterInventory);
        
        // Month selection
        document.querySelectorAll('.month-history-card').forEach(card => {
            card.addEventListener('click', () => {
                const month = card.dataset.month;
                if (month) {
                    selectMonth(month);
                }
            });
        });
        
        // Start new month
        startNewMonthBtn.addEventListener('click', () => {
            newMonthModal.show();
        });
        
        // Confirm new month
        confirmNewMonthBtn.addEventListener('click', startNewMonth);
        
        // Tab switching
        foodTab.addEventListener('click', () => {
            foodTabContent.classList.add('active', 'show');
            alcoholTabContent.classList.remove('active', 'show');
            allItemsTabContent.classList.remove('active', 'show');
            
            foodTab.classList.add('active');
            alcoholTab.classList.remove('active');
            allItemsTab.classList.remove('active');
        });
        
        alcoholTab.addEventListener('click', () => {
            foodTabContent.classList.remove('active', 'show');
            alcoholTabContent.classList.add('active', 'show');
            allItemsTabContent.classList.remove('active', 'show');
            
            foodTab.classList.remove('active');
            alcoholTab.classList.add('active');
            allItemsTab.classList.remove('active');
        });
        
        allItemsTab.addEventListener('click', () => {
            foodTabContent.classList.remove('active', 'show');
            alcoholTabContent.classList.remove('active', 'show');
            allItemsTabContent.classList.add('active', 'show');
            
            foodTab.classList.remove('active');
            alcoholTab.classList.remove('active');
            allItemsTab.classList.add('active');
        });
        
        // Download buttons
        document.getElementById('download-food-inventory').addEventListener('click', () => {
            downloadInventory('food');
        });
        
        document.getElementById('download-alcohol-inventory').addEventListener('click', () => {
            downloadInventory('alcohol');
        });
        
        document.getElementById('download-inventory').addEventListener('click', () => {
            downloadInventory('all');
        });
    }
    
    /**
     * Render inventory table
     * @param {Array} items - Inventory items to render
     * @param {HTMLElement} tableElement - Table element to render into
     */
    function renderInventoryTable(items, tableElement) {
        // Clear table
        tableElement.innerHTML = '';
        
        if (items.length === 0) {
            // No items
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="8" class="text-center py-4">
                    <div class="text-muted">No inventory items found</div>
                </td>
            `;
            tableElement.appendChild(emptyRow);
            return;
        }
        
        // Render each item
        items.forEach((item, index) => {
            const row = document.createElement('tr');
            
            // Determine status
            let status = 'In Stock';
            let statusClass = 'bg-success';
            
            if (!item.quantity || item.quantity <= 0) {
                status = 'Out of Stock';
                statusClass = 'bg-danger';
            } else if (item.quantity < 5) {
                status = 'Low Stock';
                statusClass = 'bg-warning';
            }
            
            // Format date
            const deliveredDate = item.date ? new Date(item.date).toLocaleDateString() : 'N/A';
            
            // Calculate total value
            const totalValue = (item.price || 0) * (item.quantity || 0);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.name || 'Unknown Item'}</td>
                <td>
                    <span class="badge ${item.category?.toLowerCase() === 'alcohol' ? 'bg-danger' : 'bg-success'}">
                        ${item.category || 'Food'}
                    </span>
                </td>
                <td>$${(item.price || 0).toFixed(2)}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.size || 'N/A'}</td>
                <td>${deliveredDate}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
            `;
            
            tableElement.appendChild(row);
        });
    }
    
    /**
     * Update inventory statistics
     * @param {Array} items - Inventory items
     */
    function updateInventoryStats(items) {
        // Calculate statistics
        const totalItems = items.length;
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
        
        // Get counts by category
        const foodItems = items.filter(item => item.category?.toLowerCase() === 'food' || !item.category);
        const alcoholItems = items.filter(item => item.category?.toLowerCase() === 'alcohol');
        
        // Update UI
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('total-quantity').textContent = totalQuantity;
        document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('food-items').textContent = foodItems.length;
        document.getElementById('alcohol-items').textContent = alcoholItems.length;
    }
    
    /**
     * Filter inventory based on search and filter
     */
    function filterInventory() {
        const searchTerm = inventorySearch.value.toLowerCase();
        const filterValue = inventoryFilter.value;
        
        // Filter items
        filteredInventory = inventoryData.filter(item => {
            // Search term filter
            const matchesSearch = !searchTerm || 
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.category && item.category.toLowerCase().includes(searchTerm)) ||
                (item.size && item.size.toLowerCase().includes(searchTerm));
                
            // Category/status filter
            let matchesFilter = true;
            
            switch (filterValue) {
                case 'food':
                    matchesFilter = item.category?.toLowerCase() === 'food' || !item.category;
                    break;
                case 'alcohol':
                    matchesFilter = item.category?.toLowerCase() === 'alcohol';
                    break;
                case 'in-stock':
                    matchesFilter = item.quantity > 0;
                    break;
                case 'low-stock':
                    matchesFilter = item.quantity > 0 && item.quantity < 5;
                    break;
                default:
                    matchesFilter = true;
            }
            
            return matchesSearch && matchesFilter;
        });
        
        // Split filtered data into food and alcohol
        const filteredFoodItems = filteredInventory.filter(item => item.category?.toLowerCase() === 'food' || !item.category);
        const filteredAlcoholItems = filteredInventory.filter(item => item.category?.toLowerCase() === 'alcohol');
        
        // Render filtered inventory
        renderInventoryTable(filteredFoodItems, foodInventoryTable);
        renderInventoryTable(filteredAlcoholItems, alcoholInventoryTable);
        renderInventoryTable(filteredInventory, inventoryTableBody);
        
        // Update inventory stats based on filtered data
        updateInventoryStats(filteredInventory);
    }
    
    /**
     * Render month list
     * @param {Array} months - List of available months
     */
    function renderMonthList(months) {
        // Clear month list
        monthList.innerHTML = '';
        
        if (months.length === 0) {
            // No months
            const emptyMonth = document.createElement('div');
            emptyMonth.className = 'col-md-12';
            emptyMonth.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="bi bi-info-circle me-2"></i>
                    No month history available yet
                </div>
            `;
            monthList.appendChild(emptyMonth);
            return;
        }
        
        // Render each month
        months.forEach((month, index) => {
            const isActive = index === 0; // First month is active by default
            
            const monthElement = document.createElement('div');
            monthElement.className = 'col-md-3 mb-2';
            monthElement.innerHTML = `
                <div class="card month-history-card ${isActive ? 'active' : ''}" data-month="${month}">
                    <div class="card-body p-2">
                        <h6 class="mb-1">${month}</h6>
                        <small class="text-muted">${isActive ? 'Current' : ''}</small>
                    </div>
                </div>
            `;
            
            // Add click event
            const card = monthElement.querySelector('.month-history-card');
            card.addEventListener('click', () => {
                selectMonth(month);
            });
            
            monthList.appendChild(monthElement);
        });
    }
    
    /**
     * Select a month and load its inventory data
     * @param {string} month - Month to select
     */
    async function selectMonth(month) {
        // Update active month
        document.querySelectorAll('.month-history-card').forEach(card => {
            if (card.dataset.month === month) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // Update current month
        currentMonth = month;
        updateCurrentMonthDisplay();
        
        // Fetch inventory data for the selected month
        // For now, we'll just use the current inventory data
        // In a real implementation, you would fetch the month-specific data
        await fetchInventoryData();
    }
    
    /**
     * Update current month display
     */
    function updateCurrentMonthDisplay() {
        if (currentMonthElement) {
            currentMonthElement.textContent = currentMonth;
        }
    }
    
    /**
     * Start a new month
     */
    async function startNewMonth() {
        const monthName = document.getElementById('new-month-name').value.trim();
        
        if (!monthName) {
            showToast('Month name is required', 'warning');
            return;
        }
        
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE_URL}/start-new-month`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ month: monthName })
            });
            
            if (!response.ok) {
                throw new Error('Failed to start new month');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Close modal
                newMonthModal.hide();
                
                // Show success message
                showToast(`Started new month: ${monthName}`, 'success');
                
                // Refresh months list
                await fetchMonths();
                
                // Select the new month
                selectMonth(monthName);
            } else {
                showToast(data.error || 'Failed to start new month', 'error');
            }
        } catch (error) {
            console.error('Error starting new month:', error);
            showToast('Failed to start new month. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * Download inventory as Excel file
     * @param {string} type - Type of inventory to download (food, alcohol, all)
     */
    function downloadInventory(type) {
        let items;
        let filename;
        
        switch (type) {
            case 'food':
                items = inventoryData.filter(item => item.category?.toLowerCase() === 'food' || !item.category);
                filename = `${activeStore.name.replace(/\s+/g, '_')}_Food_Inventory_${currentMonth}.xlsx`;
                break;
            case 'alcohol':
                items = inventoryData.filter(item => item.category?.toLowerCase() === 'alcohol');
                filename = `${activeStore.name.replace(/\s+/g, '_')}_Alcohol_Inventory_${currentMonth}.xlsx`;
                break;
            default:
                items = inventoryData;
                filename = `${activeStore.name.replace(/\s+/g, '_')}_Complete_Inventory_${currentMonth}.xlsx`;
        }
        
        // Prepare data for Excel
        const worksheetData = [
            ['#', 'Item Name', 'Category', 'Price', 'Quantity', 'Pack Size', 'Date Delivered', 'Total Value', 'Status']
        ];
        
        items.forEach((item, index) => {
            // Determine status
            let status = 'In Stock';
            
            if (!item.quantity || item.quantity <= 0) {
                status = 'Out of Stock';
            } else if (item.quantity < 5) {
                status = 'Low Stock';
            }
            
            // Format date
            const deliveredDate = item.date ? new Date(item.date).toLocaleDateString() : 'N/A';
            
            // Calculate total value
            const totalValue = (item.price || 0) * (item.quantity || 0);
            
            worksheetData.push([
                index + 1,
                item.name || 'Unknown Item',
                item.category || 'Food',
                (item.price || 0).toFixed(2),
                item.quantity || 0,
                item.size || 'N/A',
                deliveredDate,
                totalValue.toFixed(2),
                status
            ]);
        });
        
        // Create Excel file
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
        
        // Generate Excel file
        XLSX.writeFile(workbook, filename);
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
