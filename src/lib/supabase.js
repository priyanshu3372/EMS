import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key') {
  // Mock client implementation for demo/dev bypass
  const mockDatabase = {
    profiles: [
      { id: 'demo-super-admin-id', full_name: 'System Admin', email: 'admin@careermap.in', role: 'super_admin', status: 'active', employee_id: 'EMP001', department: 'Operations', designation: 'System Administrator', phone: '9876543210', employment_type: 'Full-time', date_of_joining: '2025-01-01', ctc: 1500000, bank_name: 'HDFC Bank', bank_account: '1234567890', ifsc: 'HDFC0000123', reporting_manager_id: null, reporting_manager_name: null, reporting_manager_designation: null },
      { id: 'demo-hr-admin-id', full_name: 'HR Manager', email: 'hr@careermap.in', role: 'hr', status: 'active', employee_id: 'EMP002', department: 'HR', designation: 'HR Lead', phone: '9876543211', employment_type: 'Full-time', date_of_joining: '2025-02-01', ctc: 1000000, bank_name: 'ICICI Bank', bank_account: '2345678901', ifsc: 'ICIC0000234', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-payroll-admin-id', full_name: 'Finance Head', email: 'payroll@careermap.in', role: 'accounts', status: 'active', employee_id: 'EMP003', department: 'Finance', designation: 'Payroll Specialist', phone: '9876543212', employment_type: 'Full-time', date_of_joining: '2025-03-01', ctc: 900000, bank_name: 'SBI', bank_account: '3456789012', ifsc: 'SBIN0000345', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-manager-id', full_name: 'Team Manager', email: 'manager@careermap.in', role: 'manager', status: 'active', employee_id: 'EMP004', department: 'Engineering', designation: 'Engineering Manager', phone: '9876543213', employment_type: 'Full-time', date_of_joining: '2025-04-01', ctc: 1800000, bank_name: 'Axis Bank', bank_account: '4567890123', ifsc: 'UTIB0000456', reporting_manager_id: 'demo-super-admin-id', reporting_manager_name: 'System Admin', reporting_manager_designation: 'System Administrator' },
      { id: 'demo-rm-id', full_name: 'Reporting Manager One', email: 'rm@careermap.in', role: 'rm', status: 'active', employee_id: 'EMP006', department: 'Engineering', designation: 'Technical Lead', phone: '9876543215', employment_type: 'Full-time', date_of_joining: '2025-04-01', ctc: 1400000, bank_name: 'HDFC Bank', bank_account: '6789012345', ifsc: 'HDFC0000123', reporting_manager_id: 'demo-manager-id', reporting_manager_name: 'Team Manager', reporting_manager_designation: 'Engineering Manager' },
      { id: 'demo-employee-id', full_name: 'John Doe', email: 'employee@careermap.in', role: 'employee', status: 'active', employee_id: 'EMP005', department: 'Engineering', designation: 'Software Engineer', phone: '9876543214', employment_type: 'Full-time', date_of_joining: '2025-05-01', ctc: 1200000, bank_name: 'HDFC Bank', bank_account: '5678901234', ifsc: 'HDFC0000123', reporting_manager_id: 'demo-rm-id', reporting_manager_name: 'Reporting Manager One', reporting_manager_designation: 'Technical Lead' },
    ],
    attendance: [
      { id: 'att-1', employee_id: 'demo-employee-id', date: new Date().toISOString().split('T')[0], status: 'present', check_in: '09:00', check_out: '18:00' },
      { id: 'att-2', employee_id: 'demo-manager-id', date: new Date().toISOString().split('T')[0], status: 'weekly_off', check_in: null, check_out: null }
    ],
    leave_requests: [
      { id: 'lr-1', employee_id: 'demo-employee-id', leave_type: 'sick', from_date: '2026-06-15', to_date: '2026-06-16', days: 2, reason: 'Fever', status: 'pending', applied_on: '2026-06-14', profiles: { full_name: 'John Doe', department: 'Engineering' } }
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
      { id: 'ps-1', employee_id: 'demo-employee-id', payroll_run_id: 'pr-1', gross: 100000, pf: 12000, esi: 0, pt: 200, tds: 5000, net: 82800 }
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
        file_size: 1258291, // 1.2 MB
        document_verification_status: 'verified',
        verified_by: 'demo-hr-admin-id',
        verified_at: '2026-06-13T10:00:00Z',
        verification_remarks: 'Verified successfully against original documents.',
        created_at: '2026-06-12T09:00:00Z'
      },
      {
        id: 'emp-doc-2',
        employee_id: 'demo-employee-id',
        doc_type: 'pan',
        file_name: 'pan_card.pdf',
        file_path: 'documents/pan_card.pdf',
        file_size: 524288, // 512 KB
        document_verification_status: 'pending',
        verified_by: null,
        verified_at: null,
        verification_remarks: null,
        created_at: '2026-06-13T14:30:00Z'
      }
    ],
    notifications: [
      { id: 'n-1', user_id: 'demo-employee-id', type: 'leave', message: 'Your leave request has been submitted.', read: false, created_at: new Date().toISOString() }
    ]
  }

  const makeQueryBuilder = (table) => {
    let data = [...(mockDatabase[table] || [])]
    let error = null

    const builder = {
      select(fields) {
        if (['leave_requests', 'attendance', 'leave_balances', 'payslips', 'employee_documents'].includes(table)) {
          data = data.map(item => ({
            ...item,
            profiles: mockDatabase.profiles.find(p => p.id === item.employee_id) || { full_name: 'Unknown', department: 'Engineering' }
          }))
        }
        return builder
      },
      eq(field, value) {
        data = data.filter(item => item[field] === value)
        return builder
      },
      gte(field, value) {
        data = data.filter(item => item[field] >= value)
        return builder
      },
      lte(field, value) {
        data = data.filter(item => item[field] <= value)
        return builder
      },
      order(field, { ascending = true } = {}) {
        data.sort((a, b) => {
          const valA = a[field]
          const valB = b[field]
          if (valA < valB) return ascending ? -1 : 1
          if (valA > valB) return ascending ? 1 : -1
          return 0
        })
        return builder
      },
      limit(n) {
        data = data.slice(0, n)
        return builder
      },
      async single() {
        if (data.length === 0) return { data: null, error: { message: 'Row not found' } }
        return { data: data[0], error: null }
      },
      async insert(records) {
        const arr = Array.isArray(records) ? records : [records]
        const inserted = arr.map(r => {
          const newItem = { id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...r }
          mockDatabase[table].push(newItem)
          return newItem
        })
        return { data: inserted.length === 1 && !Array.isArray(records) ? inserted[0] : inserted, error: null }
      },
      async update(updates) {
        data.forEach(item => {
          Object.assign(item, updates)
          const orig = mockDatabase[table].find(x => x.id === item.id)
          if (orig) Object.assign(orig, updates)
        })
        return { data, error: null }
      },
      async upsert(records, options = {}) {
        const arr = Array.isArray(records) ? records : [records]
        const upserted = arr.map(r => {
          const existingIndex = mockDatabase[table].findIndex(x => {
            if (table === 'attendance') {
              return x.employee_id === r.employee_id && x.date === r.date
            }
            if (table === 'employee_documents') {
              return x.employee_id === r.employee_id && x.doc_type === r.doc_type
            }
            return x.id === r.id
          })
          if (existingIndex > -1) {
            mockDatabase[table][existingIndex] = { ...mockDatabase[table][existingIndex], ...r }
            return mockDatabase[table][existingIndex]
          } else {
            const newItem = { id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...r }
            mockDatabase[table].push(newItem)
            return newItem
          }
        })
        return { data: upserted.length === 1 && !Array.isArray(records) ? upserted[0] : upserted, error: null }
      },
      async delete() {
        const idsToDelete = data.map(item => item.id)
        mockDatabase[table] = mockDatabase[table].filter(item => !idsToDelete.includes(item.id))
        return { data, error: null }
      },
      then(onfulfilled, onrejected) {
        return Promise.resolve({ data, error }).then(onfulfilled, onrejected)
      }
    }

    return builder
  }

  const mockAuth = {
    session: null,
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
      if (matchedProfile && password === 'admin') {
        const user = { id: matchedProfile.id, email: targetEmail }
        this.session = { user, expires_at: 9999999999 }
        this.listeners.forEach(cb => cb('SIGNED_IN', this.session))
        return { data: { user, session: this.session }, error: null }
      }
      return { data: null, error: { message: 'Invalid credentials. Hint: use password "admin"' } }
    },
    async signOut() {
      this.session = null
      this.listeners.forEach(cb => cb('SIGNED_OUT', null))
      return { error: null }
    }
  }

  supabaseClient = {
    auth: mockAuth,
    from(table) {
      return makeQueryBuilder(table)
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

        return { data: newUserId, error: null }
      }
      return { data: null, error: { message: `Mock function ${funcName} not implemented` } }
    },
    storage: {
      from: (bucket) => ({
        upload: async (path, file) => {
          return { data: { path }, error: null }
        },
        getPublicUrl: (path) => {
          return { data: { publicUrl: '#' } }
        },
        remove: async (paths) => {
          return { data: null, error: null }
        }
      })
    },
    functions: {
      async invoke(funcName, options) {
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

