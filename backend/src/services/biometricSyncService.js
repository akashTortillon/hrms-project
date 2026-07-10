import fetch from "node-fetch";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import SyncState from "../models/syncStateModel.js";
import SyncHistory from "../models/syncHistoryModel.js";
import attendanceProcessor from "./attendanceProcessor.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class BiometricSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
  }

  /**
   * Orchestrates the complete sync job, guarding against concurrency
   * by queuing overlapping requests.
   * @param {string} syncType "SCHEDULED" or "MANUAL"
   * @param {string} startDate Optional YYYY-MM-DD
   * @param {string} endDate Optional YYYY-MM-DD
   * @param {string} userId Optional user ObjectId triggering the sync
   * @returns {Promise<Object>} The sync result stats
   */
  async executeSyncJob(syncType = "SCHEDULED", startDate = null, endDate = null, userId = null) {
    if (this.isSyncing) {
      console.log(`[BiometricSyncService] Sync is currently active. Enqueuing ${syncType} sync job.`);
      return new Promise((resolve, reject) => {
        this.syncQueue.push({ syncType, startDate, endDate, userId, resolve, reject });
      });
    }

    this.isSyncing = true;
    let result;
    try {
      result = await this._runSync(syncType, startDate, endDate, userId);
    } finally {
      this.isSyncing = false;
      this._processNextInQueue();
    }
    return result;
  }

  /**
   * Processes the next sync job in the queue
   */
  async _processNextInQueue() {
    if (this.syncQueue.length === 0) return;
    const next = this.syncQueue.shift();
    try {
      console.log(`[BiometricSyncService] Dequeuing and executing next sync job.`);
      const result = await this.executeSyncJob(next.syncType, next.startDate, next.endDate, next.userId);
      next.resolve(result);
    } catch (error) {
      next.reject(error);
    }
  }

  /**
   * Internal method containing the sync business logic
   */
  async _runSync(syncType, startDate, endDate, userId) {
    const startTime = new Date();
    console.log(`[BiometricSyncService] Started ${syncType} sync at ${startTime.toISOString()}`);

    // Create a pending SyncHistory record
    const history = await SyncHistory.create({
      syncType,
      startTime,
      status: "FAILED",
      triggeredBy: userId
    });

    let lastSyncedTransactionId = 0;
    try {
      // 1. Get the last synced cursor (highest SLNO seen + the auth timestamp to resume from)
      let lastSyncedAuthDateTime = null;
      const syncState = await SyncState.findOne({ key: "attendance_sync" });
      if (syncState) {
        lastSyncedTransactionId = syncState.lastSyncedTransactionId;
        lastSyncedAuthDateTime = syncState.lastSyncedAuthDateTime;
      } else {
        await SyncState.create({ key: "attendance_sync", lastSyncedTransactionId: 0 });
      }

      // 2. Determine the `from` cursor for the /api/attendance/since endpoint.
      // Manual syncs use the requested startDate; scheduled syncs resume from the last
      // processed record's authDateTime (falling back to the start of today on first run).
      const formatDDMMYYYY = (d) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        const ss = String(d.getSeconds()).padStart(2, "0");
        return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
      };

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const fromDate = startDate ? new Date(`${startDate}T00:00:00`) : (lastSyncedAuthDateTime || startOfToday);
      const finalFrom = formatDDMMYYYY(fromDate);
      const endBoundary = endDate ? new Date(`${endDate}T23:59:59`) : null;

      console.log(`[BiometricSyncService] Sync cursor: from="${finalFrom}"${endBoundary ? `, capped at ${endDate} 23:59:59` : ""}`);

      // 3. Fetch from the Attendance API with retry logic
      const apiResponse = await this._fetchFromApiWithRetries(finalFrom);

      console.log(`[BiometricSyncService] Raw API response parsed. Type: ${typeof apiResponse}, IsArray: ${Array.isArray(apiResponse)}`);

      let transactions = null;
      if (Array.isArray(apiResponse)) {
        transactions = apiResponse;
      } else if (apiResponse && Array.isArray(apiResponse.data)) {
        transactions = apiResponse.data;
      }

      if (!transactions || !Array.isArray(transactions)) {
        throw new Error(`Could not find transactions array in Attendance API response. Response received: ${JSON.stringify(apiResponse)}`);
      }

      // A manual sync with an endDate has no server-side upper bound (the API only
      // supports a `from` cursor), so cap the window client-side.
      if (endBoundary) {
        transactions = transactions.filter((txn) => txn.authDateTime && new Date(txn.authDateTime) <= endBoundary);
      }

      const transactionsFetched = transactions.length;
      console.log(`[BiometricSyncService] Extracted ${transactionsFetched} transactions from Attendance API response.`);

      let transactionsStored = 0;
      let highestTransactionId = lastSyncedTransactionId;
      let highestAuthDateTime = lastSyncedAuthDateTime;
      const newTransactions = [];

      // 4. Save new transactions to the database, skipping duplicates.
      // The `exists` check is not race-safe (the API can return the same transaction across
      // overlapping scheduled/manual syncs), so a duplicate-key error on the unique
      // `transactionId` index is expected and treated as "already synced" rather than a
      // fatal error that aborts the whole sync with a 500.
      for (const txn of transactions) {
        if (!txn.SLNO || !txn.authDateTime) continue;

        // Track highest ID and cursor timestamp
        if (txn.SLNO > highestTransactionId) {
          highestTransactionId = txn.SLNO;
        }
        const authDateTime = new Date(txn.authDateTime);
        if (!highestAuthDateTime || authDateTime > highestAuthDateTime) {
          highestAuthDateTime = authDateTime;
        }

        const exists = await BiometricTransaction.findOne({ transactionId: txn.SLNO });
        if (exists) continue;

        try {
          // Map API fields to database schema
          // API uses: employeeID, authDateTime, direction, deviceSN
          const storedTxn = await BiometricTransaction.create({
            transactionId: txn.SLNO,
            badgeNumber: txn.employeeID,
            timestamp: authDateTime,
            transactionType: txn.direction === "IN" ? "IN" : "OUT",
            deviceId: txn.deviceSN || txn.deviceName || null,
            rawData: txn
          });

          newTransactions.push(storedTxn);
          transactionsStored++;
        } catch (createError) {
          if (createError.code === 11000) {
            console.log(`[BiometricSyncService] Transaction ${txn.SLNO} already stored by a concurrent sync - skipping.`);
            continue;
          }
          throw createError;
        }
      }

      console.log(`[BiometricSyncService] Stored ${transactionsStored} new unique transactions in database.`);

      // 5. Process new transactions to generate attendance records
      const processingStats = await attendanceProcessor.processTransactions(newTransactions);

      // 6. Update transaction processed state
      for (const newTxn of newTransactions) {
        newTxn.processed = true;
        newTxn.processedAt = new Date();
        await newTxn.save();
      }

      // 7. Update Sync State atomically
      await SyncState.findOneAndUpdate(
        { key: "attendance_sync" },
        {
          lastSyncedTransactionId: highestTransactionId,
          lastSyncedAuthDateTime: highestAuthDateTime,
          lastSyncTimestamp: new Date(),
          lastSuccessfulSync: new Date(),
          consecutiveFailures: 0
        },
        { upsert: true, new: true }
      );

      // 8. Log successful history run
      const hasUnmapped = processingStats.unmappedBadges.size > 0;
      history.endTime = new Date();
      history.status = hasUnmapped ? "PARTIAL_SUCCESS" : "SUCCESS";
      history.transactionsFetched = transactionsFetched;
      history.transactionsStored = transactionsStored;
      history.recordsCreated = processingStats.created;
      history.recordsUpdated = processingStats.updated;
      history.recordsSkipped = processingStats.skipped;
      history.unmappedBadges = Array.from(processingStats.unmappedBadges);  // Convert Set to Array
      await history.save();

      console.log(`[BiometricSyncService] Completed ${syncType} sync job successfully in ${history.endTime - startTime}ms.`);
      return {
        success: true,
        transactionsFetched,
        transactionsStored,
        recordsCreated: processingStats.created,
        recordsUpdated: processingStats.updated,
        recordsSkipped: processingStats.skipped,
        unmappedBadges: Array.from(processingStats.unmappedBadges),  // Convert Set to Array
        duration: history.endTime - startTime
      };

    } catch (error) {
      console.error(`[BiometricSyncService] Sync job encountered an error:`, error);
      
      // Update SyncState failure counts
      await SyncState.findOneAndUpdate(
        { key: "attendance_sync" },
        {
          $inc: { consecutiveFailures: 1 },
          lastSyncTimestamp: new Date()
        },
        { upsert: true }
      );

      // Update history with failure details
      history.endTime = new Date();
      history.status = "FAILED";
      history.errorMessage = error.message;
      history.errorStack = error.stack;
      await history.save();

      throw error;
    }
  }

  /**
   * Helper: Performs API fetch with exponential backoff retries and error handling
   */
  async _fetchFromApiWithRetries(from) {
    const apiUrl = process.env.ATTENDANCE_API_URL || "http://leptisgroup.fortiddns.com:3111";
    const apiToken = process.env.ATTENDANCE_API_TOKEN || "98asgd-90ab-cde12345678";
    const maxRetries = parseInt(process.env.ATTENDANCE_RETRY_ATTEMPTS) || 3;
    const backoffDelays = [5000, 15000, 45000]; // 5s, 15s, 45s

    const fullUrl = `${apiUrl}/api/attendance/since?from=${encodeURIComponent(from)}`;
    console.log(`[BiometricSyncService] Requesting Attendance API (GET): ${fullUrl}`);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`
          }
        });

        // Handle Rate Limiting (429)
        if (response.status === 429) {
          console.warn(`[BiometricSyncService] HTTP 429: Rate limit exceeded. Waiting 60 seconds before retry (Attempt ${attempt})...`);
          await sleep(60000);
          continue;
        }

        // Handle Authentication Errors (401/403)
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed with Attendance API (HTTP ${response.status}). Check credentials.`);
        }

        // Handle Bad Request (400) - e.g. malformed date on /since
        if (response.status === 400) {
          throw new Error(`Attendance API rejected the request (HTTP 400). Check date format.`);
        }

        // Handle Server Errors (500/503)
        if (response.status >= 500) {
          throw new Error(`Server returned error status HTTP ${response.status}.`);
        }

        if (!response.ok) {
          throw new Error(`API returned HTTP status ${response.status}.`);
        }

        // Parse Response JSON
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error(`Malformed JSON response from Attendance API: ${parseError.message}`);
        }

        if (data && data.success === false) {
          throw new Error(`Attendance API returned an error: ${data.error || "Unknown error"}`);
        }

        return data;

      } catch (error) {
        console.error(`[BiometricSyncService] Request attempt ${attempt} failed: ${error.message}`);

        // If it was an authentication error, do not retry
        if (error.message.includes("Authentication failed")) {
          throw error;
        }

        // If we have exhausted all attempts, throw error
        if (attempt > maxRetries) {
          throw new Error(`Failed to fetch biometric transactions after ${maxRetries} retries: ${error.message}`);
        }

        // Exponential backoff delay
        const delay = backoffDelays[attempt - 1] || 45000;
        console.log(`[BiometricSyncService] Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      }
    }
  }
}

export default new BiometricSyncService();
