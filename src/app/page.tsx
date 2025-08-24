import { Button } from '@/components/ui/button'
import React from 'react'

const MainPage = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-green-300'>
      <div
        className="backdrop-blur-md bg-white/30 rounded-xl shadow-xl p-8 flex flex-col items-center"
      >
        <Button>Click Me</Button>
      </div>
    </div >
  )
}

export default MainPage
