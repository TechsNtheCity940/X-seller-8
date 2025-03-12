// This file contains all the JavaScript logic for the frontend application

document.addEventListener('DOMContentLoaded', function() {
    // Add animation to initial load
    document.body.classList.add('fade-in');
    
    // Set animation classes for main elements
    const statElements = document.querySelectorAll('.stats-number');
    statElements.forEach((el, index) => {
        el.classList.add('fade-in');
        el.style.animationDelay = `${0.2 + (index * 0.1)}s`;
    });
    
    // Add toast container for notifications
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    
    // Loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner-border loading-spinner" role="status"></div>';
    document.body.appendChild(loadingOverlay);
    
    function showLoading() {
        loadingOverlay.classList.add('show');
    }
    
    function hideLoading() {
        loadingOverlay.classList.remove('show');
    }
    
    // Show toast notification
    function showToast(message, type = 'primary') {
        const toast = document.createElement('div');
        toast.className = 'toast show';
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">X-Seller-8</strong>
                <small>Just now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            toast.classList.add('fade');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
        
        // Handle close button
        toast.querySelector('.btn-close').addEventListener('click', () => {
            toast.classList.add('fade');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        });
    }
    
    // Page navigation with animations
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('[data-page]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPage = this.getAttribute('data-page');
            
            // Add slide-out animation to current page
            pages.forEach(page => {
                if (page.classList.contains('active')) {
                    page.classList.add('fade-out');
                    setTimeout(() => {
                        page.classList.remove('active', 'fade-out');
                        page.style.display = 'none';
                        
                        // Show and animate target page
                        const newPage = document.getElementById(`${targetPage}-page`);
                        newPage.style.display = 'block';
                        newPage.classList.add('active', 'fade-in');
                        
                        // Special case for home page
                        if (targetPage === 'home') {
                            loadStatistics();
                        } else if (targetPage === 'inventory') {
                            loadInventory();
                        } else if (targetPage === 'documents') {
                            loadDocuments();
                        }
                    }, 300);
                }
            });
            
            // Update nav links
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
                if (navLink.getAttribute('data-page') === targetPage) {
                    navLink.classList.add('active');
                }
            });
        });
    });
    
    // Show home page by default
    pages.forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById('home-page').style.display = 'block';
    document.getElementById('home-page').classList.add('active', 'fade-in');
    
    // File upload handling
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const uploadProgress = document.querySelector('.upload-progress');
    const progressBar = document.querySelector('.progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const processingStatusCard = document.getElementById('processing-status-card');
    const processingStatus = document.getElementById('processing-status');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFiles(fileInput.files);
            }
        });
    }
    
    function handleFiles(files) {
        // Animate the upload area away
        uploadArea.classList.add('fade-out');
        setTimeout(() => {
            uploadArea.style.display = 'none';
            uploadProgress.style.display = 'block';
            uploadProgress.classList.add('fade-in');
        }, 300);
        
        // Create FormData object
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        // Simulated upload progress with smoother animation
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                // Start processing
                setTimeout(() => {
                    uploadStatus.innerHTML = '<span class="badge bg-success pulse"><i class="bi bi-check-circle-fill me-1"></i> Files uploaded successfully</span> <span class="ms-2">Processing documents...</span>';
                    processingStatusCard.style.display = 'none';
                    setTimeout(() => {
                        processingStatusCard.classList.add('fade-in');
                        processingStatusCard.style.display = 'block';
                    }, 300);
                    
                    // Simulate processing
                    setTimeout(() => {
                        processingStatus.innerHTML = `
                            <div class="alert alert-success slide-in">
                                <i class="bi bi-check-circle-fill me-2"></i>
                                Processing complete! 
                                <a href="#" data-page="inventory" class="alert-link">View inventory</a> or 
                                <a href="#" data-page="documents" class="alert-link">see processed documents</a>.
                            </div>
                        `;
                        
                        // Show success toast
                        showToast('<i class="bi bi-check-circle-fill me-2"></i> Documents processed successfully!', 'success');
                        
                        // Update navigation links in the processing status
                        document.querySelectorAll('#processing-status [data-page]').forEach(link => {
                            link.addEventListener('click', function(e) {
                                e.preventDefault();
                                const targetPage = this.getAttribute('data-page');
                                document.querySelector(`[data-page="${targetPage}"]`).click();
                            });
                        });
                    }, 3000);
                }, 800);
            }
        }, 50);
        
        // In a real application, you would perform an actual upload to the server:
        /*
        showLoading();
        fetch('http://localhost:5050/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            uploadStatus.innerHTML = '<span class="badge bg-success pulse"><i class="bi bi-check-circle-fill me-1"></i> Files uploaded successfully</span> <span class="ms-2">Processing documents...</span>';
            // Check processing status
            checkProcessingStatus(data.results[0].status_key);
        })
        .catch(error => {
            hideLoading();
            uploadStatus.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error: ${error.message}</div>`;
            showToast(`<i class="bi bi-exclamation-triangle-fill me-2"></i> Upload failed: ${error.message}`, 'danger');
        });
        */
    }
    
    // Chat functionality with animations
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // Add user message with animation
        const userMessageElement = document.createElement('div');
        userMessageElement.className = 'message user-message fade-in';
        userMessageElement.textContent = message;
        chatMessages.appendChild(userMessageElement);
        
        // Clear input
        chatInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Simulate bot typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message bot-message typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingIndicator);
        
        // Scroll to bottom again
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Simulate bot response
        setTimeout(() => {
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);
            
            // Add bot response with animation
            const botMessage = getBotResponse(message);
            const botMessageElement = document.createElement('div');
            botMessageElement.className = 'message bot-message fade-in';
            botMessageElement.textContent = botMessage;
            chatMessages.appendChild(botMessageElement);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    function getBotResponse(message) {
        // Simple response logic - in a real app you'd call an API
        message = message.toLowerCase();
        
        if (message.includes('hello') || message.includes('hi')) {
            return "Hello! How can I assist you with your inventory today?";
        } else if (message.includes('inventory')) {
            return "Your current inventory has 78 items. Would you like to see a specific category?";
        } else if (message.includes('food')) {
            return "You have 52 food items in your inventory with a total value of $1,245.80.";
        } else if (message.includes('alcohol') || message.includes('drink')) {
            return "You have 26 alcohol items in your inventory with a total value of $978.50.";
        } else if (message.includes('cost') || message.includes('value')) {
            return "Your total inventory value is $2,224.30. Food: $1,245.80, Alcohol: $978.50.";
        } else if (message.includes('help')) {
            return "I can help you with inventory queries, cost calculations, and finding specific items. Just ask me what you need!";
        } else {
            return "I'm not sure how to help with that. Try asking about your inventory, costs, or specific items.";
        }
    }
    
    // Load data functions with animations
    function loadStatistics() {
        // Show loading first
        const statCards = document.querySelectorAll('#home-page .card');
        statCards.forEach(card => {
            card.style.opacity = '0.6';
        });
        
        // Simulate loading delay
        setTimeout(() => {
            // Update statistics with animation
            animateCounter('processed-docs-count', 0, 5, 1000);
            animateCounter('products-count', 0, 78, 1500);
            animateMoneyCounter('total-value', 0, 2224.30, 1800);
            animateCounter('total-quantity', 0, 387, 1500);
            
            // Restore cards
            statCards.forEach(card => {
                card.style.opacity = '1';
            });
            
            // Load recent documents
            const recentDocumentsContainer = document.getElementById('recent-documents');
            if (recentDocumentsContainer) {
                recentDocumentsContainer.innerHTML = '';
                
                const documents = [
                    { filename: 'Invoice_Week_Ending_Mar_5.pdf', daysAgo: 3, items: 23 },
                    { filename: 'Alcohol_Delivery_March.jpg', daysAgo: 5, items: 15 },
                    { filename: 'Weekly_Food_Inventory.xlsx', daysAgo: 7, items: 40 }
                ];
                
                // Create a document list
                const listGroup = document.createElement('div');
                listGroup.className = 'list-group list-group-flush';
                
                // Add each document with staggered animation
                documents.forEach((doc, index) => {
                    setTimeout(() => {
                        const docEl = document.createElement('a');
                        docEl.href = '#';
                        docEl.className = 'list-group-item list-group-item-action fade-in';
                        docEl.innerHTML = `
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${doc.filename}</h6>
                                <small>${doc.daysAgo} ${doc.daysAgo === 1 ? 'day' : 'days'} ago</small>
                            </div>
                            <p class="mb-1 small">${doc.items} items extracted</p>
                        `;
                        listGroup.appendChild(docEl);
                    }, 300 * index);
                });
                
                recentDocumentsContainer.appendChild(listGroup);
            }
        }, 600);
    }
    
    // Animated counter functions
    function animateCounter(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const range = end - start;
        const minFrame = 30;
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            const currentCount = Math.floor(progress * range + start);
            element.textContent = currentCount.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                element.textContent = end.toString();
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    function animateMoneyCounter(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const range = end - start;
        const minFrame = 30;
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            const currentValue = progress * range + start;
            element.textContent = '$' + currentValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                element.textContent = '$' + end.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    function loadInventory() {
        showLoading();
        
        // Mock inventory data
        const inventoryItems = [
            { id: 1, name: "Premium Vodka 750ml", category: "alcohol", price: 32.99, quantity: 12, packSize: "750ml", delivered: "03/01/2025", status: "In Stock" },
            { id: 2, name: "Red Wine Cabernet", category: "alcohol", price: 24.50, quantity: 8, packSize: "750ml", delivered: "03/02/2025", status: "In Stock" },
            { id: 3, name: "White Wine Chardonnay", category: "alcohol", price: 22.99, quantity: 6, packSize: "750ml", delivered: "03/02/2025", status: "In Stock" },
            { id: 4, name: "Craft Beer IPA", category: "alcohol", price: 12.99, quantity: 24, packSize: "12oz", delivered: "03/03/2025", status: "In Stock" },
            { id: 5, name: "Whiskey Single Malt", category: "alcohol", price: 45.99, quantity: 3, packSize: "750ml", delivered: "03/01/2025", status: "Low Stock" },
            { id: 6, name: "Premium Tequila", category: "alcohol", price: 38.50, quantity: 4, packSize: "750ml", delivered: "03/01/2025", status: "Low Stock" },
            { id: 7, name: "Fresh Salmon Filet", category: "food", price: 12.99, quantity: 15, packSize: "1lb", delivered: "03/05/2025", status: "In Stock" },
            { id: 8, name: "Premium Ground Beef", category: "food", price: 8.99, quantity: 20, packSize: "1lb", delivered: "03/05/2025", status: "In Stock" },
            { id: 9, name: "Fresh Chicken Breast", category: "food", price: 7.50, quantity: 25, packSize: "1lb", delivered: "03/05/2025", status: "In Stock" },
            { id: 10, name: "Organic Mixed Vegetables", category: "food", price: 4.99, quantity: 30, packSize: "1lb", delivered: "03/04/2025", status: "In Stock" },
            { id: 11, name: "Russet Potatoes", category: "food", price: 3.99, quantity: 50, packSize: "5lb", delivered: "03/04/2025", status: "In Stock" },
            { id: 12, name: "Premium Olive Oil", category: "food", price: 18.99, quantity: 8, packSize: "1L", delivered: "03/03/2025", status: "In Stock" }
        ];
        
        // Simulate API delay
        setTimeout(() => {
            hideLoading();
            
            // Populate inventory table
            const tableBody = document.getElementById('inventory-table-body');
            if (tableBody) {
                tableBody.innerHTML = '';
                
                inventoryItems.forEach((item, index) => {
                    setTimeout(() => {
                        const row = document.createElement('tr');
                        row.classList.add('fade-in');
                        
                        // Add status class
                        if (item.status === 'Low Stock') {
                            row.classList.add('low-stock');
                        }
                        
                        // Create row content
                        row.innerHTML = `
                            <td>${item.id}</td>
                            <td>${item.name}</td>
                            <td><span class="badge ${item.category === 'food' ? 'badge-food' : 'badge-alcohol'}">${item.category}</span></td>
                            <td>$${item.price.toFixed(2)}</td>
                            <td>${item.quantity}</td>
                            <td>${item.packSize}</td>
                            <td>${item.delivered}</td>
                            <td>${item.status}</td>
                        `;
                        
                        tableBody.appendChild(row);
                    }, 50 * index); // Staggered animation for each row
                });
            }
        }, 800);
        
        // Set up download buttons
        setupDownloadButtons();
    }
    
    function loadDocuments() {
        showLoading();
        
        // Mock document data
        const documents = [
            { id: 'doc1', filename: 'Invoice_Week_Ending_Mar_5.pdf', processedAt: '2025-03-07T14:30:00Z', itemCount: 23 },
            { id: 'doc2', filename: 'Alcohol_Delivery_March.jpg', processedAt: '2025-03-05T10:15:00Z', itemCount: 15 },
            { id: 'doc3', filename: 'Weekly_Food_Inventory.xlsx', processedAt: '2025-03-03T09:45:00Z', itemCount: 40 }
        ];
        
        // Simulate API delay
        setTimeout(() => {
            hideLoading();
            
            // Populate document list
            const documentList = document.getElementById('document-list');
            if (documentList) {
                documentList.innerHTML = '';
                
                documents.forEach((doc, index) => {
                    setTimeout(() => {
                        const processedDate = new Date(doc.processedAt);
                        const dateString = processedDate.toLocaleDateString();
                        const timeString = processedDate.toLocaleTimeString();
                        
                        const docEl = document.createElement('div');
                        docEl.className = 'card document-card zoom-in';
                        docEl.innerHTML = `
                            <div class="card-body">
                                <h5 class="card-title">${doc.filename}</h5>
                                <h6 class="card-subtitle mb-2 text-muted">Processed: ${dateString} at ${timeString}</h6>
                                <p class="card-text">Items extracted: ${doc.itemCount}</p>
                                <button class="btn btn-sm btn-primary view-document" data-id="${doc.id}">
                                    <i class="bi bi-eye"></i> View Details
                                </button>
                                <button class="btn btn-sm btn-outline-secondary">
                                    <i class="bi bi-download"></i> Download
                                </button>
                            </div>
                        `;
                        
                        documentList.appendChild(docEl);
                    }, 200 * index); // Staggered animation
                });
                
                // Set up document detail viewing
                setTimeout(() => {
                    document.querySelectorAll('.view-document').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const docId = e.target.getAttribute('data-id') || e.target.parentElement.getAttribute('data-id');
                            const doc = documents.find(d => d.id === docId);
                            
                            if (doc) {
                                const detailsEl = document.getElementById('document-details');
                                if (detailsEl) {
                                    // Apply fade-out/fade-in effect
                                    detailsEl.classList.add('fade-out');
                                    
                                    setTimeout(() => {
                                        detailsEl.innerHTML = `
                                            <h5 class="gradient-text">${doc.filename}</h5>
                                            <div class="mb-3">
                                                <strong>Processed:</strong> ${new Date(doc.processedAt).toLocaleString()}
                                            </div>
                                            <div class="mb-3">
                                                <strong>Items Extracted:</strong> ${doc.itemCount}
                                            </div>
                                            <div class="mb-3">
                                                <strong>Summary:</strong>
                                                <ul class="list-unstyled mt-2">
                                                    <li><i class="bi bi-circle-fill text-success me-2" style="font-size: 0.5rem;"></i>Food items: ${doc.id === 'doc3' ? '40' : doc.id === 'doc1' ? '15' : '0'}</li>
                                                    <li><i class="bi bi-circle-fill text-danger me-2" style="font-size: 0.5rem;"></i>Alcohol items: ${doc.id === 'doc2' ? '15' : doc.id === 'doc1' ? '8' : '0'}</li>
                                                    <li><i class="bi bi-circle-fill text-primary me-2" style="font-size: 0.5rem;"></i>Total value: $${doc.id === 'doc1' ? '876.45' : doc.id === 'doc2' ? '542.85' : '805.00'}</li>
                                                </ul>
                                            </div>
                                            <div class="d-grid gap-2">
                                                <button class="btn btn-primary">
                                                    <i class="bi bi-file-earmark-text me-2"></i>View Full Report
                                                </button>
                                                <button class="btn btn-outline-secondary">
                                                    <i class="bi bi-download me-2"></i>Download Raw Data
                                                </button>
                                            </div>
                                        `;
                                        
                                        detailsEl.classList.remove('fade-out');
                                        detailsEl.classList.add('fade-in');
                                    }, 300);
                                }
                            }
                        });
                    });
                }, documents.length * 200 + 100);
            }
        }, 800);
    }
    
    // Set up download buttons
    function setupDownloadButtons() {
        const downloadButtons = [
            { id: 'download-inventory', endpoint: '/api/export/inventory/all', filename: 'complete_inventory.json', label: 'All Items' },
            { id: 'download-food-inventory', endpoint: '/api/export/inventory/food', filename: 'food_inventory.json', label: 'Food Inventory' },
            { id: 'download-alcohol-inventory', endpoint: '/api/export/inventory/alcohol', filename: 'alcohol_inventory.json', label: 'Alcohol Inventory' }
        ];
        
        downloadButtons.forEach(btn => {
            const btnElement = document.getElementById(btn.id);
            if (btnElement) {
                btnElement.addEventListener('click', () => {
                    // Show loading indicator
                    btnElement.disabled = true;
                    const originalText = btnElement.innerHTML;
                    btnElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Downloading...';
                    
                    // In a real app, you'd fetch from the API:
                    /*
                    fetch(btn.endpoint)
                        .then(response => {
                            if (!response.ok) throw new Error('Download failed');
                            return response.json();
                        })
                        .then(data => {
                            if (data.file) {
                                // Create download link
                                const a = document.createElement('a');
                                a.href = data.file;
                                a.download = btn.filename || data.filename || 'inventory_export.json';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                
                                showToast(`<i class="bi bi-check-circle-fill me-2"></i>${btn.label} downloaded successfully!`);
                            } else {
                                showToast('<i class="bi bi-exclamation-triangle-fill me-2"></i>No data available to download', 'warning');
                            }
                        })
                        .catch(error => {
                            console.error('Download error:', error);
                            showToast(`<i class="bi bi-exclamation-triangle-fill me-2"></i>Download failed: ${error.message}`, 'danger');
                        })
                        .finally(() => {
                            btnElement.disabled = false;
                            btnElement.innerHTML = originalText;
                        });
                    */
                    
                    // For demo, simulate download
                    setTimeout(() => {
                        showToast(`<i class="bi bi-check-circle-fill me-2"></i>${btn.label} downloaded successfully!`);
                        btnElement.disabled = false;
                        btnElement.innerHTML = originalText;
                    }, 1500);
                });
            }
        });
    }
    
    // Month management with animation
    const startNewMonthButtons = document.querySelectorAll('#start-new-month, #home-start-new-month, #upload-start-new-month, #docs-start-new-month');
    startNewMonthButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                // Confirmation dialog with custom styling
                const isConfirmed = confirm('Start a new month? This will archive the current month and create a new one.');
                
                if (isConfirmed) {
                    showLoading();
                    
                    // For demo, simulate API call
                    setTimeout(() => {
                        hideLoading();
                        const nextMonth = 'April 2025';
                        
                        // Update month display with animation
                        document.querySelectorAll('#current-month, #home-current-month, #upload-current-month, #docs-current-month')
                            .forEach(el => {
                                if (el) {
                                    el.textContent = nextMonth;
                                    el.classList.add('pulse');
                                    setTimeout(() => el.classList.remove('pulse'), 2000);
                                }
                            });
                            
                        showToast(`<i class="bi bi-check-circle-fill me-2"></i>Started new month: ${nextMonth}`);
                        loadStatistics();
                    }, 1500);
                }
            });
        }
    });
    
    // Initialize the application
    loadStatistics();
});
