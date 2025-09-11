import React from 'react'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
     <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: logos */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 flex items-center">
            
          </div>
          <div className="p-2 rounded-md shadow flex gap-2">
            <img src="/logo1.png" alt="logo1" className="h-10" />
            <img src="/logo2.png" alt="logo2" className="w-[100px]" />
          </div>
        </Link>

        {/* Right: user */}
        <div className="flex items-center gap-3">
             <div>
                   <Link to="/dashboard" className='text-sm'>Dashboard</Link>
                   <Link to="/rooms/new" className='ml-4 text-sm'>Add Room</Link>
                   <Link to="/bookings" className='ml-4 text-sm'>Bookings</Link>
                   <Link to="/users" className='ml-4 text-sm'>Users</Link>
                   <Link to="/logout" className='ml-4 text-sm'>Logout</Link>
                </div>
        </div>
      </div>
    </header>
    
  )
}

export default Header
