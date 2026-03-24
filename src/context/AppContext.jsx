import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export const AppProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen]         = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [filterStatus, setFilterStatus]       = useState('all')
  const [searchQuery, setSearchQuery]         = useState('')

  // Mock logged-in user — replace with real auth later
  const [user] = useState({
    name:   'Arjun Mehta',
    role:   'District Collector',
    zone:   'All Zones',
    avatar: 'AM',
  })

  return (
    <AppContext.Provider value={{
      sidebarOpen, setSidebarOpen,
      selectedComplaint, setSelectedComplaint,
      filterStatus, setFilterStatus,
      searchQuery, setSearchQuery,
      user,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
