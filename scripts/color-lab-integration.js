// ============================================
// COLOR LAB INTEGRATION MODULE
// ============================================

class ColorLabIntegration {
    constructor(IDE) {
        this.IDE = IDE;
        this.isInitialized = false;
        
        // State
        this.isColorLabOpen = false;
        this.currentContext = null;
        this.colorHistory = [];
        this.lastDetectionTime = 0;
        this.highlightMarkers = []; 
        
        // Elements
        this.floatingBtn = null;
        this.sidebar = null;
        this.iframe = null;
        this.historyPanel = null;
        
        // Configuration
        this.config = {
            debounceDelay: 300,
            maxHistoryItems: 20,
            autoCloseDelay: 200,
            alwaysHighlightColors: false,
            colorKeywords: [
                'color:', 'background:', 'background-color:', 'fill:', 'stroke:',
                'border-color:', 'outline-color:', 'text-decoration-color:',
                'box-shadow:', 'text-shadow:', 'rgba(', 'hsl(', 'hsla(', '#'
            ],
            quickInsertFormats: ['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'oklch']
        };
        
        this.init();
    }
    
    // ==================== INITIALIZATION ====================
    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Color Lab Integration...');
        
        // 1. Create DOM elements
        this.createFloatingButton();
        this.createSidebar();
        this.createHistoryPanel();
        
        // 2. Setup event listeners
        this.setupEditorListeners();
        this.setupKeyboardShortcuts();
        this.setupMessageHandler();
        
        // 3. Load saved history
        this.loadColorHistory();
        
        this.isInitialized = true;
        console.log('✅ Color Lab Integration initialized');
    }
    
    // ==================== DOM ELEMENTS CREATION ====================
    createFloatingButton() {
        this.floatingBtn = document.createElement('button');
        this.floatingBtn.className = 'color-lab-floating-btn';
        this.floatingBtn.innerHTML = '<i class="fas fa-palette"></i>';
        this.floatingBtn.title = 'Open Color Lab (Ctrl+Shift+C)';
        this.floatingBtn.setAttribute('aria-label', 'Open Color Lab');
        
        // Position dalam container editor
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(this.floatingBtn);
        }
        
