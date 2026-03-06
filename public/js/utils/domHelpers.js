/**
 * DOM manipulation helpers
 */

export class DomHelpers {
  /**
   * Escape HTML to prevent XSS
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get element by ID with null check
   */
  static getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element not found: ${id}`);
    }
    return el;
  }

  /**
   * Show element by removing hidden class
   */
  static showElement(id) {
    const el = this.getElement(id);
    if (el) el.classList.remove('hidden');
  }

  /**
   * Hide element by adding hidden class
   */
  static hideElement(id) {
    const el = this.getElement(id);
    if (el) el.classList.add('hidden');
  }

  /**
   * Set text content of an element
   */
  static setText(id, text) {
    const el = this.getElement(id);
    if (el) el.textContent = text;
  }

  /**
   * Set HTML content of an element
   */
  static setHtml(id, html) {
    const el = this.getElement(id);
    if (el) el.innerHTML = html;
  }

  /**
   * Add event listener to element
   */
  static on(id, event, handler) {
    const el = this.getElement(id);
    if (el) el.addEventListener(event, handler);
  }

  /**
   * Get input value
   */
  static getValue(id) {
    const el = this.getElement(id);
    return el?.value?.trim() || '';
  }

  /**
   * Set input value
   */
  static setValue(id, value) {
    const el = this.getElement(id);
    if (el) el.value = value;
  }

  /**
   * Focus element
   */
  static focus(id) {
    const el = this.getElement(id);
    if (el) el.focus();
  }

  /**
   * Clear element content
   */
  static clear(id) {
    const el = this.getElement(id);
    if (el) el.innerHTML = '';
  }
}
