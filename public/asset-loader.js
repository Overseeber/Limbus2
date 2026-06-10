// ==========================
// 📦 STAGED ASSET LOADER
// ==========================
// Multi-stage loading system for fast startup
//
// Stage 1 (BOOT):  Only loads assets from public/data/main and public/data/fonts
// Stage 2 (MENU):  Loads all gameplay assets in background (character atlases, battle UI, particles, etc.)
// Stage 3 (READY): All assets loaded, game can proceed to match
//
// Progress tracking integrates with existing loading systems.
// ==========================

const ASSET_LOADER = {
  // Stages
  STAGE_BOOT: 'boot',
  STAGE_MENU: 'menu',
  STAGE_READY: 'ready',
  
  // Current stage
  currentStage: 'boot',
  
  // Loading state
  bootComplete: false,
  menuLoadingStarted: false,
  menuComplete: false,
  
  // Progress tracking
  totalBootAssets: 0,
  loadedBootAssets: 0,
  totalMenuAssets: 0,
  loadedMenuAssets: 0,
  
  // Boot asset paths (Stage 1 - loaded in preload)
  bootAssets: {
    images: [
      'data/main/opnbkg.png',
      'data/main/opnblight.png',
      'data/main/opncrk.png',
      'data/main/opnlight.png',
      'data/main/opnlogo.png',
      'data/main/opnlstil.png',
      'data/main/opnstl.png',
      'data/main/opnstr.png'
    ]
  },
  //load game fonts
//   Fonts
// Excelsior: hp, status and dmg numbs
// Mikodacs: titles
// Bebas Kai: subheadings
// Liberation sans: body text
  bootFonts: {
    Excelsior: 'data/fonts/Excelsior-Regular.ttf',
    Mikodacs: 'data/fonts/Mikodacs.ttf',
    BebasKai: 'data/fonts/BebasKai-Regular.ttf',
    LiberationSans: 'data/fonts/LiberationSans-Regular.ttf'
  },

  // Menu gameplay assets (Stage 2 - loaded after boot)
  menuAssets: {
    // Will be populated dynamically
    images: []
  },
  
  // Callbacks
  onBootComplete: null,
  onMenuProgress: null,
  onMenuComplete: null,
  
  /**
   * Initialize the asset loader
   */
  init() {
    this.currentStage = this.STAGE_BOOT;
    this.bootComplete = false;
    this.menuLoadingStarted = false;
    this.menuComplete = false;
    this.loadedBootAssets = 0;
    this.loadedMenuAssets = 0;
    
    // Count boot assets (images + fonts)
    this.totalBootAssets = this.bootAssets.images.length + Object.keys(this.bootFonts).length;
    
    console.log(`[AssetLoader] Initialized. Boot assets: ${this.totalBootAssets} (${this.bootAssets.images.length} images + ${Object.keys(this.bootFonts).length} fonts)`);
  },
  
  /**
   * Mark a boot asset as loaded
   */
  onBootAssetLoaded() {
    this.loadedBootAssets++;
    if (this.loadedBootAssets >= this.totalBootAssets) {
      this.bootComplete = true;
      console.log('[AssetLoader] Stage 1 (BOOT) complete');
      if (this.onBootComplete) this.onBootComplete();
    }
  },
  
  /**
   * Start loading menu/gameplay assets (Stage 2)
   * Called after boot assets are displayed
   */
  startMenuAssetLoading() {
    if (this.menuLoadingStarted) return;
    this.menuLoadingStarted = true;
    
    console.log('[AssetLoader] Starting Stage 2 (MENU) asset loading');
    
    // Build the list of all gameplay assets that need to load
    this._buildMenuAssetList();
    
    // Start loading
    this._loadMenuAssets();
  },
  
  /**
   * Build the list of all menu-stage assets
   */
  _buildMenuAssetList() {
    const assets = [];
    
    // Battle backgrounds
    assets.push('data/batlbkg/bkgsy.png');
    assets.push('data/batlbkg/bkgtr.png');
    assets.push('data/batlbkg/bkgflr.png');
    assets.push('data/batlbkg/bkgview.png');
    
    // Shadow and stagger particles
    assets.push('data/particles/shade.png');
    assets.push('data/particles/stagger.png');
    assets.push('data/particles/particles.png');
    
    // Ultimate intro images
    assets.push('data/UI/rendspaceint.png');
    assets.push('data/UI/disposalint.png');
    assets.push('data/UI/closingint.png');
    
    // UI assets
    assets.push('data/UI/uivin.png');
    assets.push('data/UI/battleui.png');
    assets.push('data/UI/status.png');
    
    // Character atlases - Valencina
    assets.push('data/valencina/val1.png');
    assets.push('data/valencina/val2.png');
    assets.push('data/valencina/val3.png');
    assets.push('data/valencina/valdisposal.png');
    assets.push('data/valencina/vslash1.png');
    assets.push('data/valencina/vslash2.png');
    
    // Character atlases - Callisto
    assets.push('data/callisto/Cal1.png');
    assets.push('data/callisto/Cal2.png');
    assets.push('data/callisto/Cal3.png');
    assets.push('data/callisto/Cal4.png');
    assets.push('data/callisto/Cal5.png');
    assets.push('data/callisto/Cslash1.png');
    assets.push('data/callisto/Cslash2.png');
    assets.push('data/callisto/Cslash3.png');
    
    // Character atlases - Dihui
    assets.push('data/dihui/Star1.png');
    assets.push('data/dihui/Star2.png');
    assets.push('data/dihui/Star3.png');
    assets.push('data/dihui/Star4.png');
    assets.push('data/dihui/Star5.png');
    assets.push('data/dihui/Star6.png');
    assets.push('data/dihui/Dslash.png');
    
    this.menuAssets.images = assets;
    this.totalMenuAssets = assets.length;
    this.loadedMenuAssets = 0;
    
    console.log(`[AssetLoader] Stage 2 will load ${this.totalMenuAssets} assets`);
  },
  
  /**
   * Load all menu-stage assets using p5.js loadImage
   * Each asset stores into the atlases object or window as appropriate
   */
  _loadMenuAssets() {
    // Load background images
    window.bgSky = loadImage('data/batlbkg/bkgsy.png', () => this._onMenuAssetLoaded());
    window.bgTr = loadImage('data/batlbkg/bkgtr.png', () => this._onMenuAssetLoaded());
    window.bgFlr = loadImage('data/batlbkg/bkgflr.png', () => this._onMenuAssetLoaded());
    window.bgView = loadImage('data/batlbkg/bkgview.png', () => this._onMenuAssetLoaded());
    
    // Load shadow and stagger
    window.shadowImg = loadImage('data/particles/shade.png', () => {
      this._onMenuAssetLoaded();
      console.log('Shadow image loaded successfully');
    }, (err) => {
      this._onMenuAssetLoaded();
      console.error('Failed to load shadow image:', err);
    });
    window.staggerImg = loadImage('data/particles/stagger.png', () => {
      this._onMenuAssetLoaded();
      console.log('Stagger image loaded successfully');
    }, (err) => {
      this._onMenuAssetLoaded();
      console.error('Failed to load stagger image:', err);
    });
    
    // Load particles atlas to window (for compatibility with particle system)
    window.particlesImg = loadImage('data/particles/particles.png', () => {
      this._onMenuAssetLoaded();
      console.log('Particles image loaded successfully');
    });
    
    // Load ultimate intro images
    window.ultimateImages = window.ultimateImages || {};
    window.ultimateImages.rendspace = loadImage('data/UI/rendspaceint.png', () => {
      this._onMenuAssetLoaded();
    }, (err) => console.error('Failed to load rendspace intro image:', err));
    window.ultimateImages.disposal = loadImage('data/UI/disposalint.png', () => {
      this._onMenuAssetLoaded();
    }, (err) => console.error('Failed to load disposal intro image:', err));
    window.ultimateImages.closing = loadImage('data/UI/closingint.png', () => {
      this._onMenuAssetLoaded();
    }, (err) => console.error('Failed to load closing time intro image:', err));
    
    // Load UI vignette
    window.uiVignette = loadImage('data/UI/uivin.png', () => {
      this._onMenuAssetLoaded();
    }, (err) => console.error('Failed to load UI vignette image:', err));
    
    // Load battle UI atlas
    atlases.battleui = loadImage('data/UI/battleui.png', () => {
      this._onMenuAssetLoaded();
      // Pre-cache sprite data after battle UI loads
      if (typeof precacheBattleUISpriteData === 'function') {
        setTimeout(() => precacheBattleUISpriteData(), 50);
      }
    });
    
    // Load status effect atlas
    atlases.status = loadImage('data/UI/status.png', () => {
      this._onMenuAssetLoaded();
      if (typeof precacheStatusSpriteData === 'function') {
        setTimeout(() => precacheStatusSpriteData(), 50);
      }
    });
    
    // Load particles atlas into atlases (for particle sprite system)
    atlases.particles = loadImage('data/particles/particles.png', () => {
      this._onMenuAssetLoaded();
    });
    
    // === Character Atlas Loading ===
    // Valencina
    atlases.val1 = loadImage('data/valencina/val1.png', () => this._onMenuAssetLoaded());
    atlases.val2 = loadImage('data/valencina/val2.png', () => this._onMenuAssetLoaded());
    atlases.val3 = loadImage('data/valencina/val3.png', () => this._onMenuAssetLoaded());
    atlases.valdisposal = loadImage('data/valencina/valdisposal.png', () => this._onMenuAssetLoaded());
    atlases.vslash1 = loadImage('data/valencina/vslash1.png', () => this._onMenuAssetLoaded());
    atlases.vslash2 = loadImage('data/valencina/vslash2.png', () => this._onMenuAssetLoaded());
    
    // Callisto
    atlases.cal1 = loadImage('data/callisto/Cal1.png', () => this._onMenuAssetLoaded());
    atlases.cal2 = loadImage('data/callisto/Cal2.png', () => this._onMenuAssetLoaded());
    atlases.cal3 = loadImage('data/callisto/Cal3.png', () => this._onMenuAssetLoaded());
    atlases.cal4 = loadImage('data/callisto/Cal4.png', () => this._onMenuAssetLoaded());
    atlases.cal5 = loadImage('data/callisto/Cal5.png', () => this._onMenuAssetLoaded());
    atlases.cslash1 = loadImage('data/callisto/Cslash1.png', () => this._onMenuAssetLoaded());
    atlases.cslash2 = loadImage('data/callisto/Cslash2.png', () => this._onMenuAssetLoaded());
    atlases.cslash3 = loadImage('data/callisto/Cslash3.png', () => this._onMenuAssetLoaded());
    
    // Dihui Star
    atlases.star1 = loadImage('data/dihui/Star1.png', () => this._onMenuAssetLoaded());
    atlases.star2 = loadImage('data/dihui/Star2.png', () => this._onMenuAssetLoaded());
    atlases.star3 = loadImage('data/dihui/Star3.png', () => this._onMenuAssetLoaded());
    atlases.star4 = loadImage('data/dihui/Star4.png', () => this._onMenuAssetLoaded());
    atlases.star5 = loadImage('data/dihui/Star5.png', () => this._onMenuAssetLoaded());
    atlases.star6 = loadImage('data/dihui/Star6.png', () => this._onMenuAssetLoaded());
    atlases.dslash = loadImage('data/dihui/Dslash.png', () => this._onMenuAssetLoaded());
  },
  
  /**
   * Called when a single menu-stage asset finishes loading
   */
  _onMenuAssetLoaded() {
    this.loadedMenuAssets++;
    
    // Notify progress callback
    if (this.onMenuProgress) {
      this.onMenuProgress(this.loadedMenuAssets, this.totalMenuAssets);
    }
    
    // Check if all menu assets are loaded
    if (this.loadedMenuAssets >= this.totalMenuAssets) {
      this.menuComplete = true;
      this.currentStage = this.STAGE_READY;
      console.log('[AssetLoader] Stage 2 (MENU) complete - all gameplay assets loaded');
      
      // Pre-cache sprite data for all loaded atlases
      if (typeof precacheSpriteData === 'function') {
        precacheSpriteData();
      }
      if (typeof precacheParticleSpriteData === 'function') {
        precacheParticleSpriteData();
      }
      
      // Start pre-scaling atlases
      if (typeof window.PRE_SCALED_ATLASES === 'undefined') {
        window.PRE_SCALED_ATLASES = {};
      }
      const preScaleAtlases = async () => {
        const COMMON_SCALES = [1.0]; // Reduced scales to avoid heavy pre-scaling on low-power devices
        for (const [atlasName, img] of Object.entries(atlases)) {
          if (img && img.width > 0) {
            for (const scale of COMMON_SCALES) {
              if (scale !== 1.0) {
                const newWidth = img.width * scale;
                const newHeight = img.height * scale;
                const pg = createGraphics(newWidth, newHeight);
                pg.image(img, 0, 0, newWidth, newHeight);
                const cacheKey = `${atlasName}_scaled_${scale}`;
                window.PRE_SCALED_ATLASES[cacheKey] = pg;
              }
            }
          }
        }
        console.log('[AssetLoader] Pre-scaled atlases ready');
      };
      preScaleAtlases();
      
      if (this.onMenuComplete) this.onMenuComplete();
    }
  },
  
  /**
   * Get overall loading progress as a fraction (0.0 - 1.0)
   */
  getProgress() {
    if (this.currentStage === this.STAGE_BOOT) {
      return this.totalBootAssets > 0 ? this.loadedBootAssets / this.totalBootAssets : 0;
    }
    if (this.currentStage === this.STAGE_MENU || this.currentStage === this.STAGE_READY) {
      return this.totalMenuAssets > 0 ? this.loadedMenuAssets / this.totalMenuAssets : 0;
    }
    return 1.0;
  },
  
  /**
   * Check if all gameplay assets required for a match are loaded
   */
  areGameplayAssetsReady() {
    return this.menuComplete || this.currentStage === this.STAGE_READY;
  },
  
  /**
   * Check if boot (entry screen) assets are loaded
   */
  isBootReady() {
    return this.bootComplete;
  }
};

// Auto-initialize
ASSET_LOADER.init();