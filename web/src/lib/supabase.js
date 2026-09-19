import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key') {
  const STORAGE_DB_KEY = 'ems_mock_database'
  const STORAGE_SESSION_KEY = 'ems_mock_session'

  const loadMockDatabase = () => {
    try {
      const stored = localStorage.getItem(STORAGE_DB_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.profiles) {
          parsed.profiles = parsed.profiles.map(p => ({
            bank_verification_status: 'verified',
            bank_account_holder_name: p.full_name,
            bank_branch: 'Main Branch',
            bank_account_type: 'Savings',
            bank_proof_name: 'bank_document.pdf',
            ...p
          }))
        }
        return parsed
      }
    } catch (e) {
      console.error('Failed to load mock database:', e)
    }
    return null
  }

  const saveMockDatabase = (db, eventDetail = null) => {
    try {
      localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(db))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ems_mock_db_changed', { detail: db }))
        if (eventDetail) {
          window.dispatchEvent(new CustomEvent('ems_mock_realtime_event', { detail: eventDetail }))
        }
      }
    } catch (e) {
      console.error('Failed to save mock database:', e)
    }
  }

  const defaultDatabase = {
    profiles: [
      { id: 'demo-super-admin-id', full_name: 'System Admin', email: 'admin@careermap.in', role: 'super_admin', status: 'active', employee_id: 'EMP001', department: 'Operations', designation: 'System Administrator', phone: '9876543210', employment_type: 'Full-time', date_of_joining: '2025-01-01', ctc: 1500000, bank_name: 'HDFC Bank', bank_account: '1234567890', bank_account_holder_name: 'System Admin', ifsc: 'HDFC0000123', bank_branch: 'BKC Branch, Mumbai', bank_account_type: 'Savings', bank_verification_status: 'verified', bank_verification_remarks: 'Verified by Finance Team', bank_verified_by: 'demo-payroll-admin-id', bank_verified_at: '2026-01-05T10:00:00Z', bank_proof_name: 'cancelled_cheque_admin.pdf', reporting_manager_id: null, reporting_manager_name: null, reporting_manager_designation: null },
      { id: 'demo-hr-admin-id', full_name: 'HR Manager', email: 'hr@careermap.in', role: 'hr', status: 'active', employee_id: 'EMP002', department: 'HR', designation: 'HR Lead', phone: '9876543211', employment_type: 'Full-time', date_of_joining: '2025-02-01', ctc: 1000000, bank_name: 'ICICI Bank', bank_account: '2345678901', bank_account_holder_name: 'HR Manager', ifsc: 'ICIC0000234', bank_branch: 'Andheri West, Mumbai', bank_account_type: 'Savings', bank_verification_status: 'verified', bank_verification_remarks: 'Auto-verified on onboarding', bank_verified_by: 'demo-super-admin-id', bank_verified_at: '2026-02-02T11:00:00Z', bank_proof_name: 'passbook_hr.pdf', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-payroll-admin-id', full_name: 'Finance Head', email: 'payroll@careermap.in', role: 'accounts', status: 'active', employee_id: 'EMP003', department: 'Finance', designation: 'Payroll Specialist', phone: '9876543212', employment_type: 'Full-time', date_of_joining: '2025-03-01', ctc: 900000, bank_name: 'SBI', bank_account: '3456789012', bank_account_holder_name: 'Finance Head', ifsc: 'SBIN0000345', bank_branch: 'Fort Branch, Mumbai', bank_account_type: 'Current', bank_verification_status: 'verified', bank_verification_remarks: 'Verified by HR', bank_verified_by: 'demo-hr-admin-id', bank_verified_at: '2026-03-02T09:30:00Z', bank_proof_name: 'statement_finance.pdf', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-manager-id', full_name: 'Team Manager', email: 'manager@careermap.in', role: 'manager', status: 'active', employee_id: 'EMP004', department: 'Engineering', designation: 'Engineering Manager', phone: '9876543213', employment_type: 'Full-time', date_of_joining: '2025-04-01', ctc: 1800000, bank_name: 'Axis Bank', bank_account: '4567890123', bank_account_holder_name: 'Team Manager', ifsc: 'UTIB0000456', bank_branch: 'Lower Parel, Mumbai', bank_account_type: 'Savings', bank_verification_status: 'pending', bank_verification_remarks: 'Updated bank details submitted for salary credit.', bank_verified_by: null, bank_verified_at: null, bank_proof_name: 'axis_passbook.pdf', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-rm-id', full_name: 'Reporting Manager One', email: 'rm@careermap.in', role: 'rm', status: 'active', employee_id: 'EMP006', department: 'Engineering', designation: 'Technical Lead', phone: '9876543215', employment_type: 'Full-time', date_of_joining: '2025-04-01', ctc: 1400000, bank_name: 'HDFC Bank', bank_account: '6789012345', bank_account_holder_name: 'Reporting Manager One', ifsc: 'HDFC0000123', bank_branch: 'Bandra West, Mumbai', bank_account_type: 'Savings', bank_verification_status: 'verified', bank_verification_remarks: 'Verified', bank_verified_by: 'demo-hr-admin-id', bank_verified_at: '2026-04-03T14:00:00Z', bank_proof_name: 'cancelled_cheque_rm.pdf', reporting_manager_id: 'demo-manager-id', reporting_manager_name: 'Team Manager', reporting_manager_designation: 'Engineering Manager' },
      { id: 'demo-employee-id', full_name: 'John Doe', email: 'employee@careermap.in', role: 'employee', status: 'active', employee_id: 'EMP005', department: 'Engineering', designation: 'Software Engineer', phone: '9876543214', employment_type: 'Full-time', date_of_joining: '2025-05-01', ctc: 1200000, bank_name: 'HDFC Bank', bank_account: '5678901234', bank_account_holder_name: 'John Doe', ifsc: 'HDFC0000123', bank_branch: 'Powai Branch, Mumbai', bank_account_type: 'Savings', bank_verification_status: 'pending', bank_verification_remarks: 'Bank account added by employee for salary credit.', bank_verified_by: null, bank_verified_at: null, bank_proof_name: 'cheque_john_doe.pdf', reporting_manager_id: 'demo-rm-id', reporting_manager_name: 'Reporting Manager One', reporting_manager_designation: 'Technical Lead' },
    ],
    attendance: [
      { id: 'att-1', employee_id: 'demo-employee-id', date: new Date().toISOString().split('T')[0], status: 'present', check_in: '09:00', check_out: '18:00' },
      { id: 'att-2', employee_id: 'demo-manager-id', date: new Date().toISOString().split('T')[0], status: 'weekly_off', check_in: null, check_out: null }
    ],
    leave_requests: [
      { id: 'lr-1', employee_id: 'demo-employee-id', leave_type: 'sick', from_date: '2026-06-15', to_date: '2026-06-16', days: 2, reason: 'Fever', status: 'pending', applied_on: '2026-06-14', profiles: { full_name: 'John Doe', department: 'Engineering' } },
      { id: 'lr-2', employee_id: 'demo-manager-id', leave_type: 'casual', from_date: '2026-06-18', to_date: '2026-06-18', days: 1, reason: 'Personal work', status: 'pending', applied_on: '2026-06-15', profiles: { full_name: 'Team Manager', department: 'Engineering' } },
      { id: 'lr-3', employee_id: 'demo-hr-admin-id', leave_type: 'earned', from_date: '2026-06-20', to_date: '2026-06-22', days: 3, reason: 'Vacation', status: 'pending', applied_on: '2026-06-16', profiles: { full_name: 'HR Manager', department: 'HR' } }
    ],
    leave_balances: [
      { id: 'lb-1', employee_id: 'demo-super-admin-id', year: 2026, casual: 12, sick: 12, earned: 18, wfh: 24, comp_off: 5 },
      { id: 'lb-2', employee_id: 'demo-hr-admin-id', year: 2026, casual: 11, sick: 12, earned: 18, wfh: 24, comp_off: 5 },
      { id: 'lb-3', employee_id: 'demo-payroll-admin-id', year: 2026, casual: 12, sick: 10, earned: 18, wfh: 24, comp_off: 5 },
      { id: 'lb-4', employee_id: 'demo-manager-id', year: 2026, casual: 12, sick: 12, earned: 15, wfh: 24, comp_off: 5 },
      { id: 'lb-5', employee_id: 'demo-employee-id', year: 2026, casual: 10, sick: 11, earned: 17, wfh: 20, comp_off: 4 },
    ],
    payroll_runs: [
      { id: 'pr-1', month: 5, year: 2026, status: 'approved', total_gross: 450000, total_net: 410000 }
    ],
    payslips: [
      { id: 'ps-1', employee_id: 'demo-employee-id', payroll_run_id: 'pr-1', gross: 100000, basic: 40000, hra: 20000, da: 4000, special_allowance: 36000, pf: 12000, esi: 0, pt: 200, tds: 5000, net: 82800 }
    ],
    holidays: [
      { id: 'h-1', name: 'New Year Day', date: '2026-01-01', type: 'national' },
      { id: 'h-2', name: 'Republic Day', date: '2026-01-26', type: 'national' },
      { id: 'h-3', name: 'Holi', date: '2026-03-04', type: 'festival' },
      { id: 'h-4', name: 'Independence Day', date: '2026-08-15', type: 'national' },
    ],
    documents: [
      { id: 'doc-1', name: 'Employee Handbook.pdf', category: 'handbook', type: 'application/pdf', size: '2.4 MB', url: '#' }
    ],
    employee_documents: [
      {
        id: 'emp-doc-1',
        employee_id: 'demo-employee-id',
        doc_type: 'aadhaar',
        file_name: 'aadhaar_card.pdf',
        file_path: 'documents/aadhaar_card.pdf',
        file_size: 1258291,
        document_verification_status: 'verified',
        verified_by: 'demo-hr-admin-id',
        verified_at: '2026-06-13T10:00:00Z',
        verification_remarks: 'Verified successfully against original documents.',
        uploaded_at: '2026-06-12T09:00:00Z'
      },
      {
        id: 'emp-doc-2',
        employee_id: 'demo-employee-id',
        doc_type: 'pan',
        file_name: 'pan_card.pdf',
        file_path: 'documents/pan_card.pdf',
        file_size: 524288,
        document_verification_status: 'pending',
        verified_by: null,
        verified_at: null,
        verification_remarks: null,
        uploaded_at: '2026-06-13T14:30:00Z'
      }
    ],
    notifications: [
      { id: 'n-1', user_id: 'demo-employee-id', type: 'leave', title: 'Leave Approved', message: 'Your Sick Leave request for 2 days has been approved.', read: false, link: '/leave', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: 'n-2', user_id: 'demo-employee-id', type: 'attendance', title: 'Attendance Marked', message: 'Attendance for today recorded as Present (09:00 - 18:00).', read: false, link: '/attendance', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      { id: 'n-3', user_id: 'demo-employee-id', type: 'announcement', title: 'Company Policy Update', message: 'New HR policy document is now available in Documents.', read: false, link: '/documents', created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
      { id: 'n-4', user_id: 'demo-employee-id', type: 'payroll', title: 'Payslip Released', message: 'Your payslip for May 2026 is ready to download.', read: true, link: '/payroll', created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
      { id: 'n-5', user_id: 'demo-manager-id', type: 'leave', title: 'New Leave Request', message: 'John Doe submitted a sick leave request (2 days).', read: false, link: '/leave', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { id: 'n-6', user_id: 'demo-manager-id', type: 'attendance', title: 'Attendance Exception', message: 'Team attendance report requires approval for 1 team member.', read: false, link: '/attendance', created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
      { id: 'n-7', user_id: 'demo-hr-admin-id', type: 'employee', title: 'New Registration', message: 'New employee John Doe profile registered.', read: false, link: '/employees', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { id: 'n-8', user_id: 'demo-hr-admin-id', type: 'leave', title: 'Leave Request Pending', message: '1 leave request pending final HR approval.', read: false, link: '/leave', created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
      { id: 'n-9', user_id: 'demo-super-admin-id', type: 'system', title: 'System Backup Complete', message: 'Automated database backup executed successfully.', read: false, link: '/settings', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: 'n-10', user_id: 'demo-super-admin-id', type: 'payroll', title: 'Payroll Run Approved', message: 'May 2026 payroll run finalized.', read: true, link: '/payroll', created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() }
    ],
    salary_structures: [
      { id: 'ss-1', employee_id: 'demo-super-admin-id', ctc: 1500000, gross: 125000, basic: 50000, hra: 25000, da: 5000, special_allowance: 45000, pf: 6000, esi: 0, pt: 200, net_salary: 118800 },
      { id: 'ss-2', employee_id: 'demo-hr-admin-id', ctc: 1000000, gross: 83333, basic: 33333, hra: 16667, da: 3333, special_allowance: 30000, pf: 4000, esi: 0, pt: 200, net_salary: 79133 },
      { id: 'ss-3', employee_id: 'demo-payroll-admin-id', ctc: 900000, gross: 75000, basic: 30000, hra: 15000, da: 3000, special_allowance: 27000, pf: 3600, esi: 0, pt: 200, net_salary: 71200 },
      { id: 'ss-4', employee_id: 'demo-manager-id', ctc: 1800000, gross: 150000, basic: 60000, hra: 30000, da: 6000, special_allowance: 54000, pf: 7200, esi: 0, pt: 200, net_salary: 142600 },
      { id: 'ss-5', employee_id: 'demo-rm-id', ctc: 1400000, gross: 116667, basic: 46667, hra: 23333, da: 4667, special_allowance: 42000, pf: 5600, esi: 0, pt: 200, net_salary: 110867 },
      { id: 'ss-6', employee_id: 'demo-employee-id', ctc: 1200000, gross: 100000, basic: 40000, hra: 20000, da: 4000, special_allowance: 36000, pf: 4800, esi: 0, pt: 200, net_salary: 95000 }
    ]
  }

  const mockDatabase = loadMockDatabase() || defaultDatabase
  if (!localStorage.getItem(STORAGE_DB_KEY)) {
    saveMockDatabase(mockDatabase)
  }

  const makeQueryBuilder = (table) => {
    const filters = []
    let orderSpec = null
    let limitSpec = null
    let isSingle = false
    let isSelect = false
    let operation = null

    const builder = {
      select() {
        isSelect = true
        return builder
      },
      eq(field, value) {
        filters.push(item => item[field] === value)
        return builder
      },
      gte(field, value) {
        filters.push(item => item[field] >= value)
        return builder
      },
      lte(field, value) {
        filters.push(item => item[field] <= value)
        return builder
      },
      order(field, { ascending = true } = {}) {
        orderSpec = { field, ascending }
        return builder
      },
      limit(n) {
        limitSpec = n
        return builder
      },
      single() {
        isSingle = true
        return builder
      },
      insert(records) {
        operation = { type: 'insert', records }
        return builder
      },
      update(updates) {
        operation = { type: 'update', updates }
        return builder
      },
      upsert(records) {
        operation = { type: 'upsert', records }
        return builder
      },
      delete() {
        operation = { type: 'delete' }
        return builder
      },
      exec() {
        if (!mockDatabase[table]) {
          mockDatabase[table] = []
        }
        let data = [...mockDatabase[table]]
        let error = null

        // Apply chained filter criteria
        for (const filterFn of filters) {
          data = data.filter(filterFn)
        }

        // Perform mutation operation if any
        if (operation) {
          if (operation.type === 'update') {
            const updates = operation.updates
            data.forEach(item => {
              if (table === 'leave_requests') {
                const oldStatus = item.status
                const newStatus = updates.status
                if (newStatus === 'approved' && oldStatus !== 'approved') {
                  const balance = mockDatabase.leave_balances.find(b => b.employee_id === item.employee_id && b.year === new Date(item.from_date).getFullYear())
                  if (balance && balance[item.leave_type] !== undefined) {
                    balance[item.leave_type] = Math.max(0, balance[item.leave_type] - item.days)
                  }
                } else if (oldStatus === 'approved' && newStatus !== 'approved' && newStatus !== undefined) {
                  const balance = mockDatabase.leave_balances.find(b => b.employee_id === item.employee_id && b.year === new Date(item.from_date).getFullYear())
                  if (balance && balance[item.leave_type] !== undefined) {
                    balance[item.leave_type] = balance[item.leave_type] + item.days
                  }
                }
              }
              Object.assign(item, updates)
              const orig = mockDatabase[table].find(x => x.id === item.id)
              if (orig) Object.assign(orig, updates)
            })
            saveMockDatabase(mockDatabase)
          } else if (operation.type === 'delete') {
            const idsToDelete = new Set(data.map(item => item.id))
            mockDatabase[table] = mockDatabase[table].filter(item => !idsToDelete.has(item.id))
            saveMockDatabase(mockDatabase)
          } else if (operation.type === 'insert') {
            const arr = Array.isArray(operation.records) ? operation.records : [operation.records]
            const inserted = arr.map(r => {
              const newItem = { id: r.id || Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...r }
              mockDatabase[table].push(newItem)
              return newItem
            })
            saveMockDatabase(mockDatabase)
            data = Array.isArray(operation.records) ? inserted : inserted[0]
          } else if (operation.type === 'upsert') {
            const arr = Array.isArray(operation.records) ? operation.records : [operation.records]
            const upserted = arr.map(r => {
              const existingIndex = mockDatabase[table].findIndex(x => {
                if (table === 'attendance') return x.employee_id === r.employee_id && x.date === r.date
                if (table === 'employee_documents') return x.employee_id === r.employee_id && x.doc_type === r.doc_type
                if (table === 'payslips') return x.employee_id === r.employee_id && x.payroll_run_id === r.payroll_run_id
                if (table === 'salary_structures') return x.employee_id === r.employee_id
                return x.id === r.id
              })
              if (existingIndex > -1) {
                mockDatabase[table][existingIndex] = { ...mockDatabase[table][existingIndex], ...r }
                return mockDatabase[table][existingIndex]
              } else {
                const newItem = { id: r.id || Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...r }
                mockDatabase[table].push(newItem)
                return newItem
              }
            })
            saveMockDatabase(mockDatabase)
            data = Array.isArray(operation.records) ? upserted : upserted[0]
          }
        }

        // Attach profile references for joined queries
        if (isSelect || !operation) {
          if (['leave_requests', 'attendance', 'leave_balances', 'payslips', 'employee_documents', 'salary_structures'].includes(table)) {
            data = data.map(item => ({
              ...item,
              profiles: mockDatabase.profiles.find(p => p.id === item.employee_id) || { full_name: 'Unknown', department: 'Engineering' }
            }))
          }
        }

        // Ordering
        if (orderSpec) {
          data.sort((a, b) => {
            const valA = a[orderSpec.field]
            const valB = b[orderSpec.field]
            if (valA < valB) return orderSpec.ascending ? -1 : 1
            if (valA > valB) return orderSpec.ascending ? 1 : -1
            return 0
          })
        }

        // Limit
        if (limitSpec !== null) {
          data = data.slice(0, limitSpec)
        }

        // Single row
        if (isSingle) {
          if (data.length === 0) {
            return { data: null, error: { message: 'Row not found' } }
          }
          return { data: data[0], error: null }
        }

        return { data, error }
      },
      then(onfulfilled, onrejected) {
        return Promise.resolve(builder.exec()).then(onfulfilled, onrejected)
      }
    }

    return builder
  }

  const mockAuth = {
    session: (() => {
      try {
        const stored = localStorage.getItem(STORAGE_SESSION_KEY)
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    })(),
    listeners: new Set(),
    async getSession() {
      return { data: { session: this.session }, error: null }
    },
    async getUser() {
      return { data: { user: this.session?.user || null }, error: null }
    },
    onAuthStateChange(callback) {
      this.listeners.add(callback)
      callback('INITIAL_SESSION', this.session)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners.delete(callback)
            }
          }
        }
      }
    },
    async signInWithPassword({ email, password }) {
      let targetEmail = email
      if (email && !email.includes('@')) {
        const matched = mockDatabase.profiles.find(p => p.employee_id?.toLowerCase() === email.toLowerCase())
        if (matched) {
          targetEmail = matched.email
        }
      }
      const matchedProfile = mockDatabase.profiles.find(p => p.email === targetEmail)
      const storedPassword = (mockDatabase.user_passwords && mockDatabase.user_passwords[matchedProfile?.id]) || 'EMS@2026'
      if (matchedProfile && password === storedPassword) {
        const user = { id: matchedProfile.id, email: targetEmail }
        this.session = { user, expires_at: 9999999999 }
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(this.session))
        this.listeners.forEach(cb => cb('SIGNED_IN', this.session))
        return { data: { user, session: this.session }, error: null }
      }
      return { data: null, error: { message: 'Invalid login credentials' } }
    },
    async updateUserPassword({ currentPassword, newPassword }) {
      const user = this.session?.user
      if (!user) return { error: { message: 'User not authenticated' } }

      if (!mockDatabase.user_passwords) mockDatabase.user_passwords = {}
      const currentStored = mockDatabase.user_passwords[user.id] || 'EMS@2026'

      if (currentPassword && currentPassword !== currentStored) {
        return { error: { message: 'Current password is incorrect.' } }
      }

      mockDatabase.user_passwords[user.id] = newPassword
      saveMockDatabase(mockDatabase)
      return { data: { user }, error: null }
    },
    async updateUser(attributes) {
      if (attributes.password) {
        return this.updateUserPassword({ newPassword: attributes.password })
      }
      return { data: { user: this.session?.user }, error: null }
    },
    async signOut() {
      this.session = null
      localStorage.removeItem(STORAGE_SESSION_KEY)
      this.listeners.forEach(cb => cb('SIGNED_OUT', null))
      return { error: null }
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null }
    }
  }

  supabaseClient = {
    auth: mockAuth,
    from(table) {
      return makeQueryBuilder(table)
    },
    /* eslint-disable-next-line no-unused-vars */
    channel(channelName) {
      const channelObj = {
        on(event, filter, callback) {
          const handler = (e) => {
            if (e.detail) callback(e.detail)
          }
          if (typeof window !== 'undefined') {
            window.addEventListener('ems_mock_realtime_event', handler)
          }
          channelObj._handler = handler
          return channelObj
        },
        subscribe(statusCallback) {
          if (statusCallback) statusCallback('SUBSCRIBED')
          return {
            unsubscribe: () => {
              if (channelObj._handler && typeof window !== 'undefined') {
                window.removeEventListener('ems_mock_realtime_event', channelObj._handler)
              }
            }
          }
        }
      }
      return channelObj
    },
    async rpc(funcName, args) {
      if (funcName === 'create_employee_account') {
        const newUserId = 'user-' + Math.random().toString(36).substr(2, 9)
        const newProfile = {
          id: newUserId,
          full_name: args.p_full_name,
          email: args.p_email,
          role: args.p_role,
          status: args.p_status || 'active',
          employee_id: args.p_employee_id,
          department: args.p_department,
          designation: args.p_designation,
          phone: args.p_phone,
          employment_type: args.p_employment_type,
          date_of_joining: args.p_date_of_joining,
          ctc: args.p_ctc || 0,
          reporting_manager_id: args.p_reporting_manager_id || null,
          reporting_manager_name: args.p_reporting_manager_name || null,
          reporting_manager_designation: args.p_reporting_manager_designation || null
        }
        mockDatabase.profiles.push(newProfile)

        if (args.p_ctc || args.p_basic) {
          const gross = Math.round((args.p_ctc || 0) / 12)
          const basic = args.p_basic !== undefined ? Number(args.p_basic) : Math.round(gross * 0.40)
          const hra = args.p_hra !== undefined ? Number(args.p_hra) : Math.round(basic * 0.50)
          const da = args.p_da !== undefined ? Number(args.p_da) : Math.round(basic * 0.10)
          const special_allowance = args.p_special_allowance !== undefined ? Number(args.p_special_allowance) : (gross - basic - hra - da)
          const pf = args.p_pf !== undefined ? Number(args.p_pf) : Math.round(basic * 0.12)
          const esi = args.p_esi !== undefined ? Number(args.p_esi) : (gross <= 21000 ? Math.round(gross * 0.0075) : 0)
          const pt = args.p_pt !== undefined ? Number(args.p_pt) : (gross > 10000 ? 200 : 0)
          const net = gross - pf - esi - pt

          mockDatabase.salary_structures.push({
            id: 'ss-' + Math.random().toString(36).substr(2, 9),
            employee_id: newUserId,
            ctc: args.p_ctc || 0,
            gross,
            basic,
            hra,
            da,
            special_allowance,
            pf,
            esi,
            pt,
            net_salary: net,
            created_at: new Date().toISOString()
          })
        }

        mockDatabase.leave_balances.push({
          id: 'lb-' + Math.random().toString(36).substr(2, 9),
          employee_id: newUserId,
          year: new Date().getFullYear(),
          casual: 12,
          sick: 12,
          earned: 18,
          wfh: 24,
          comp_off: 5
        })

        saveMockDatabase(mockDatabase)
        return { data: newUserId, error: null }
      }
      return { data: null, error: { message: `Mock function ${funcName} not implemented` } }
    },
    storage: {
      from: () => ({
        upload: async () => {
          return { data: { path: '' }, error: null }
        },
        getPublicUrl: (filePath) => {
          return { data: { publicUrl: `https://mock-supabase.careermap.in/storage/v1/object/public/employee-documents/${filePath}` } }
        },
        remove: async () => {
          return { data: null, error: null }
        }
      })
    },
    functions: {
      async invoke(funcName, options) {
        if (funcName === 'manage-user') {
          const { action, user_id, role, status } = options?.body || {}
          if (action === 'update_role') {
            const prof = mockDatabase.profiles.find(p => p.id === user_id)
            if (prof) {
              prof.role = role
              saveMockDatabase(mockDatabase)
            }
          } else if (action === 'toggle_status') {
            const prof = mockDatabase.profiles.find(p => p.id === user_id)
            if (prof) {
              prof.status = status
              saveMockDatabase(mockDatabase)
            }
          } else if (action === 'delete_user') {
            mockDatabase.profiles = mockDatabase.profiles.filter(p => p.id !== user_id)
            saveMockDatabase(mockDatabase)
          }
          return { data: { success: true }, error: null }
        }

        if (funcName === 'invite-user') {
          const { email, full_name, role } = options?.body || {}
          const newUserId = 'user-' + Math.random().toString(36).substr(2, 9)
          const newProfile = {
            id: newUserId,
            full_name,
            email,
            role,
            status: 'invited',
            created_at: new Date().toISOString()
          }
          mockDatabase.profiles.push(newProfile)
          saveMockDatabase(mockDatabase)
          return { data: { success: true }, error: null }
        }

        return { data: { success: true }, error: null }
      }
    }
  }
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  })
}

export const supabase = supabaseClient
