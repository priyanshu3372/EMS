import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const MONTH_MAP = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
}

export function useReportsData(monthLabel) {
  const [monthName, yearStr] = monthLabel.split(' ')
  const year = parseInt(yearStr, 10) || new Date().getFullYear()
  const month = MONTH_MAP[monthName] || new Date().getMonth() + 1

  const lastDay = new Date(year, month, 0).getDate()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: ['reports_data', monthLabel],
    queryFn: async () => {
      const [
        { data: profiles, error: profErr },
        { data: attendance, error: attErr },
        { data: leaveRequests, error: lrErr },
        { data: leaveBalances, error: lbErr },
        { data: payslips, error: payErr },
        { data: payrollRuns, error: runErr },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('attendance').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('leave_requests').select('*').eq('status', 'approved'),
        supabase.from('leave_balances').select('*').eq('year', year),
        supabase.from('payslips').select('*'),
        supabase.from('payroll_runs').select('*'),
      ])

      if (profErr) throw profErr
      if (attErr) throw attErr
      if (lrErr) throw lrErr
      if (lbErr) throw lbErr
      if (payErr) throw payErr
      if (runErr) throw runErr

      // 1. Attendance Monthly Summary
      const attendanceSummary = (profiles || []).map(emp => {
        const empAtt = (attendance || []).filter(a => a.employee_id === emp.id)
        const present = empAtt.filter(a => a.status === 'present' || a.status === 'wfh' || a.status === 'present').length
        const absent = empAtt.filter(a => a.status === 'absent').length
        const late = empAtt.filter(a => a.status === 'late').length
        const wfh = empAtt.filter(a => a.status === 'wfh').length
        const total = empAtt.length
        const pct = total > 0 ? Math.round(((present + wfh) / total) * 100) : 100

        return {
          id: emp.employee_id || emp.id.slice(0, 8),
          name: emp.full_name,
          dept: emp.department || 'General',
          present,
          absent,
          late,
          wfh,
          total,
          pct
        }
      })

      // 2. Leave Summary
      const leaveSummary = (profiles || []).map(emp => {
        const empLeaves = (leaveRequests || []).filter(r => r.employee_id === emp.id)
        const casual = empLeaves.filter(r => r.leave_type === 'casual').reduce((sum, r) => sum + r.days, 0)
        const sick = empLeaves.filter(r => r.leave_type === 'sick').reduce((sum, r) => sum + r.days, 0)
        const earned = empLeaves.filter(r => r.leave_type === 'earned').reduce((sum, r) => sum + r.days, 0)
        const wfh = empLeaves.filter(r => r.leave_type === 'wfh').reduce((sum, r) => sum + r.days, 0)
        const total = casual + sick + earned + wfh

        return {
          id: emp.employee_id || emp.id.slice(0, 8),
          name: emp.full_name,
          dept: emp.department || 'General',
          casual,
          sick,
          earned,
          wfh,
          total
        }
      })

      // 3. Leave Balance
      const leaveBalancesReport = (profiles || []).map(emp => {
        const bal = (leaveBalances || []).find(b => b.employee_id === emp.id) || { casual: 12, sick: 12, earned: 18, wfh: 24 }
        return {
          id: emp.employee_id || emp.id.slice(0, 8),
          name: emp.full_name,
          dept: emp.department || 'General',
          casual_bal: bal.casual,
          sick_bal: bal.sick,
          earned_bal: bal.earned,
          wfh_bal: bal.wfh
        }
      })

      // 4. Payroll Monthly Summary
      const currentRun = (payrollRuns || []).find(r => r.month === month && r.year === year)
      const monthlyPayslips = currentRun 
        ? (payslips || []).filter(p => p.payroll_run_id === currentRun.id)
        : []

      const payrollSummary = (profiles || []).map(emp => {
        const slip = monthlyPayslips.find(p => p.employee_id === emp.id)
        return {
          id: emp.employee_id || emp.id.slice(0, 8),
          name: emp.full_name,
          dept: emp.department || 'General',
          gross: Number(slip?.gross || 0),
          pf: Number(slip?.pf || 0),
          esi: Number(slip?.esi || 0),
          pt: Number(slip?.pt || 0),
          net: Number(slip?.net || 0),
        }
      })

      // 5. Headcount
      const deptCounts = {}
      ;(profiles || []).filter(p => p.status === 'active').forEach(p => {
        const d = p.department || 'General'
        deptCounts[d] = (deptCounts[d] || 0) + 1
      })
      const colors = ['#2563EB', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#DB2777']
      const headcountByDept = Object.entries(deptCounts).map(([name, value], i) => ({
        name,
        value,
        color: colors[i % colors.length]
      }))

      // 6. Monthly Payroll Trend
      const trendData = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        const mVal = d.getMonth() + 1
        const yVal = d.getFullYear()
        const mLabel = d.toLocaleString('en-US', { month: 'short' })
        
        const run = (payrollRuns || []).find(r => r.month === mVal && r.year === yVal)
        const amount = run ? Number(run.total_net) / 100000 : 0
        trendData.push({
          month: mLabel,
          amount: Number(amount.toFixed(2))
        })
      }

      // 7. Joiners & Exits
      const selectedMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const selectedMonthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      const joinersList = (profiles || [])
        .filter(p => p.date_of_joining >= selectedMonthStart && p.date_of_joining <= selectedMonthEnd)
        .map(p => ({
          id: p.employee_id || p.id.slice(0, 8),
          name: p.full_name,
          dept: p.department || 'General',
          role: p.designation || 'Staff',
          date: new Date(p.date_of_joining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'joiner'
        }))

      const exitsList = (profiles || [])
        .filter(p => p.status === 'inactive')
        .map(p => ({
          id: p.employee_id || p.id.slice(0, 8),
          name: p.full_name,
          dept: p.department || 'General',
          role: p.designation || 'Staff',
          date: 'Deactivated',
          type: 'exit'
        }))

      return {
        attendanceSummary,
        leaveSummary,
        leaveBalancesReport,
        payrollSummary,
        headcountByDept,
        payrollTrend: trendData,
        joinersExits: [...joinersList, ...exitsList],
        totalEmployees: (profiles || []).filter(p => p.status === 'active').length,
      }
    }
  })
}
