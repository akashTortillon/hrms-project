# Requirements Document

## Introduction

The BioCloud Biometric Integration System enables automated synchronization of employee attendance data from the BioCloud biometric device API into the existing HRMS backend system. The system fetches biometric transaction data (punch-in/punch-out records) every 10 minutes, processes the data to determine attendance status, and stores it in the database while avoiding duplicate records through incremental synchronization.

## Glossary

- **BioCloud_API**: The external biometric device API service hosted at https://15.biocloud.me:8205
- **Sync_Service**: The scheduled job component that orchestrates the data fetching and processing workflow
- **Transaction**: A single biometric punch record containing employee badge number, timestamp, and transaction type (IN/OUT)
- **Transaction_ID**: The unique identifier (Id field) assigned by BioCloud API to each transaction record
- **Sync_State**: The persistent storage mechanism that tracks the last successfully synced Transaction_ID
- **Attendance_Processor**: The component that transforms raw biometric transactions into attendance records
- **HRMS_Backend**: The existing Node.js/Express backend system with MongoDB/MySQL database
- **Incremental_Sync**: The process of fetching only new transactions using the IdFrom parameter to avoid duplicates
- **Biometric_Transaction_Store**: The database collection/table that stores raw biometric transaction data
- **Attendance_Record**: The processed attendance entry in the existing attendance system with check-in, check-out, and status

## Requirements

### Requirement 1: Scheduled Biometric Data Synchronization

**User Story:** As an HR administrator, I want the system to automatically fetch biometric data every 10 minutes, so that attendance records are kept up-to-date without manual intervention.

#### Acceptance Criteria

1. THE Sync_Service SHALL execute every 10 minutes
2. WHEN the scheduled interval triggers, THE Sync_Service SHALL call the BioCloud_API api_gettransactions endpoint
3. WHEN calling the BioCloud_API, THE Sync_Service SHALL include the BioCloudAPIAuthorization header with token value d168b9ea529a4b44a8419e499fe16f3e
4. WHEN calling the BioCloud_API, THE Sync_Service SHALL set BadgeNumber parameter to null to retrieve all employees' transactions
5. WHEN the Sync_Service starts, THE Sync_Service SHALL retrieve the last synced Transaction_ID from Sync_State
6. WHEN the last synced Transaction_ID exists, THE Sync_Service SHALL include IdFrom parameter with the last synced Transaction_ID value
7. WHEN the BioCloud_API returns transactions, THE Sync_Service SHALL update Sync_State with the highest Transaction_ID from the response

### Requirement 2: Biometric Transaction Data Storage

**User Story:** As a system administrator, I want raw biometric transaction data to be stored in the database, so that I have a complete audit trail of all biometric punches.

#### Acceptance Criteria

1. WHEN the Sync_Service receives transactions from BioCloud_API, THE Sync_Service SHALL store each transaction in Biometric_Transaction_Store
2. THE Biometric_Transaction_Store SHALL contain fields for Transaction_ID, employee badge number, timestamp, transaction type, and sync timestamp
3. WHEN storing a transaction, THE Sync_Service SHALL check if the Transaction_ID already exists in Biometric_Transaction_Store
4. IF a transaction with the same Transaction_ID exists, THEN THE Sync_Service SHALL skip storing the duplicate transaction
5. WHEN a transaction is successfully stored, THE Sync_Service SHALL log the transaction details with timestamp

### Requirement 3: Employee Badge Number Mapping

**User Story:** As an HR administrator, I want biometric badge numbers to be mapped to employee records, so that attendance data is correctly associated with each employee.

#### Acceptance Criteria

1. THE Attendance_Processor SHALL map badge numbers from transactions to employee records using the employee code field
2. WHEN processing a transaction, THE Attendance_Processor SHALL query the employee collection using the badge number
3. IF no employee is found for a badge number, THEN THE Attendance_Processor SHALL log an unmapped badge number warning with the badge number and timestamp
4. WHEN an employee is found, THE Attendance_Processor SHALL use the employee ID for creating attendance records
5. THE Attendance_Processor SHALL maintain a cache of badge number to employee ID mappings that refreshes every 60 minutes

### Requirement 4: Attendance Record Processing

**User Story:** As an HR administrator, I want biometric transactions to be processed into attendance records with check-in and check-out times, so that I can track employee working hours.

#### Acceptance Criteria

1. WHEN processing transactions for a date, THE Attendance_Processor SHALL group transactions by employee and date
2. WHEN multiple IN transactions exist for an employee on a date, THE Attendance_Processor SHALL use the earliest timestamp as check-in time
3. WHEN multiple OUT transactions exist for an employee on a date, THE Attendance_Processor SHALL use the latest timestamp as check-out time
4. WHEN both check-in and check-out times exist, THE Attendance_Processor SHALL calculate work hours using the existing shift rules
5. WHEN creating or updating an attendance record, THE Attendance_Processor SHALL determine status (Present, Late, Absent) using existing shift configuration
6. WHEN an attendance record already exists for an employee and date, THE Attendance_Processor SHALL update the record only if the new data has different check-in or check-out times
7. IF an attendance record has status "On Leave", THEN THE Attendance_Processor SHALL not overwrite the record with biometric data

### Requirement 5: API Error Handling and Retry Logic