        // Event listeners
        this.floatingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openColorLab();
        });
        
        // Drag functionality (optional)
        this.makeDraggable(this.floatingBtn);
    }
    
    createSidebar() {
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'color-lab-sidebar';
        this.sidebar.id = 'color-lab-sidebar';
        this.sidebar.innerHTML = `
            <div class="color-lab-header">
                <div class="logo">
                    <i class="fas fa-palette"></i>
                    <span>Chroma Color Lab</span>
                </div>
                <div class="header-actions">
                    <button class="btn btn-icon" onclick="IDE.ColorLab.toggleHistory()" title="Color History">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="btn btn-icon" onclick="IDE.ColorLab.closeColorLab()" title="Close (ESC)">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="color-lab-iframe-container">
                <iframe 
                    src="./src/ChromaColorLab.html" 
                    class="color-lab-iframe"
                    id="chroma-iframe"
                    allow="clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    loading="eager"
                ></iframe>
            </div>
        `;
        
        document.body.appendChild(this.sidebar);
    }
    
    createHistoryPanel() {
        this.historyPanel = document.createElement('div');
        this.historyPanel.className = 'color-history-panel';
        this.historyPanel.innerHTML = `
            <div class="color-history-header">
                <h4>Color History</h4>
                <div class="header-actions">
                    <button class="btn btn-icon" onclick="IDE.ColorLab.clearHistory()" title="Clear History">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-icon" onclick="IDE.ColorLab.toggleHistory()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="color-history-list" id="color-history-list">
                <!-- History items will be populated here -->
            </div>
        `;
        
        document.body.appendChild(this.historyPanel);
    }
    
    // ==================== EDITOR INTEGRATION ====================
    setupEditorListeners() {
        if (!this.IDE.editor) {
            console.warn('IDE editor not available, retrying in 1s...');
            setTimeout(() => this.setupEditorListeners(), 1000);
            return;
        }
        
        const editor = this.IDE.editor;
        
        // 1. Listen for cursor changes dengan debounce
        let debounceTimer;
        editor.on('changeSelection', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.detectColorContext();
            }, this.config.debounceDelay);
        });
        
        // 2. Listen for text changes
        editor.on('change', () => {
            this.hideFloatingButton();
        });
        
        // 3. Click pada warna di editor
        editor.container.addEventListener('click', (e) => {
            if (e.altKey) {
                // Alt+Click untuk quick color pick
                this.handleAltClick(e);
            }
        });
        
        // 4. Highlight colors in editor
        this.setupColorHighlighter();
    }
    
    detectColorContext() {
        if (!this.IDE.editor || this.isColorLabOpen) return;
        
        const editor = this.IDE.editor;
        const cursor = editor.getCursorPosition();
        const line = editor.session.getLine(cursor.row);
        
        // Cek jika kursor dekat dengan keyword warna
        const isNearColorKeyword = this.isNearColorKeyword(line, cursor.column);
        
        if (isNearColorKeyword) {
            // Show floating button di posisi kursor
            this.showFloatingButtonAtCursor(cursor);
            
            // Extract warna jika ada di line
            const color = this.extractColorFromLine(line);
            if (color) {
                this.currentContext = {
                    line: cursor.row,
                    column: cursor.column,
                    color: color
                };
            } else {
                this.currentContext = {
                    line: cursor.row,
                    column: cursor.column
                };
            }
        } else {
            this.hideFloatingButton();
            this.currentContext = null;
        }
    }
    
    isNearColorKeyword(line, column) {
        // Ambil 50 karakter sebelum kursor
        const start = Math.max(0, column - 50);
        const context = line.substring(start, column);
        
        // Cek keyword
        return this.config.colorKeywords.some(keyword => 
            context.includes(keyword)
        );
    }
    
    extractColorFromLine(line) {
        // Regex untuk berbagai format warna
        const colorRegex = /(#[\da-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\))/gi;
        const match = line.match(colorRegex);
        return match ? match[0] : null;
    }
    
    showFloatingButtonAtCursor(cursor) {
        if (!this.floatingBtn || !this.IDE.editor) return;
        
        // Hitung posisi dalam pixel
        const renderer = this.IDE.editor.renderer;
        const pos = renderer.textToScreenCoordinates(cursor.row, cursor.column);
        
        // Offset untuk tidak menutupi teks
        const offsetX = 30;
        const offsetY = -20;
        
        this.floatingBtn.style.left = `${pos.pageX + offsetX}px`;
        this.floatingBtn.style.top = `${pos.pageY + offsetY}px`;
        this.floatingBtn.style.display = 'flex';
        
        // Auto hide setelah beberapa detik
        clearTimeout(this.autoHideTimer);
        this.autoHideTimer = setTimeout(() => {
            this.hideFloatingButton();
        }, 5000);
    }
    
    hideFloatingButton() {
        if (this.floatingBtn) {
            this.floatingBtn.style.display = 'none';
        }
    }
    
    // ==================== COLOR LAB INTERACTION ====================
    openColorLab(color = null) {
        // 1. Buka sidebar
        this.sidebar.classList.add('open');
        this.isColorLabOpen = true;
        
        // 2. Sembunyikan floating button
        this.hideFloatingButton();
        
        // 3. Focus ke iframe
        setTimeout(() => {
            this.iframe = document.getElementById('chroma-iframe');
            if (this.iframe) {
                this.iframe.focus();
                
                // 4. Kirim warna ke Chroma Lab jika ada
                if (color || this.currentContext?.color) {
                    this.sendToColorLab('SET_COLOR', {
                        color: color || this.currentContext.color
                    });
                }
            }
        }, 100);
        
        this.IDE.logToConsole('Color Lab opened', 'info');
    }
    
// ==================== COLOR LAB INTERACTION ====================
closeColorLab() { // ← GANTI NAMA DARI close() KE closeColorLab()
        console.log('🔒 Closing Color Lab...');
        
        if (!this.sidebar) {
            console.warn('❌ Sidebar element not found');
            return;
        }
        
        this.sidebar.classList.remove('open');
        this.isColorLabOpen = false;
        this.hideHistoryPanel();
        
        // Focus kembali ke editor
        if (this.IDE.editor) {
            setTimeout(() => {
                this.IDE.editor.focus();
            }, 100);
        }
        
        console.log('✅ Color Lab closed');
    }
    
    
toggleHistory() {
    if (this.historyPanel.classList.contains('open')) {
        this.hideHistoryPanel();
    } else {
        this.showHistoryPanel();
    }
}
    
    showHistoryPanel() {
        this.updateHistoryUI();
        this.historyPanel.classList.add('open');
        
        // Position near sidebar
        const sidebarRect = this.sidebar.getBoundingClientRect();
        this.historyPanel.style.right = `${window.innerWidth - sidebarRect.left + 20}px`;
        this.historyPanel.style.bottom = '40px';
    }
    
    hideHistoryPanel() {
        this.historyPanel.classList.remove('open');
    }
    
    // ==================== COLOR HISTORY MANAGEMENT ====================
    addToHistory(color, format = 'hex') {
        // Avoid duplicates
        const exists = this.colorHistory.some(item => 
            item.color.toLowerCase() === color.toLowerCase()
        );
        
        if (exists) return;
        
        const historyItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            color: color,
            format: format,
            timestamp: Date.now(),
            file: this.IDE.state.currentFile,
            line: this.currentContext?.line
        };
        
        // Add to beginning
        this.colorHistory.unshift(historyItem);
        
        // Limit items
        if (this.colorHistory.length > this.config.maxHistoryItems) {
            this.colorHistory.pop();
        }
        
        // Save to localStorage
        this.saveColorHistory();
        
        // Update UI
        this.updateHistoryUI();
    }
    
    updateHistoryUI() {
        const listContainer = document.getElementById('color-history-list');
        if (!listContainer) return;
        
        if (this.colorHistory.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-palette" style="font-size: 24px; opacity: 0.3; margin-bottom: 8px; display: block;"></i>
                    <div style="font-size: 12px;">No color history yet</div>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = this.colorHistory.map(item => `
            <div class="color-history-item" onclick="IDE.ColorLab.useHistoryColor('${item.id}')">
                <div class="color-history-swatch" style="background-color: ${item.color};"></div>
                <div class="color-history-info">
                    <div class="color-history-hex">${item.color}</div>
                    <div class="color-history-time">
                        ${this.formatTimeAgo(item.timestamp)}
                        ${item.file ? `• ${item.file.split('/').pop()}` : ''}
                    </div>
                </div>
                <button class="btn btn-icon" onclick="IDE.ColorLab.removeFromHistory('${item.id}', event)" style="padding: 4px;">
                    <i class="fas fa-times" style="font-size: 12px;"></i>
                </button>
            </div>
        `).join('');
    }
    
    useHistoryColor(id) {
        const item = this.colorHistory.find(i => i.id === id);
        if (!item) return;
        
        this.insertColorIntoEditor(item.color);
        this.hideHistoryPanel();
    }
    
    removeFromHistory(id, event) {
        if (event) event.stopPropagation();
        
        this.colorHistory = this.colorHistory.filter(item => item.id !== id);
        this.saveColorHistory();
        this.updateHistoryUI();
    }
    
    clearHistory() {
        if (!confirm('Clear all color history?')) return;
        
        this.colorHistory = [];
        this.saveColorHistory();
        this.updateHistoryUI();
        this.IDE.showToast('History Cleared', 'Color history cleared', 'success');
    }
    
    saveColorHistory() {
        try {
            localStorage.setItem('terra_color_history', JSON.stringify(this.colorHistory));
        } catch (e) {
            console.warn('Failed to save color history:', e);
        }
    }
    
    loadColorHistory() {
        try {
            const saved = localStorage.getItem('terra_color_history');
            if (saved) {
                this.colorHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load color history:', e);
        }
    }
    
    // ==================== COLOR INSERTION ====================
insertColorIntoEditor(color, format = null) {
    console.log('🖋️ insertColorIntoEditor called:', { color, format });
    
    if (!this.IDE.editor) {
        console.error('❌ Editor not available');
        return false;
    }
    
    if (!color) {
        console.error('❌ No color provided');
        return false;
    }
    
    // PERBAIKAN: Clean color jika perlu
    if (typeof color === 'object') {
        if (color.color) color = color.color;
        else if (color.hex) color = color.hex;
        else if (color.value) color = color.value;
        else {
            console.error('❌ Invalid color object:', color);
            return false;
        }
    }
    
    console.log(`🖋️ Inserting color: "${color}"`);
    
    const editor = this.IDE.editor;
    const session = editor.session;
    
    // Jika ada context, insert di posisi context
    if (this.currentContext) {
        const { line, column } = this.currentContext;
        
        // Cari posisi yang tepat untuk insert
        const insertPos = this.findInsertPosition(line, column, color);
        
        if (insertPos) {
            session.insert(insertPos, color + ' ');
            
            // Move cursor after inserted color
            editor.moveCursorTo(insertPos.row, insertPos.column + color.length + 1);
            
            // Mark as modified
            this.IDE.state.modifiedFiles.add(this.IDE.state.currentFile);
            this.IDE.updateTabStatus();
            
            // Add to history
            this.addToHistory(color, format || this.detectFormat(color));
            
            this.IDE.logToConsole(`Color inserted: ${color}`, 'success');
            this.IDE.showToast('Color Inserted', `${color} added to editor`, 'success');
            
            // Auto-close sidebar jika open
            if (this.isColorLabOpen) {
                setTimeout(() => this.closeColorLab(), this.config.autoCloseDelay);
            }
            
            return true;
        }
    }
    
    // Fallback: insert at cursor position
    const cursor = editor.getCursorPosition();
    session.insert(cursor, color + ' ');
    
    this.addToHistory(color, format || this.detectFormat(color));
    this.IDE.logToConsole(`Color inserted at cursor: ${color}`, 'info');
    
    return true;
}
    
    findInsertPosition(line, column, color) {
        const session = this.IDE.editor.session;
        const lineText = session.getLine(line);
        
        // Cari keyword warna terdekat
        for (let i = column; i < lineText.length; i++) {
            if (lineText[i] === ':' && i > 0 && lineText[i-1].match(/\w/)) {
                // Found property dengan colon
                return { row: line, column: i + 1 };
            }
        }
        
        // Cari dari kursor ke kiri
        for (let i = column; i >= 0; i--) {
            if (lineText[i] === ':' && i > 0 && lineText[i-1].match(/\w/)) {
                return { row: line, column: i + 1 };
            }
        }
        
        // Default: posisi kursor
        return { row: line, column: column };
    }
    
    detectFormat(color) {
        if (color.startsWith('#')) return 'hex';
        if (color.startsWith('rgb')) return color.includes('a') ? 'rgba' : 'rgb';
        if (color.startsWith('hsl')) return color.includes('a') ? 'hsla' : 'hsl';
        if (color.startsWith('oklch')) return 'oklch';
        return 'unknown';
    }
    
    // ==================== COMMUNICATION WITH CHROMA LAB ====================
setupMessageHandler() {
    window.addEventListener('message', (event) => {
        // Safety check
        if (event.source !== this.iframe?.contentWindow) return;
        
        const message = event.data;
        if (!message) return;
        
        console.log('📨 Message from Color Lab:', message);
        
        // PERBAIKAN: Handle berbagai format message
        if (typeof message === 'string') {
            // Message langsung berupa string color
            this.handleColorSelected(message);
            return;
        }
        
        if (typeof message !== 'object') return;
        
        const { type } = message;
        const data = message.data || message; // ← PERBAIKAN: ambil data atau langsung message
        
        switch (type) {
            case 'COLOR_SELECTED':
                this.handleColorSelected(data || message);
                break;
                
            case 'COLOR_PALETTE':
                this.handleColorPalette(data || message);
                break;
                
            case 'DARK_MODE_THEME':
                this.handleDarkModeTheme(data || message);
                break;
                
            case 'CLOSE_REQUEST':
                this.closeColorLab();
                break;
                
            case 'READY':
                console.log('✅ Chroma Color Lab is ready');
                // Kirim warna saat ini jika ada
                if (this.currentContext?.color) {
                    this.sendToColorLab('SET_COLOR', { color: this.currentContext.color });
                }
                break;
                
                // PERBAIKAN: Handle tanpa type (direct color)
            default:
                if (message.color || message.hex || message.startsWith?.('#')) {
                    this.handleColorSelected(message);
                }
                break;
        }
    });
}

handleColorSelected(data) {
    console.log('📨 handleColorSelected called with:', data);
    
    // PERBAIKAN: Data bisa berupa object atau langsung color string
    let color = '';
    let format = 'hex';
    
    if (typeof data === 'string') {
        // Data langsung berupa string color
        color = data;
    } else if (data && typeof data === 'object') {
        // Data berupa object dengan property color
        color = data.color || data.data?.color || data;
        format = data.format || data.data?.format || 'hex';
        
        // Jika color masih object, ambil dari data.data
        if (color && typeof color === 'object') {
            color = color.color || color.hex || JSON.stringify(color);
        }
    }
    
    if (!color) {
        console.error('❌ No color found in data:', data);
        return;
    }
    
    console.log(`🎨 Extracted color: ${color}, format: ${format}`);
    
    // Insert ke editor
    this.insertColorIntoEditor(color, format);
    
    // Show quick insert modal jika ada alternative formats
    if (data && data.alternativeFormats) {
        this.showQuickInsertModal(data.alternativeFormats);
    } else if (data && data.data && data.data.alternativeFormats) {
        this.showQuickInsertModal(data.data.alternativeFormats);
    }
}
    
    handleColorPalette(data) {
        const { base, tints, shades, harmonies } = data;
        
        // Tampilkan palette dalam modal
        this.showPaletteModal({ base, tints, shades, harmonies });
        
        this.IDE.logToConsole(`Palette received for ${base}`, 'info');
    }
    
    handleDarkModeTheme(data) {
        const { theme } = data;
        
        // Insert sebagai CSS variables
        const css = `/* Dark Mode Theme */
:root {
    --color-primary: ${theme.base};
    --color-dark-bg: ${theme.dark.background};
    --color-dark-surface: ${theme.dark.surface};
    --color-dark-accent: ${theme.dark.accent};
    --color-dark-text: ${theme.dark.textPrimary};
    --color-dark-text-secondary: ${theme.dark.textSecondary};
}`;
        
        this.insertColorIntoEditor(css);
        this.IDE.showToast('Dark Theme Inserted', 'CSS variables added', 'success');
    }
    
    sendToColorLab(type, data) {
        if (!this.iframe || !this.iframe.contentWindow) {
            console.warn('Color Lab iframe not ready');
            return;
        }
        
        try {
            this.iframe.contentWindow.postMessage({ type, ...data }, '*');
        } catch (error) {
            console.error('Failed to send message to Color Lab:', error);
        }
    }
    
    // ==================== UI COMPONENTS ====================
    showQuickInsertModal(formats) {
        // Hapus modal sebelumnya
        document.querySelectorAll('.quick-color-modal').forEach(el => el.remove());
        
        // Buat modal baru
        const modal = document.createElement('div');
        modal.className = 'quick-color-modal open';
        
        // Tambahkan options untuk setiap format
        modal.innerHTML = `
            <div class="quick-color-option" onclick="IDE.ColorLab.insertColorIntoEditor('${formats.hex}')">
                <div class="quick-color-swatch" style="background-color: ${formats.hex};"></div>
                <span>${formats.hex}</span>
                <span style="margin-left: auto; font-size: 11px; color: var(--text-tertiary);">HEX</span>
            </div>
            <div class="quick-color-option" onclick="IDE.ColorLab.insertColorIntoEditor('${formats.rgb}')">
                <div class="quick-color-swatch" style="background-color: ${formats.hex};"></div>
                <span>${formats.rgb}</span>
                <span style="margin-left: auto; font-size: 11px; color: var(--text-tertiary);">RGB</span>
            </div>
            <div class="quick-color-option" onclick="IDE.ColorLab.insertColorIntoEditor('${formats.hsl}')">
                <div class="quick-color-swatch" style="background-color: ${formats.hex};"></div>
                <span>${formats.hsl}</span>
                <span style="margin-left: auto; font-size: 11px; color: var(--text-tertiary);">HSL</span>
            </div>
            ${formats.oklch ? `
            <div class="quick-color-option" onclick="IDE.ColorLab.insertColorIntoEditor('${formats.oklch}')">
                <div class="quick-color-swatch" style="background-color: ${formats.hex};"></div>
                <span>${formats.oklch}</span>
                <span style="margin-left: auto; font-size: 11px; color: var(--text-tertiary);">OKLCH</span>
            </div>
            ` : ''}
        `;
        
        // Position modal dekat floating button
        const rect = this.floatingBtn.getBoundingClientRect();
        modal.style.position = 'fixed';
        modal.style.top = `${rect.bottom + 10}px`;
        modal.style.left = `${rect.left}px`;
        
        document.body.appendChild(modal);
        
        // Auto close ketika klik di luar
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!modal.contains(e.target) && e.target !== this.floatingBtn) {
                    modal.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    showPaletteModal(palette) {
        const modalHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;">
                <div style="background: var(--bg-surface); border-radius: 16px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Color Palette</h3>
                        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()"
                                style="background: none; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">×</button>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Base Color</div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 8px; background: ${palette.base}; border: 1px solid var(--border-color);"></div>
                            <div>
                                <div style="font-weight: 600; font-family: monospace;">${palette.base}</div>
                                <button onclick="navigator.clipboard.writeText('${palette.base}')"
                                        style="background: none; border: none; color: var(--accent); font-size: 11px; cursor: pointer; margin-top: 4px;">
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Tints</div>
                            ${palette.tints.map(tint => `
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 8px; border-radius: 8px; background: var(--bg-tertiary);">
                                    <div style="width: 24px; height: 24px; border-radius: 4px; background: ${tint};"></div>
                                    <span style="font-family: monospace; font-size: 12px;">${tint}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Shades</div>
                            ${palette.shades.map(shade => `
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 8px; border-radius: 8px; background: var(--bg-tertiary);">
                                    <div style="width: 24px; height: 24px; border-radius: 4px; background: ${shade};"></div>
                                    <span style="font-family: monospace; font-size: 12px;">${shade}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-top: 24px;">
                        <button onclick="IDE.ColorLab.insertPaletteAsCSS(${JSON.stringify(palette).replace(/"/g, '&quot;')})"
                                style="width: 100%; padding: 12px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Insert as CSS Variables
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    insertPaletteAsCSS(palette) {
        const css = `/* Color Palette: ${palette.base} */
:root {
    --color-primary: ${palette.base};
    
    /* Tints */
    ${palette.tints.map((tint, i) => `--color-tint-${i + 1}: ${tint};`).join('\n    ')}
    
    /* Shades */
    ${palette.shades.map((shade, i) => `--color-shade-${i + 1}: ${shade};`).join('\n    ')}
}`;
        
        this.insertColorIntoEditor(css);
        document.querySelector('div[style*="position: fixed"]')?.remove();
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
    
setupColorHighlighter() {
    if (!this.IDE.editor) return;
    
    const session = this.IDE.editor.session;
    this.highlightMarkers = []; // Array untuk simpan marker IDs
    
    // Debounce highlight untuk performance
    let highlightTimeout;
    
    const debouncedHighlight = () => {
        clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => {
            this.highlightColorsInEditor();
        }, 300); // Debounce 300ms
    };
    
    // Update highlight ketika content berubah
    this.IDE.editor.on('change', debouncedHighlight);
    
    // Juga update saat cursor move
    this.IDE.editor.on('changeSelection', debouncedHighlight);
    
    // Initial highlight
    setTimeout(() => this.highlightColorsInEditor(), 500);
}

highlightColorsInEditor() {
    if (!this.IDE.editor) return;
    
    const session = this.IDE.editor.session;
    
    // 1. HAPUS SEMUA MARKER LAMA
    if (this.highlightMarkers && this.highlightMarkers.length > 0) {
        this.highlightMarkers.forEach(markerId => {
            try {
                session.removeMarker(markerId);
            } catch (e) {
                // Ignore jika marker tidak ditemukan
            }
        });
        this.highlightMarkers = [];
    }
    
    // 2. Hanya highlight jika Color Lab terbuka atau mode aktif
    if (!this.isColorLabOpen && !this.config.alwaysHighlightColors) {
        return;
    }
    
    const docLength = session.getLength();
    
    // 3. Regex yang lebih spesifik untuk warna CSS
    const colorRegex = /(#[\da-f]{3,6}\b|#[\da-f]{8}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)|hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+)?\s*\))/gi;
    
    // 4. Limit jumlah highlight (performance)
    let highlightCount = 0;
    const maxHighlights = 50;
    
    for (let i = 0; i < docLength && highlightCount < maxHighlights; i++) {
        const line = session.getLine(i);
        let match;
        
        while ((match = colorRegex.exec(line)) !== null && highlightCount < maxHighlights) {
            const range = new ace.Range(
                i, match.index,
                i, match.index + match[0].length
            );
            
            try {
                // Add highlight class dengan marker yang lebih subtle
                const markerId = session.addMarker(range, 'ace_color-highlight', 'text', false);
                this.highlightMarkers.push(markerId);
                highlightCount++;
            } catch (e) {
                console.warn('Failed to add marker:', e);
            }
        }
    }
    
    console.log(`🔍 Highlighted ${highlightCount} colors in editor`);
}
    
    handleAltClick(e) {
        // Alt+Click pada color highlight
        const target = e.target;
        if (target.classList.contains('ace_color-highlight') || 
            target.closest('.ace_color-highlight')) {
            
            // Extract color dari line
            const editor = this.IDE.editor;
            const cursor = editor.getCursorPosition();
            const line = editor.session.getLine(cursor.row);
            const color = this.extractColorFromLine(line);
            
            if (color) {
                this.openColorLab(color);
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+C untuk buka Color Lab
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.openColorLab();
            }
            
            // ESC untuk close
            if (e.key === 'Escape' && this.isColorLabOpen) {
                this.close();
            }
            
            // Ctrl+Shift+H untuk toggle history
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.toggleHistory();
            }
        });
    }
}

// ==================== PUBLIC API ====================
// Method yang bisa dipanggil dari IDE atau dari inline onclick

    ColorLabIntegration.prototype.open = function(color) {
        this.openColorLab(color);
    };
    
    ColorLabIntegration.prototype.close = function() { // ← PUBLIC API
        this.closeColorLab(); // ← PANGGIL METHOD INTERNAL
    };
    
    ColorLabIntegration.prototype.toggle = function() {
        if (this.isColorLabOpen) {
            this.closeColorLab(); // ← PANGGIL METHOD INTERNAL
        } else {
            this.openColorLab();
        }
    };

ColorLabIntegration.prototype.insertColor = function(color) {
    this.insertColorIntoEditor(color);
};

ColorLabIntegration.prototype.showHistory = function() {
    this.showHistoryPanel();
};

ColorLabIntegration.prototype.hideHistory = function() {
    this.hideHistoryPanel();
};

// ==================== GLOBAL EXPORT ====================
// Akan di-attach ke IDE object di main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorLabIntegration;
}