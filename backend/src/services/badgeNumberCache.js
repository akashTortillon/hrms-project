import Employee from "../models/employeeModel.js";

class BadgeNumberCache {
  constructor() {
    this.cache = new Map(); // badgeNumber (code) -> employeeId (ObjectId)
    this.lastRefreshed = null;
    this.ttl = 60 * 60 * 1000; // 60 minutes in milliseconds
  }

  /**
   * Refreshes the cache from the database
   */
  async refresh() {
    try {
      const employees = await Employee.find({ status: "Active" }).select("_id code");
      this.cache.clear();
      for (const emp of employees) {
        if (emp.code) {
          this.cache.set(emp.code.trim(), emp._id);
        }
      }
      this.lastRefreshed = Date.now();
      console.log(`[BadgeNumberCache] Refreshed cache. Loaded ${this.cache.size} employees.`);
    } catch (error) {
      console.error("[BadgeNumberCache] Failed to refresh employee badge cache:", error);
    }
  }

  /**
   * Checks if the cache is stale
   * @returns {boolean}
   */
  isStale() {
    if (!this.lastRefreshed) return true;
    return (Date.now() - this.lastRefreshed) > this.ttl;
  }

  /**
   * Gets an employee's ID for a given badge number (code)
   * @param {string} badgeNumber
   * @returns {Promise<mongoose.Types.ObjectId|null>}
   */
  async get(badgeNumber) {
    if (!badgeNumber) return null;
    const key = badgeNumber.trim();
    
    if (this.isStale() || this.cache.size === 0) {
      await this.refresh();
    }

    const cachedId = this.cache.get(key);
    if (cachedId) return cachedId;

    // Fallback: If not found in cache, check DB directly in case it's a newly created employee
    try {
      const emp = await Employee.findOne({ code: key }).select("_id");
      if (emp) {
        this.cache.set(key, emp._id);
        return emp._id;
      }
    } catch (error) {
      console.error(`[BadgeNumberCache] Fallback direct DB query failed for code ${key}:`, error);
    }

    return null;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.lastRefreshed = null;
  }
}

export default new BadgeNumberCache();
