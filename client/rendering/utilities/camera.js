/**
 * CAMERA SYSTEM - Client-side rendering utility
 * Handles camera positioning, zoom, and shake effects
 * Pure client-side visual system - no gameplay logic
 */

const RenderingCamera = {
  // Camera state
  x: 0,
  y: 0,
  zoom: 1,
  targetX: 0,
  targetY: 0,
  targetZoom: 1,
  
  // Screen shake state
  shakeIntensity: 0,
  shakeDecay: 0.9,
  shakeX: 0,
  shakeY: 0,
  
  // Ultimate camera effects
  ultimateZoom: 1,
  ultimateBackgroundDim: 0,
  
  /**
   * Initialize camera system
   */
  init() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.ultimateZoom = 1;
    this.ultimateBackgroundDim = 0;
  },
  
  /**
   * Update camera position with smooth interpolation
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Smooth interpolation to target position
    const lerpSpeed = 0.1;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.zoom += (this.targetZoom - this.zoom) * lerpSpeed;
    
    // Apply ultimate zoom override if active
    if (this.ultimateZoom !== 1) {
      this.zoom = this.ultimateZoom;
    }
    
    // Update screen shake
    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= this.shakeDecay;
      
      if (this.shakeIntensity < 0.5) {
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }
  },
  
  /**
   * Set camera target position
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   */
  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  },
  
  /**
   * Set camera zoom level
   * @param {number} zoom - Target zoom level
   */
  setZoom(zoom) {
    this.targetZoom = zoom;
  },
  
  /**
   * Add screen shake effect
   * @param {number} intensity - Shake intensity
   * @param {boolean} isUltimate - Whether this is an ultimate attack shake
   */
  addShake(intensity, isUltimate = false) {
    const multiplier = isUltimate ? 2 : 1;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity * multiplier);
  },
  
  /**
   * Set ultimate camera effects
   * @param {number} zoom - Ultimate zoom level
   * @param {number} backgroundDim - Background dimming (0-1)
   */
  setUltimateEffects(zoom, backgroundDim) {
    this.ultimateZoom = zoom;
    this.ultimateBackgroundDim = backgroundDim;
  },
  
  /**
   * Reset ultimate camera effects
   */
  resetUltimateEffects() {
    this.ultimateZoom = 1;
    this.ultimateBackgroundDim = 0;
  },
  
  /**
   * Begin camera transformation (call before rendering)
   */
  begin() {
    push();
    translate(width / 2, height / 2);
    scale(this.zoom);
    translate(-width / 2 + this.shakeX, -height / 2 + this.shakeY);
    translate(-this.x, -this.y);
  },
  
  /**
   * End camera transformation (call after rendering)
   */
  end() {
    pop();
  },
  
  /**
   * Get current camera position
   * @returns {Object} Camera position {x, y, zoom}
   */
  getPosition() {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom
    };
  }
};

// Export for client use (browser-compatible)
window.RenderingCamera = RenderingCamera;
