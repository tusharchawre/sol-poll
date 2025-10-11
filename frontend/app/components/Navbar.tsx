import React from 'react'
import { Button } from './ui/Button'

const Navbar = () => {
  return (
    <div className='mt-4'>
        <div className="flex items-center justify-between ">
            <h1 className="text-2xl font-bold">Poll App</h1>
            
            <Button className='bg-[#0A0A0A] text-white border border-[#262626] rounded-full p2'>Connect Wallet</Button>
        </div>
    </div>
  )
}

export default Navbar