**User Story:** As a system administrator, I want the system to handle API failures gracefully with retry logic, so that temporary network issues do not cause data loss.

#### Acceptance Criteria

1. WHEN the BioCloud_API request fails with a network error, THE Sync_Service SHALL retry the request up to 3 times with exponential backoff delays of 5 seconds, 15 seconds, and 45 seconds
2. WHEN the BioCloud_API returns HTTP status code 401 or 403, THE Sync_Service SHALL log an authentication error and SHALL not retry
3. WHEN the BioCloud_API returns HTTP status code 429, THE Sync_Service SHALL wait 60 seconds before retrying
4. WHEN the BioCloud_API returns HTTP status code 500 or 503, THE Sync_Service SHALL retry the request up to 3 times
5. WHEN all retry attempts fail, THE Sync_Service SHALL log the failure with error details and SHALL continue to the next scheduled execution
6. WHEN the BioCloud_API returns malformed JSON, THE Sync_Service SHALL log a parsing error and SHALL not process the response

### Requirement 6: Sync State Persistence and Recovery

**User Story:** As a system administrator, I want the sync state to be persisted reliably, so that the system can recover from crashes without losing track of synced data.

#### Acceptance Criteria

1. THE Sync_State SHALL be stored in the database with fields for last synced Transaction_ID and last sync timestamp
2. WHEN the Sync_Service successfully processes a batch of transactions, THE Sync_Service SHALL update Sync_State with the highest Transaction_ID from the batch
3. WHEN the Sync_Service starts after a crash or restart, THE Sync_Service SHALL read the last synced Transaction_ID from Sync_State
4. IF no Sync_State record exists, THEN THE Sync_Service SHALL initialize with IdFrom parameter set to 0
5. WHEN updating Sync_State, THE Sync_Service SHALL use an atomic database operation to prevent race conditions

### Requirement 7: Manual Sync Trigger

**User Story:** As an HR administrator, I want to manually trigger a sync operation, so that I can immediately fetch the latest biometric data when needed.

#### Acceptance Criteria

1. THE HRMS_Backend SHALL expose an API endpoint POST /api/attendance/sync-biometrics for manual sync triggering
2. WHEN the manual sync endpoint is called, THE Sync_Service SHALL execute the sync process immediately
3. WHEN a manual sync is triggered while an automatic sync is running, THE Sync_Service SHALL queue the manual sync request to execute after the current sync completes
4. WHEN the manual sync completes, THE Sync_Service SHALL return a response with the number of transactions fetched and processed
5. WHERE the user has permission "MANAGE_ATTENDANCE" or role "Admin", THE HRMS_Backend SHALL allow access to the manual sync endpoint

### Requirement 8: Sync Logging and Monitoring

**User Story:** As a system administrator, I want detailed logs of sync operations, so that I can monitor system health and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the Sync_Service starts a sync operation, THE Sync_Service SHALL log the start time and last synced Transaction_ID
2. WHEN the Sync_Service completes a sync operation, THE Sync_Service SHALL log the completion time, number of transactions fetched, number of attendance records created, and number of attendance records updated
3. WHEN the Sync_Service encounters an error, THE Sync_Service SHALL log the error type, error message, and stack trace
4. WHEN an unmapped badge number is encountered, THE Sync_Service SHALL log the badge number and transaction timestamp
5. THE Sync_Service SHALL log all API requests to BioCloud_API with request parameters and response status codes
6. THE Sync_Service SHALL maintain a sync history collection with fields for sync start time, sync end time, status, transactions fetched count, records created count, records updated count, and error message

### Requirement 9: Date Range Filtering for API Requests

**User Story:** As a system administrator, I want the sync service to use appropriate date ranges when fetching data, so that API requests are efficient and do not retrieve unnecessary historical data.

#### Acceptance Criteria

1. WHEN the Sync_Service makes an API request, THE Sync_Service SHALL set StartDate parameter to 7 days before the current date
2. WHEN the Sync_Service makes an API request, THE Sync_Service SHALL set EndDate parameter to the current date
3. WHERE incremental sync is enabled with IdFrom parameter, THE Sync_Service SHALL still include StartDate and EndDate parameters as a secondary filter
4. WHEN the manual sync endpoint is called with optional startDate and endDate parameters, THE Sync_Service SHALL use the provided date range instead of the default 7-day window

### Requirement 10: Configuration Management

**User Story:** As a system administrator, I want sync configuration to be manageable through environment variables, so that I can adjust settings without code changes.

#### Acceptance Criteria

1. THE Sync_Service SHALL read the BioCloud API base URL from environment variable BIOCLOUD_API_URL
2. THE Sync_Service SHALL read the authentication token from environment variable BIOCLOUD_API_TOKEN
3. THE Sync_Service SHALL read the sync interval in minutes from environment variable BIOCLOUD_SYNC_INTERVAL with default value 10
4. THE Sync_Service SHALL read the retry attempt count from environment variable BIOCLOUD_RETRY_ATTEMPTS with default value 3
5. THE Sync_Service SHALL read the date range window in days from environment variable BIOCLOUD_DATE_RANGE_DAYS with default value 7
6. WHEN an environment variable is missing, THE Sync_Service SHALL use the default value and SHALL log a warning
